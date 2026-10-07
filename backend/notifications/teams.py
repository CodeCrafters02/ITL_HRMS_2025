import hashlib
import logging
import os
import threading
import time
from urllib.parse import quote

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GRAPH = "https://graph.microsoft.com/v1.0"
TEAMS_APP_ID = "61aef780-972b-4305-8189-74716898dc93"
ACTIVITY_TYPE = "hrmsAlert"
ENTITY_BY_TYPE = {"payroll": "hrms-payslips", "attendance": "hrms-attendance", "leave": "hrms-leave"}

TYPE_ICONS = {
    "leave": "📝", "task": "📋", "wfh": "🏠", "reimbursement": "💸", "loan": "💰", "asset": "🖥️",
    "booking": "🪑", "event": "📅", "learning": "📚", "chat": "💬", "payroll": "💵",
    "attendance": "⏰", "admin_notification": "📢",
}
STATUS_ICONS = (("approved", "✅"), ("rejected", "❌"), ("cancelled", "🚫"), ("published", "✅"))

_token = {"value": None, "exp": 0}
_lock = threading.Lock()


def _app_token():
    with _lock:
        if _token["value"] and _token["exp"] > time.time() + 60:
            return _token["value"]
        r = requests.post(
            f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
            data={
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
            timeout=10,
        )
        r.raise_for_status()
        d = r.json()
        _token.update(value=d["access_token"], exp=time.time() + int(d.get("expires_in", 3000)))
        return _token["value"]


def claim(key, ttl):
    """Atomic cross-process "first caller wins" (O_EXCL lock file); False if already claimed within ttl seconds."""
    d = os.path.join(str(settings.BASE_DIR), ".teams_state_cache", "claims")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, hashlib.sha1(key.encode()).hexdigest())
    for _ in range(2):
        try:
            os.close(os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
            return True
        except FileExistsError:
            try:
                if time.time() - os.path.getmtime(path) < ttl:
                    return False
                os.remove(path)
            except OSError:
                return False
    return False


def decorate_title(title, notif_type):
    """Prefix a title with a status or type icon unless it already starts with an emoji."""
    title = (title or "HRMS").strip()
    if ord(title[0]) > 0x2000:
        return title
    low = title.lower()
    icon = next((i for k, i in STATUS_ICONS if k in low), TYPE_ICONS.get(notif_type, "🔔"))
    return f"{icon} {title}"


def _send_one(email, title, message, entity_id):
    body = {
        "topic": {
            "source": "text",
            "value": "HRMS",
            "webUrl": f"https://teams.microsoft.com/l/entity/{TEAMS_APP_ID}/{entity_id}",
        },
        "activityType": ACTIVITY_TYPE,
        "previewText": {"content": (message or title)[:150]},
        "templateParameters": [{"name": "title", "value": title[:120]}],
    }
    url = f"{GRAPH}/users/{quote(email)}/teamwork/sendActivityNotification"
    for _ in range(2):
        r = requests.post(url, json=body, headers={"Authorization": f"Bearer {_app_token()}"}, timeout=10)
        if r.status_code == 429:
            time.sleep(min(int(r.headers.get("Retry-After", 2)), 10))
            continue
        if r.status_code not in (200, 204, 404):
            logger.warning("Teams notify %s -> %s %s", email, r.status_code, r.text[:200])
        return


def _run(emails, title, message, entity_id):
    for email in emails:
        try:
            _send_one(email, title, message, entity_id)
        except Exception as e:
            logger.warning("Teams notify failed for %s: %s", email, e)


def send_teams_notification(user_ids, title, message="", notif_type="general"):
    """Generic Teams activity-feed notification. Never raises; runs in a background thread."""
    try:
        if not (getattr(settings, "TEAMS_NOTIFY_ENABLED", False) and settings.MICROSOFT_CLIENT_ID and user_ids):
            return
        from app.models import UserRegister
        emails = [e for e in UserRegister.objects.filter(id__in=user_ids).values_list("email", flat=True) if e]
        if emails:
            threading.Thread(
                target=_run,
                args=(emails, decorate_title(title, notif_type), message, ENTITY_BY_TYPE.get(notif_type, "hrms-home")),
                daemon=True,
            ).start()
    except Exception as e:
        logger.warning("Teams notify skipped: %s", e)
