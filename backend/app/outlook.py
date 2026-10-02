import base64
import hashlib

import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MicrosoftOAuthToken

GRAPH = "https://graph.microsoft.com/v1.0"
MAIL_SCOPES = "offline_access User.Read Mail.Read"
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"ms-oauth:{settings.SECRET_KEY}".encode()).digest()))


class OutlookReauthRequired(Exception):
    pass


def save_ms_refresh_token(user_id, refresh_token, *, public_client=False, scope=""):
    if not (user_id and refresh_token):
        return
    MicrosoftOAuthToken.objects.update_or_create(
        user_id=user_id,
        defaults={
            "refresh_token_enc": _fernet.encrypt(refresh_token.encode()).decode(),
            "is_public_client": public_client,
            "scopes": scope or "",
        },
    )
    cache.delete(f"ms_graph_at:{user_id}")


def _graph_token(user):
    key = f"ms_graph_at:{user.id}"
    if at := cache.get(key):
        return at
    rec = MicrosoftOAuthToken.objects.filter(user=user).first()
    if not rec:
        raise OutlookReauthRequired("not_connected")
    try:
        rt = _fernet.decrypt(rec.refresh_token_enc.encode()).decode()
    except InvalidToken:
        rec.delete()
        raise OutlookReauthRequired("token_unreadable")

    tenant = getattr(settings, "MICROSOFT_TENANT_ID", "") or "organizations"
    data = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "grant_type": "refresh_token",
        "refresh_token": rt,
        "scope": MAIL_SCOPES,
    }
    if not rec.is_public_client:
        data["client_secret"] = settings.MICROSOFT_CLIENT_SECRET
    resp = requests.post(f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", data=data, timeout=15)
    body = resp.json() if resp.content else {}
    if resp.status_code != 200 or "access_token" not in body:
        if body.get("error") in ("invalid_grant", "interaction_required", "consent_required"):
            rec.delete()
            raise OutlookReauthRequired(body.get("error"))
        raise requests.RequestException(body.get("error_description") or "Token refresh failed")

    if body.get("refresh_token"):
        save_ms_refresh_token(user.id, body["refresh_token"], public_client=rec.is_public_client, scope=body.get("scope", ""))
    cache.set(key, body["access_token"], max(int(body.get("expires_in", 3600)) - 120, 60))
    return body["access_token"]


def _graph_get(user, path, params=None):
    resp = requests.get(f"{GRAPH}{path}", params=params,
                        headers={"Authorization": f"Bearer {_graph_token(user)}"}, timeout=15)
    if resp.status_code == 401:
        cache.delete(f"ms_graph_at:{user.id}")
        raise OutlookReauthRequired("unauthorized")
    if resp.status_code == 403:
        raise OutlookReauthRequired("consent_required")
    resp.raise_for_status()
    return resp.json()


def _fmt(m):
    sender = (m.get("from") or {}).get("emailAddress") or {}
    return {
        "id": m.get("id"),
        "subject": m.get("subject") or "(No subject)",
        "from_name": sender.get("name") or sender.get("address") or "",
        "from_email": sender.get("address") or "",
        "received_at": m.get("receivedDateTime"),
        "is_read": m.get("isRead", True),
        "preview": (m.get("bodyPreview") or "")[:200],
        "web_link": m.get("webLink"),
        "has_attachments": m.get("hasAttachments", False),
        "importance": m.get("importance"),
    }


class OutlookMailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        top = min(max(int(request.query_params.get("top", 10) or 10), 1), 50)
        params = {
            "$top": top,
            "$orderby": "receivedDateTime desc",
            "$select": "id,subject,from,receivedDateTime,isRead,bodyPreview,webLink,hasAttachments,importance",
        }
        if request.query_params.get("unread") in ("1", "true"):
            params["$filter"] = "isRead eq false"
        try:
            inbox = _graph_get(request.user, "/me/mailFolders/inbox", {"$select": "unreadItemCount,totalItemCount"})
            msgs = _graph_get(request.user, "/me/mailFolders/inbox/messages", params).get("value", [])
        except OutlookReauthRequired as e:
            return Response({"connected": False, "reason": str(e), "messages": [], "unread_count": 0})
        except requests.RequestException as e:
            return Response({"detail": f"Could not reach Outlook: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({
            "connected": True,
            "unread_count": inbox.get("unreadItemCount", 0),
            "total_count": inbox.get("totalItemCount", 0),
            "messages": [_fmt(m) for m in msgs],
            "inbox_url": "https://outlook.office.com/mail/inbox",
        })

    def delete(self, request):
        MicrosoftOAuthToken.objects.filter(user=request.user).delete()
        cache.delete(f"ms_graph_at:{request.user.id}")
        return Response(status=status.HTTP_204_NO_CONTENT)
