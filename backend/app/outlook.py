import base64
import hashlib
import logging
import re
from urllib.parse import quote, urlparse

import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.cache import cache
from django.db import DatabaseError, transaction
from django.http import HttpResponse
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


CAL_SCOPES = "offline_access User.Read Calendars.ReadWrite"


def _graph_token(user, calendar=False):
    key = f"ms_graph_cal:{user.id}" if calendar else f"ms_graph_at:{user.id}"
    if at := cache.get(key):
        return at
    try:
        rec = MicrosoftOAuthToken.objects.filter(user=user).first()
    except DatabaseError:
        # Token table missing (migrations not applied on this server): report "not connected" instead of a 500
        logger.exception("Microsoft token table is not available; run makemigrations/migrate")
        raise OutlookReauthRequired("server_not_migrated")
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
        # Ask for "send" only when the user granted it at sign-in; requesting an ungranted scope fails the refresh
        "scope": CAL_SCOPES if calendar else (f"{MAIL_SCOPES} Mail.Send" if "mail.send" in (rec.scopes or "").lower() else MAIL_SCOPES),
    }
    if not rec.is_public_client:
        data["client_secret"] = settings.MICROSOFT_CLIENT_SECRET
    resp = requests.post(f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", data=data, timeout=15)
    body = resp.json() if resp.content else {}
    if resp.status_code != 200 or "access_token" not in body:
        if body.get("error") in ("invalid_grant", "interaction_required", "consent_required"):
            if not calendar:
                rec.delete()
            raise OutlookReauthRequired(body.get("error"))
        raise requests.RequestException(body.get("error_description") or "Token refresh failed")

    if body.get("refresh_token"):
        save_ms_refresh_token(user.id, body["refresh_token"], public_client=rec.is_public_client, scope=rec.scopes if calendar else body.get("scope", ""))
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
# ---------------------------------------------------------------------------
# Full mailbox: folders, message list, reading, actions, compose / reply / forward
# ---------------------------------------------------------------------------

WELL_KNOWN_FOLDERS = [
    ("inbox", "Inbox"),
    ("drafts", "Drafts"),
    ("sentitems", "Sent Items"),
    ("archive", "Archive"),
    ("junkemail", "Junk Email"),
    ("deleteditems", "Deleted Items"),
]
LIST_SELECT = "id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,webLink,hasAttachments,importance,flag,isDraft"
MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024
MAX_INLINE_IMAGE_BYTES = 1024 * 1024
_ID_RE = re.compile(r"^[A-Za-z0-9_\-=]{1,512}$")
_EMAIL_RE = re.compile(r"^[^@\s<>,;]+@[^@\s<>,;]+\.[^@\s<>,;]+$")


class OutlookSendPermissionRequired(Exception):
    pass


def _graph(user, method, path, *, params=None, json=None, headers=None, calendar=False):
    """Raw Graph call for the signed-in user. `path` may be a full Graph URL (paging links)."""
    url = path if path.startswith("https://") else f"{GRAPH}{path}"
    resp = requests.request(method, url, params=params, json=json, timeout=20,
                            headers={"Authorization": f"Bearer {_graph_token(user, calendar)}", **(headers or {})})
    if resp.status_code == 401:
        cache.delete(f"ms_graph_cal:{user.id}" if calendar else f"ms_graph_at:{user.id}")
        raise OutlookReauthRequired("unauthorized")
    return resp


def _graph_json(user, method, path, **kwargs):
    resp = _graph(user, method, path, **kwargs)
    if resp.status_code == 403:
        raise OutlookReauthRequired("consent_required")
    resp.raise_for_status()
    return resp.json() if resp.content else {}


def _people(recipients):
    out = []
    for r in recipients or []:
        addr = (r or {}).get("emailAddress") or {}
        if addr.get("address") or addr.get("name"):
            out.append({"name": addr.get("name") or addr.get("address") or "", "email": addr.get("address") or ""})
    return out


def _fmt_list(m):
    item = _fmt(m)
    item["to"] = _people(m.get("toRecipients"))
    item["flagged"] = ((m.get("flag") or {}).get("flagStatus") == "flagged")
    item["is_draft"] = m.get("isDraft", False)
    return item


def _parse_recipients(value, label):
    if isinstance(value, (list, tuple)):
        value = ",".join(str(v) for v in value)
    emails = [e.strip() for e in re.split(r"[,;\s]+", value or "") if e.strip()]
    bad = [e for e in emails if not _EMAIL_RE.match(e)]
    if bad:
        raise ValueError(f"{label}: '{bad[0]}' is not a valid email address.")
    if len(emails) > 100:
        raise ValueError(f"{label}: too many recipients (maximum 100).")
    return [{"emailAddress": {"address": e}} for e in dict.fromkeys(emails)]


def _valid_id(value):
    return bool(value) and bool(_ID_RE.match(value))


def _mail_errors(fn):
    """Turns Graph/token failures into clean API responses instead of 500s."""
    def wrapper(self, request, *args, **kwargs):
        try:
            return fn(self, request, *args, **kwargs)
        except OutlookReauthRequired as e:
            return Response({"connected": False, "reason": str(e), "detail": "Sign in again with Microsoft to use Outlook here."},
                            status=status.HTTP_409_CONFLICT)
        except OutlookSendPermissionRequired:
            return Response({"reason": "send_permission_required",
                             "detail": "Sending mail has not been allowed yet. Sign out and sign in again with Microsoft, then accept the permission to send mail."},
                            status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except requests.HTTPError as e:
            code = e.response.status_code if e.response is not None else 502
            try:
                message = (e.response.json().get("error") or {}).get("message") or ""
            except Exception:
                message = ""
            if code == 404:
                return Response({"detail": "This item no longer exists in Outlook."}, status=status.HTTP_404_NOT_FOUND)
            return Response({"detail": message or "Outlook rejected the request."},
                            status=status.HTTP_400_BAD_REQUEST if 400 <= code < 500 else status.HTTP_502_BAD_GATEWAY)
        except requests.RequestException as e:
            return Response({"detail": f"Could not reach Outlook: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
    wrapper.__name__ = fn.__name__
    return wrapper


class OutlookFoldersAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @_mail_errors
    def get(self, request):
        select = "id,displayName,unreadItemCount,totalItemCount"
        batch = _graph_json(request.user, "POST", "/$batch", json={"requests": [
            {"id": key, "method": "GET", "url": f"/me/mailFolders/{key}?$select={select}"} for key, _ in WELL_KNOWN_FOLDERS
        ]})
        found = {r.get("id"): r.get("body") or {} for r in batch.get("responses", []) if r.get("status") == 200}
        folders, known_ids = [], set()
        for key, label in WELL_KNOWN_FOLDERS:
            body = found.get(key)
            if not body:
                continue
            known_ids.add(body.get("id"))
            folders.append({"id": key, "name": label, "unread": body.get("unreadItemCount", 0), "total": body.get("totalItemCount", 0), "system": True})
        others = _graph_json(request.user, "GET", "/me/mailFolders", params={"$top": 100, "$select": select}).get("value", [])
        for f in others:
            # Skip the well-known folders and Outlook's internal ones
            if f.get("id") in known_ids or f.get("displayName") in ("Outbox", "Conversation History", "Sync Issues"):
                continue
            folders.append({"id": f.get("id"), "name": f.get("displayName") or "Folder", "unread": f.get("unreadItemCount", 0), "total": f.get("totalItemCount", 0), "system": False})
        return Response({"connected": True, "folders": folders})


class OutlookMessagesAPIView(APIView):
    """One page of messages. Paging, search and the unread filter are all done by Microsoft Graph."""
    permission_classes = [IsAuthenticated]

    @_mail_errors
    def get(self, request):
        qp = request.query_params
        cursor = qp.get("cursor")
        if cursor:
            # Opaque "next page" link handed out by a previous response
            # Graph writes these links as .../me/mailFolders('inbox')/messages?..., so check host and path rather than a fixed prefix
            link = urlparse(cursor)
            if link.scheme != "https" or link.netloc != "graph.microsoft.com" or not link.path.startswith("/v1.0/me/mailFolders"):
                raise ValueError("Invalid page cursor.")
            data = _graph_json(request.user, "GET", cursor)
        else:
            folder = qp.get("folder") or "inbox"
            if not _valid_id(folder):
                raise ValueError("Invalid folder.")
            try:
                top = min(max(int(qp.get("top") or 25), 1), 50)
            except ValueError:
                top = 25
            params = {"$top": top, "$select": LIST_SELECT}
            search = (qp.get("search") or "").strip().replace('"', " ")
            if search:
                # Graph does not allow $orderby/$filter together with $search; results come back by relevance/date
                params["$search"] = f'"{search[:200]}"'
            else:
                params["$orderby"] = "receivedDateTime desc"
                if qp.get("unread") in ("1", "true"):
                    # Graph requires the sorted field to lead the filter when both are used
                    params["$filter"] = "receivedDateTime ge 1900-01-01T00:00:00Z and isRead eq false"
            data = _graph_json(request.user, "GET", f"/me/mailFolders/{folder}/messages", params=params)
        return Response({
            "connected": True,
            "messages": [_fmt_list(m) for m in data.get("value", [])],
            "next_cursor": data.get("@odata.nextLink") or None,
        })


class OutlookMessageDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @_mail_errors
    def get(self, request, message_id):
        if not _valid_id(message_id):
            raise ValueError("Invalid message.")
        user = request.user
        m = _graph_json(user, "GET", f"/me/messages/{message_id}", params={
            "$select": "id,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,receivedDateTime,sentDateTime,isRead,body,webLink,hasAttachments,importance,flag,isDraft",
        }, headers={"Prefer": 'outlook.body-content-type="html"'})
        body = (m.get("body") or {}).get("content") or ""
        attachments = []
        if m.get("hasAttachments") or "cid:" in body:
            listed = _graph_json(user, "GET", f"/me/messages/{message_id}/attachments",
                                 params={"$select": "id,name,size,contentType,isInline"}).get("value", [])
            inline_budget = 10
            for a in listed:
                is_file = a.get("@odata.type", "").endswith("fileAttachment")
                if a.get("isInline") and is_file and "cid:" in body and inline_budget > 0 and (a.get("size") or 0) <= MAX_INLINE_IMAGE_BYTES:
                    # Embedded picture: put it straight into the HTML so it shows in the reading pane
                    inline_budget -= 1
                    full = _graph_json(user, "GET", f"/me/messages/{message_id}/attachments/{a['id']}")
                    cid, data = full.get("contentId"), full.get("contentBytes")
                    if cid and data and f"cid:{cid}" in body:
                        body = body.replace(f"cid:{cid}", f"data:{full.get('contentType') or 'image/png'};base64,{data}")
                        continue
                if is_file:
                    attachments.append({"id": a.get("id"), "name": a.get("name") or "attachment", "size": a.get("size") or 0, "content_type": a.get("contentType") or ""})
        if not m.get("isRead", True) and not m.get("isDraft"):
            try:
                _graph(user, "PATCH", f"/me/messages/{message_id}", json={"isRead": True})
                m["isRead"] = True
            except requests.RequestException:
                pass
        item = _fmt_list(m)
        item.update({
            "cc": _people(m.get("ccRecipients")),
            "bcc": _people(m.get("bccRecipients")),
            "sent_at": m.get("sentDateTime"),
            "body_html": body,
            "attachments": attachments,
        })
        return Response(item)

    @_mail_errors
    def patch(self, request, message_id):
        if not _valid_id(message_id):
            raise ValueError("Invalid message.")
        changes = {}
        if "is_read" in request.data:
            changes["isRead"] = bool(request.data.get("is_read"))
        if "flagged" in request.data:
            changes["flag"] = {"flagStatus": "flagged" if request.data.get("flagged") else "notFlagged"}
        if changes:
            _graph_json(request.user, "PATCH", f"/me/messages/{message_id}", json=changes)
        folder = request.data.get("move_to")
        if folder:
            if not _valid_id(folder):
                raise ValueError("Invalid folder.")
            moved = _graph_json(request.user, "POST", f"/me/messages/{message_id}/move", json={"destinationId": folder})
            return Response({"id": moved.get("id"), "moved": True})
        return Response({"id": message_id})

    @_mail_errors
    def delete(self, request, message_id):
        if not _valid_id(message_id):
            raise ValueError("Invalid message.")
        if request.query_params.get("permanent") in ("1", "true"):
            resp = _graph(request.user, "DELETE", f"/me/messages/{message_id}")
            if resp.status_code == 403:
                raise OutlookReauthRequired("consent_required")
            resp.raise_for_status()
        else:
            _graph_json(request.user, "POST", f"/me/messages/{message_id}/move", json={"destinationId": "deleteditems"})
        return Response(status=status.HTTP_204_NO_CONTENT)


class OutlookAttachmentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @_mail_errors
    def get(self, request, message_id, attachment_id):
        if not (_valid_id(message_id) and _valid_id(attachment_id)):
            raise ValueError("Invalid attachment.")
        a = _graph_json(request.user, "GET", f"/me/messages/{message_id}/attachments/{attachment_id}")
        if not a.get("contentBytes"):
            raise ValueError("This attachment cannot be downloaded here. Open the message in Outlook instead.")
        response = HttpResponse(base64.b64decode(a["contentBytes"]), content_type=a.get("contentType") or "application/octet-stream")
        name = (a.get("name") or "attachment").replace('"', "").replace("\r", "").replace("\n", "")
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(name)}"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class OutlookSendAPIView(APIView):
    """Compose, reply, reply-all or forward. Builds a draft in the user's mailbox, then sends it."""
    permission_classes = [IsAuthenticated]
    DRAFT_ACTIONS = {"reply": "createReply", "reply_all": "createReplyAll", "forward": "createForward"}

    @_mail_errors
    def post(self, request):
        user, data = request.user, request.data
        mode = data.get("mode") or "new"
        if mode not in ("new", *self.DRAFT_ACTIONS):
            raise ValueError("Invalid mode.")
        to = _parse_recipients(data.get("to"), "To")
        cc = _parse_recipients(data.get("cc"), "Cc")
        bcc = _parse_recipients(data.get("bcc"), "Bcc")
        subject = (data.get("subject") or "").strip()[:255]
        body_html = data.get("body_html") or ""
        files = request.FILES.getlist("attachments")
        for f in files:
            if f.size > MAX_ATTACHMENT_BYTES:
                raise ValueError(f"'{f.name}' is larger than {MAX_ATTACHMENT_BYTES // (1024 * 1024)} MB and cannot be attached here.")
        if len(files) > 10:
            raise ValueError("A message can have at most 10 attachments here.")
        if mode in ("new", "forward") and not (to or cc or bcc):
            raise ValueError("Add at least one recipient.")

        if mode == "new":
            draft = _graph_json(user, "POST", "/me/messages", json={
                "subject": subject, "body": {"contentType": "HTML", "content": body_html},
                "toRecipients": to, "ccRecipients": cc, "bccRecipients": bcc,
            })
        else:
            source_id = data.get("message_id") or ""
            if not _valid_id(source_id):
                raise ValueError("Invalid message.")
            draft = _graph_json(user, "POST", f"/me/messages/{source_id}/{self.DRAFT_ACTIONS[mode]}", json={})
            quoted = (draft.get("body") or {}).get("content") or ""
            # Put the new text above the quoted original that Outlook prepared
            merged, count = re.subn(r"(<body[^>]*>)", lambda mt: mt.group(1) + f"<div>{body_html}</div><br>", quoted, count=1, flags=re.I)
            changes = {"body": {"contentType": "HTML", "content": merged if count else f"<div>{body_html}</div><br>{quoted}"}}
            if to or mode == "forward":
                changes["toRecipients"] = to
            if cc:
                changes["ccRecipients"] = cc
            if bcc:
                changes["bccRecipients"] = bcc
            if subject:
                changes["subject"] = subject
            _graph_json(user, "PATCH", f"/me/messages/{draft['id']}", json=changes)

        draft_id = draft["id"]
        try:
            for f in files:
                _graph_json(user, "POST", f"/me/messages/{draft_id}/attachments", json={
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": f.name,
                    "contentType": f.content_type or "application/octet-stream",
                    "contentBytes": base64.b64encode(f.read()).decode(),
                })
            sent = _graph(user, "POST", f"/me/messages/{draft_id}/send")
            if sent.status_code == 403:
                # Mailbox access is granted but not "send": the draft stays in Drafts so nothing is lost
                raise OutlookSendPermissionRequired()
            sent.raise_for_status()
        except OutlookSendPermissionRequired:
            raise
        except Exception:
            try:
                _graph(user, "DELETE", f"/me/messages/{draft_id}")
            except Exception:
                pass
            raise
        return Response({"sent": True}, status=status.HTTP_200_OK)


class OutlookRecipientsAPIView(APIView):
    """Address suggestions for the compose window: colleagues in the user's company, matched on name or email."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        from .models import UserRegister

        q = (request.query_params.get("q") or "").strip()[:100]
        company_id = getattr(request.user, "company_id", None)
        if not q or not company_id:
            return Response({"results": []})
        match = Q(email__icontains=q) | Q(username__icontains=q)
        # "first last" typed together should match too
        for word in q.split()[:3]:
            match |= (Q(first_name__icontains=word) | Q(last_name__icontains=word)
                      | Q(employee__first_name__icontains=word) | Q(employee__last_name__icontains=word))
        users = (UserRegister.objects.filter(match, company_id=company_id, is_active=True, email__contains="@")
                 .exclude(pk=request.user.pk).order_by("first_name", "last_name", "email")
                 .values("first_name", "last_name", "employee__first_name", "employee__last_name", "email")[:8])

        def display(u):
            # Names are often filled in on the employee profile only
            return (f"{u['first_name'] or ''} {u['last_name'] or ''}".strip()
                    or f"{u['employee__first_name'] or ''} {u['employee__last_name'] or ''}".strip())

        return Response({"results": [{"name": display(u), "email": u["email"]} for u in users]})


UTC_PREFER = {"Prefer": 'outlook.timezone="UTC"'}


def _fmt_event(e):
    all_day = bool(e.get("isAllDay"))
    start, end = (e.get("start") or {}).get("dateTime", ""), (e.get("end") or {}).get("dateTime", "")
    return {
        "id": e.get("id"),
        "title": e.get("subject") or "(No title)",
        "description": e.get("bodyPreview") or "",
        "start": start[:10] if all_day else (start[:19] + "Z" if start else None),
        "end": end[:10] if all_day else (end[:19] + "Z" if end else None),
        "all_day": all_day,
        "web_link": e.get("webLink"),
        "online_meeting_url": (e.get("onlineMeeting") or {}).get("joinUrl"),
        "location": (e.get("location") or {}).get("displayName") or "",
    }


def _event_body(d, partial=False):
    body = {}
    if "title" in d or not partial:
        body["subject"] = (d.get("title") or "").strip() or "(No title)"
    if "description" in d or not partial:
        body["body"] = {"contentType": "text", "content": d.get("description") or ""}
    if "start" in d:
        all_day = bool(d.get("all_day"))
        cut = 10 if all_day else 19
        fmt = (lambda v: f"{str(v)[:10]}T00:00:00") if all_day else (lambda v: str(v).rstrip("Z")[:cut])
        body["isAllDay"] = all_day
        body["start"] = {"dateTime": fmt(d["start"]), "timeZone": "UTC"}
        body["end"] = {"dateTime": fmt(d["end"]), "timeZone": "UTC"}
    if d.get("guests"):
        body["attendees"] = [{**a, "type": "required"} for a in _parse_recipients(d["guests"], "Guests")]
    if d.get("online_meeting"):
        body["isOnlineMeeting"] = True
        body["onlineMeetingProvider"] = "teamsForBusiness"
    return body


class OutlookCalendarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @_mail_errors
    def get(self, request):
        start, end = request.query_params.get("start"), request.query_params.get("end")
        if not (start and end):
            raise ValueError("start and end are required.")
        try:
            data = _graph_json(request.user, "GET", "/me/calendarView", calendar=True, headers=UTC_PREFER,
                               params={"startDateTime": start, "endDateTime": end, "$top": 500,
                                       "$orderby": "start/dateTime",
                                       "$select": "id,subject,bodyPreview,start,end,isAllDay,webLink,onlineMeeting,location"})
        except OutlookReauthRequired as e:
            return Response({"connected": False, "reason": str(e), "events": []})
        return Response({"connected": True, "events": [_fmt_event(e) for e in data.get("value", [])]})

    @_mail_errors
    def post(self, request):
        d = request.data
        if not (d.get("start") and d.get("end")):
            raise ValueError("start and end are required.")
        ev = _graph_json(request.user, "POST", "/me/events", json=_event_body(d), calendar=True, headers=UTC_PREFER)
        return Response(_fmt_event(ev), status=status.HTTP_201_CREATED)


class OutlookCalendarEventAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @_mail_errors
    def patch(self, request, event_id):
        if not _valid_id(event_id):
            raise ValueError("Invalid event id.")
        ev = _graph_json(request.user, "PATCH", f"/me/events/{quote(event_id, safe='')}",
                         json=_event_body(request.data, partial=True), calendar=True, headers=UTC_PREFER)
        return Response(_fmt_event(ev))

    @_mail_errors
    def delete(self, request, event_id):
        if not _valid_id(event_id):
            raise ValueError("Invalid event id.")
        resp = _graph(request.user, "DELETE", f"/me/events/{quote(event_id, safe='')}", calendar=True)
        if resp.status_code == 403:
            raise OutlookReauthRequired("consent_required")
        if resp.status_code != 404:
            resp.raise_for_status()
        return Response(status=status.HTTP_204_NO_CONTENT)
