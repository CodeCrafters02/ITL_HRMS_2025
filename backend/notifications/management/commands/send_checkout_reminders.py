"""
Management command: send_checkout_reminders

Sends a push notification + in-app notification to every employee who has
checked in today but has NOT yet checked out, provided their shift's
checkout time has already passed.

Run via cron (example — fires at 19:00 every weekday):
    0 19 * * 1-6 /path/to/venv/bin/python /path/to/manage.py send_checkout_reminders

Or trigger manually from the admin API endpoint:
    POST /notifications/trigger-checkout-reminder/
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from app.models import Attendance, Employee
from notifications.models import UserNotification
from notifications.service import send_fcm_to_users

logger = logging.getLogger(__name__)

# Default shift-end time used when an employee has no shift assigned.
# This acts as a fallback so no-one slips through completely unnoticed.
DEFAULT_SHIFT_END_HOUR = 18  # 6:00 PM


class Command(BaseCommand):
    help = (
        "Send checkout-reminder notifications to all employees who checked in "
        "today but have not yet checked out after their shift end time."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print which employees would be notified without actually sending.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        now_local = timezone.localtime(timezone.now())
        today = now_local.date()

        self.stdout.write(
            self.style.NOTICE(
                f"[send_checkout_reminders] Running at {now_local.strftime('%Y-%m-%d %H:%M:%S %Z')}"
            )
        )

        results = send_checkout_reminders(today=today, now_local=now_local, dry_run=dry_run)

        notified = results["notified"]
        skipped = results["skipped"]
        errors = results["errors"]

        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN] No notifications were actually sent."))

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — notified: {notified}, skipped (shift not ended / already notified): {skipped}, errors: {errors}"
            )
        )


# ─────────────────────────────────────────────────────────────────────────────
# Core logic extracted into a reusable function so the API view can call it
# ─────────────────────────────────────────────────────────────────────────────

def send_checkout_reminders(today=None, now_local=None, dry_run=False):
    """
    Find employees who checked in today but have not checked out, and whose
    shift end time has already passed.  For each such employee, create a
    UserNotification record and send an FCM push — unless a checkout-reminder
    notification was already sent to them today (deduplication).

    Returns a dict with keys: notified (int), skipped (int), errors (int).
    """
    if now_local is None:
        now_local = timezone.localtime(timezone.now())
    if today is None:
        today = now_local.date()

    current_time = now_local.time()

    # All attendance records for today where check-in exists but check-out is missing
    pending_qs = (
        Attendance.objects.filter(
            date=today,
            check_in__isnull=False,
            check_out__isnull=True,
        )
        .select_related("employee__shift_assigned", "employee__user")
    )

    notified = 0
    skipped = 0
    errors = 0

    # Use the first admin user as the notification sender (or None)
    from app.models import UserRegister
    default_sender = UserRegister.objects.filter(role="admin").first()

    for attendance in pending_qs:
        employee = attendance.employee

        # ── Determine the shift's checkout time ──────────────────────────────
        shift = getattr(employee, "shift_assigned", None)
        if shift and shift.checkout:
            shift_end = shift.checkout  # datetime.time object
        else:
            # No shift assigned — use the global fallback
            shift_end = datetime.strptime(
                f"{DEFAULT_SHIFT_END_HOUR:02d}:00:00", "%H:%M:%S"
            ).time()

        # ── Only notify if the shift end time has already passed ─────────────
        if current_time < shift_end:
            skipped += 1
            continue

        # ── Deduplication: skip if we already notified this employee today ───
        CHECKOUT_REMINDER_TITLE = "⏰ Checkout Reminder"
        already_notified = UserNotification.objects.filter(
            recipient=employee,
            title=CHECKOUT_REMINDER_TITLE,
            created_at__date=today,
        ).exists()

        if already_notified:
            skipped += 1
            continue

        # ── Build notification content ────────────────────────────────────────
        employee_name = employee.full_name or "Employee"
        shift_end_str = shift_end.strftime("%I:%M %p")
        title = CHECKOUT_REMINDER_TITLE
        message = (
            f"Hi {employee_name}, your shift ended at {shift_end_str} but you haven't "
            f"checked out yet. Please check out to keep your attendance record accurate."
        )

        if dry_run:
            logger.info("[DRY RUN] Would notify employee %s", employee_name)
            notified += 1
            continue

        # ── Persist in-app notification and send FCM push ────────────────────
        try:
            if employee.user:
                send_fcm_to_users(
                    user_ids=[employee.user.id],
                    notif_type="checkout_reminder",
                    message=message,
                    sender=default_sender,
                    title=title,
                    extra_data={"attendance_id": str(attendance.id)},
                    create_user_notifications=True,
                )
            else:
                # No linked user account — create in-app notification only
                UserNotification.objects.create(
                    recipient=employee,
                    sender=default_sender,
                    title=title,
                    message=message,
                )
            notified += 1
            logger.info("Checkout reminder sent to employee %s", employee_name)
        except Exception as exc:
            errors += 1
            logger.error(
                "Failed to send checkout reminder to employee %s: %s",
                employee_name,
                exc,
            )

    return {"notified": notified, "skipped": skipped, "errors": errors}
