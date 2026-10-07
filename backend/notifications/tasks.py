from collections import defaultdict
from datetime import datetime, timedelta, timezone as dt_timezone

from celery import shared_task
from django.utils import timezone

from .teams import claim, send_teams_notification


def _admin_ids(company_id):
    from app.models import UserRegister
    return list(UserRegister.objects.filter(company_id=company_id, role='admin').values_list('id', flat=True))


@shared_task
def teams_birthday_digest():
    from app.models import Employee
    today = timezone.localdate()
    emps = Employee.objects.filter(
        is_active=True, date_of_birth__month=today.month, date_of_birth__day=today.day, user__isnull=False
    ).select_related('user')
    by_company = defaultdict(list)
    for e in emps:
        by_company[e.company_id].append(e)
        send_teams_notification([e.user_id], "🎂 Happy Birthday!", f"Wishing you a wonderful birthday, {e.full_name}!")
    for cid, items in by_company.items():
        names = ", ".join(e.full_name for e in items)
        ids = list(Employee.objects.filter(company_id=cid, is_active=True, user__isnull=False).exclude(
            id__in=[e.id for e in items]).values_list('user_id', flat=True))
        send_teams_notification(ids, "🎂 Birthday today", f"Today's birthday: {names}")


@shared_task
def teams_pending_approvals_digest():
    from app.models import EmpLeave, WFHRequest, ReimbursementRequest
    sources = (
        ("leave", EmpLeave.objects.filter(status='Pending')),
        ("WFH", WFHRequest.objects.filter(status='pending')),
        ("reimbursement", ReimbursementRequest.objects.filter(status='pending')),
    )
    per_mgr = defaultdict(lambda: defaultdict(int))
    for label, qs in sources:
        for mgr_user_id in qs.exclude(reporting_manager__user__isnull=True).values_list('reporting_manager__user_id', flat=True):
            per_mgr[mgr_user_id][label] += 1
    for uid, counts in per_mgr.items():
        parts = ", ".join(f"{n} {k}" for k, n in counts.items())
        send_teams_notification([uid], "⏳ Pending approvals", f"You have pending requests: {parts}", "leave")


@shared_task
def teams_missing_checkout_admin_digest():
    from app.models import Attendance
    yesterday = timezone.localdate() - timedelta(days=1)
    rows = Attendance.objects.filter(date=yesterday, check_in__isnull=False, check_out__isnull=True)
    per_company = defaultdict(int)
    for cid in rows.values_list('company_id', flat=True):
        per_company[cid] += 1
    for cid, n in per_company.items():
        send_teams_notification(
            _admin_ids(cid), "⏰ Missing check-outs",
            f"{n} employee(s) did not check out on {yesterday:%d %b}.", "attendance",
        )


@shared_task
def teams_outlook_poll():
    """Every few minutes: Teams alerts for new unread Outlook mail and meetings starting within 15 min (per connected user)."""
    from django.conf import settings
    from django.core.cache import caches
    from app.models import MicrosoftOAuthToken
    from app.outlook import _graph_get, OutlookReauthRequired

    if not getattr(settings, "TEAMS_NOTIFY_ENABLED", False):
        return
    cache = caches['teams_state']
    now = timezone.now()
    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")
    for user in (t.user for t in MicrosoftOAuthToken.objects.select_related('user')):
        try:
            since_key = f"teams_mail_since:{user.id}"
            since = cache.get(since_key)
            cache.set(since_key, iso(now), None)
            if since:
                msgs = _graph_get(user, "/me/mailFolders/inbox/messages", {
                    "$filter": f"receivedDateTime ge {since}", "$top": 10,
                    "$select": "subject,from,isRead,receivedDateTime",
                }).get("value", [])
                unread = [m for m in msgs if not m.get("isRead")]
                if len(unread) == 1:
                    m = unread[0]
                    sender = ((m.get("from") or {}).get("emailAddress") or {}).get("name") or "Unknown sender"
                    send_teams_notification([user.id], f"📧 New email from {sender}", m.get("subject") or "(No subject)")
                elif unread:
                    send_teams_notification([user.id], f"📧 {len(unread)} new emails", "Check your Outlook inbox")

            events = _graph_get(user, "/me/calendarView", {
                "startDateTime": iso(now), "endDateTime": iso(now + timedelta(minutes=15)),
                "$select": "id,subject,start,isCancelled,isAllDay", "$top": 25,
            }).get("value", [])
            for ev in events:
                if ev.get("isCancelled") or ev.get("isAllDay"):
                    continue
                raw = ((ev.get("start") or {}).get("dateTime") or "")[:19]
                try:
                    starts = datetime.strptime(raw, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=dt_timezone.utc)
                except ValueError:
                    continue
                if not (now - timedelta(minutes=1) <= starts <= now + timedelta(minutes=15)):
                    continue
                if not claim(f"teams_evt:{user.id}:{ev.get('subject')}:{raw}", 86400):
                    continue
                send_teams_notification([user.id], f"📅 Starting soon: {ev.get('subject') or 'Meeting'}", "Starts within 15 minutes")
        except OutlookReauthRequired:
            continue
        except Exception:
            import logging
            logging.getLogger(__name__).exception("teams_outlook_poll failed for user %s", user.id)
