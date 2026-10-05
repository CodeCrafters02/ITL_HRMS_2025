import base64
import hashlib
import logging

import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.cache import cache
from django.db import DatabaseError, transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MicrosoftOAuthToken

GRAPH = "https://graph.microsoft.com/v1.0"
logger = logging.getLogger(__name__)
MAIL_SCOPES ="offline_access User.Read Mail.ReadWrite"
MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024
MS_PHOTO_PREFIX = "ms_profile_"
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"ms-oauth:{settings.SECRET_KEY}".encode()).digest()))


class OutlookReauthRequired(Exception):
    pass


def save_ms_refresh_token(user_id, refresh_token, *, public_client=False, scope=""):
    if not (user_id and refresh_token):
        return
    try:
        with transaction.atomic():
            MicrosoftOAuthToken.objects.update_or_create(
                user_id=user_id,
                defaults={
                    "refresh_token_enc": _fernet.encrypt(refresh_token.encode()).decode(),
                    "is_public_client": public_client,
                    "scopes": scope or "",
                },
            )
    except DatabaseError:
        logger.exception("Could not store Microsoft refresh token for user %s; Outlook mail disabled", user_id)
        return
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


def sync_ms_profile_photo(user_id, access_token=None):
    """Set the employee's profile photo to their current Microsoft 365 photo on every SSO sign-in.

    The Microsoft photo replaces whatever is set. When the account has no photo in Microsoft 365
    (or it cannot be read) the existing one is kept. Never raises: sign-in must not fail because
    of a picture.
    """
    from django.core.files.base import ContentFile
    from .models import Employee, UserRegister

    try:
        emp = Employee.objects.filter(user_id=user_id).only("id", "photo").first() if user_id else None
        if not emp:
            return False
        if not access_token:
            access_token = _graph_token(UserRegister.objects.get(pk=user_id))
        resp = requests.get(f"{GRAPH}/me/photo/$value", headers={"Authorization": f"Bearer {access_token}"}, timeout=6)
        content_type = resp.headers.get("Content-Type", "")
        # 404 = the account has no photo in Microsoft 365
        if resp.status_code != 200 or not content_type.startswith("image/") or not 0 < len(resp.content) <= MAX_PROFILE_PHOTO_BYTES:
            return False

        field = Employee._meta.get_field("photo")
        old_name = emp.photo.name if emp.photo else ""
        # Unchanged since the last sign-in: keep the stored file instead of writing a copy
        if old_name and field.storage.exists(old_name) and field.storage.size(old_name) == len(resp.content):
            with field.storage.open(old_name, "rb") as current:
                if current.read() == resp.content:
                    return False

        ext = {"image/png": "png", "image/gif": "gif"}.get(content_type.split(";")[0].strip(), "jpg")
        name = field.storage.save(field.generate_filename(emp, f"{MS_PHOTO_PREFIX}{user_id}.{ext}"), ContentFile(resp.content))
        Employee.objects.filter(pk=emp.pk).update(photo=name)
        # Earlier synced copies are ours to clean up; a photo the user uploaded is left on disk
        if old_name and old_name != name and old_name.rsplit("/", 1)[-1].startswith(MS_PHOTO_PREFIX):
            field.storage.delete(old_name)
        return True
    except Exception:
        logger.warning("Could not sync Microsoft profile photo for user %s", user_id, exc_info=True)
        return False


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
