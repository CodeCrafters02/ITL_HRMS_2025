from celery import shared_task
from django.utils import timezone
from datetime import timedelta, datetime
import pytz

from app.models import Attendance
from notifications.models import UserNotification


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _send_missing_checkout_fcm_and_inapp(employee, attendance, title, message):
    from notifications.service import send_fcm_to_users
    UserNotification.objects.create(
        recipient=employee,
        title=title,
        message=message,
        related_object_id=attendance.id,
    )
    try:
        send_fcm_to_users(
            user_ids=[employee.user_id],
            notif_type='attendance',
            message=message,
            sender=None,
            title=title,
            related_object_id=attendance.id,
            create_user_notifications=False,
        )
    except Exception:
        pass


def _send_missing_checkout_email(employee, title, message):
    from django.core.mail import send_mail
    from django.conf import settings
    if not employee.email:
        return
    try:
        send_mail(
            subject=title,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.email],
            fail_silently=True,
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Task 1: Same-day alert — 2 hours after shift checkout
# ---------------------------------------------------------------------------

@shared_task
def send_missing_checkout_alerts():
    """
    Runs every 30 minutes. For each employee whose shift checkout time was
    2+ hours ago and who still hasn't checked out, sends FCM push + email.
    Idempotent: skips employees already flagged MISSING_CHECKOUT_ALERTED.
    """
    tz = pytz.timezone('Asia/Kolkata')
    now = timezone.now()
    today = timezone.localdate()

    atts = Attendance.objects.filter(
        date=today,
        check_in__isnull=False,
        check_out__isnull=True,
    ).select_related('employee', 'employee__shift_assigned', 'employee__user')

    alerted = 0
    for a in atts:
        remarks = a.remarks or ''
        if 'MISSING_CHECKOUT_ALERTED' in remarks:
            continue

        shift = a.employee.shift_assigned
        if not shift:
            continue

        # Build shift checkout datetime; handle overnight shifts
        checkout_dt = tz.localize(datetime.combine(today, shift.checkout))
        if shift.checkin > shift.checkout:
            checkout_dt += timedelta(days=1)

        if now < checkout_dt + timedelta(hours=2):
            continue

        # Mark idempotent flags before sending (avoids duplicates on retry)
        new_flags = 'MISSING_CHECKOUT | MISSING_CHECKOUT_ALERTED'
        a.remarks = f"{remarks} | {new_flags}".lstrip(' | ') if remarks else new_flags
        a.save(update_fields=['remarks'])

        emp = a.employee
        checkin_local = timezone.localtime(a.check_in, tz).strftime('%H:%M')
        title = "Checkout Reminder"
        message = (
            f"Hi {emp.first_name}, you checked in today at {checkin_local} "
            "but haven't checked out yet. Please check out before midnight or "
            "your attendance will be marked as missing checkout."
        )
        _send_missing_checkout_fcm_and_inapp(emp, a, title, message)
        _send_missing_checkout_email(emp, title, message)
        alerted += 1

    return {'alerted': alerted}


# ---------------------------------------------------------------------------
# Task 2: Morning alert — triggered on next-day check-in
# ---------------------------------------------------------------------------

@shared_task
def send_late_checkout_morning_alert(employee_id, attendance_id):
    """
    Fired from CheckInAPIView when yesterday's attendance has MISSING_CHECKOUT.
    Sends FCM push + in-app + email telling the employee to contact their manager.
    """
    from app.models import Employee
    try:
        emp = Employee.objects.get(id=employee_id)
        a = Attendance.objects.get(id=attendance_id)
    except Exception:
        return

    title = "Missing Checkout — Action Required"
    message = (
        f"Hi {emp.first_name}, yesterday ({a.date.strftime('%d %b %Y')}) you forgot "
        "to check out. Your attendance has been marked as late checkout. "
        "Please contact your manager to confirm and maintain correct attendance records."
    )
    _send_missing_checkout_fcm_and_inapp(emp, a, title, message)
    _send_missing_checkout_email(emp, title, message)


# ---------------------------------------------------------------------------
# Task 3: Daily morning sweep (existing, extended with FCM + email)
# ---------------------------------------------------------------------------

@shared_task
def flag_missing_checkouts():
    """
    Runs daily at 06:00 IST. Finds attendances from yesterday with check_in
    but no check_out, marks MISSING_CHECKOUT in remarks, and sends in-app
    notification + FCM push + email to each affected employee.
    """
    yesterday = timezone.localdate() - timedelta(days=1)
    atts = Attendance.objects.filter(
        date=yesterday,
        check_in__isnull=False,
        check_out__isnull=True,
    ).select_related('employee', 'employee__user')

    count = 0
    for a in atts:
        note = 'MISSING_CHECKOUT'
        if not a.remarks:
            a.remarks = note
        elif note not in (a.remarks or ''):
            a.remarks = f"{a.remarks} | {note}"
        a.save(update_fields=['remarks'])

        emp = a.employee
        try:
            check_in_local = timezone.localtime(a.check_in).strftime('%H:%M:%S')
        except Exception:
            check_in_local = 'Unknown'

        title = "Missing Checkout Detected"
        message = (
            f"Hi {emp.first_name}, you checked in on {a.date} at {check_in_local} "
            "but did not check out. Your attendance has been marked as late checkout. "
            "Please contact your manager to confirm and maintain correct attendance records."
        )

        _send_missing_checkout_fcm_and_inapp(emp, a, title, message)
        _send_missing_checkout_email(emp, title, message)
        count += 1

    return {'flagged': count}
