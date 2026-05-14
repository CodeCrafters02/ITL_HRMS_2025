from django.conf import settings
from django.utils import timezone
from datetime import time as _time
from app.models import UserRegister, Attendance
import json
import requests
import logging
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from .models import UserNotification, UserDevice

logger = logging.getLogger(__name__)

# Helper to get absolute logo URL

# Helper to get absolute logo URL, using request if available
def get_absolute_logo_url(logo_field, request=None):
    if not logo_field:
        return ""
    url = logo_field.url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    base = getattr(settings, "SITE_URL", None)
    if not base:
        return url  # fallback to relative if SITE_URL not set
    return f"{base.rstrip('/')}/{url.lstrip('/')}"




def remove_unregistered_token(token):
    """
    Remove a device token from UserDevice if it is unregistered (invalid for FCM).
    """
    UserDevice.objects.filter(token=token).delete()


def _stringify_payload_data(data):
    """FCM data payload values must be strings."""
    if not data:
        return {}
    out = {}
    for key, value in data.items():
        if value is None:
            continue
        out[str(key)] = str(value)
    return out


def send_fcm_push(token, title, body, data=None, image_url=None):
    """
    Send a push notification to a single device using FCM HTTP v1 API and service account JSON.
    Returns (status_code, response_text) or (None, error_message) on failure.
    """
    try:
        # Check if FCM is configured
        if not hasattr(settings, 'FCM_CREDENTIALS_FILE') or not settings.FCM_CREDENTIALS_FILE:
            return None, "FCM credentials not configured"
        
        if not hasattr(settings, 'FCM_PROJECT_ID') or not settings.FCM_PROJECT_ID:
            return None, "FCM project ID not configured"
        
        scopes = ["https://www.googleapis.com/auth/firebase.messaging"]
        credentials = service_account.Credentials.from_service_account_file(
            settings.FCM_CREDENTIALS_FILE, scopes=scopes
        )
        
        # Try to refresh credentials with error handling
        try:
            credentials.refresh(Request())
            access_token = credentials.token
        except Exception as refresh_error:
            # Log the error but don't break the workflow
            logger.error(f"FCM credential refresh failed: {refresh_error}")
            return None, f"FCM credential refresh failed: {str(refresh_error)}"

        project_id = settings.FCM_PROJECT_ID
        url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; UTF-8",
        }
        payload_data = _stringify_payload_data(data)

        # Build notification payload
        notification_payload = {
            "title": title,
            "body": body,
        }
        if image_url:
            notification_payload["image"] = image_url

        # Send both notification + data payload for reliable system-tray behavior.
        message = {
            "message": {
                "token": token,
                "notification": notification_payload,
                "data": {
                    "title": title,
                    "body": body,
                    **({"image_url": image_url} if image_url else {}),
                    **payload_data,
                },
                "android": {
                    "priority": "HIGH",
                    "notification": {
                        "channel_id": "hrms_notifications",
                        "sound": "default",
                        **({"image": image_url} if image_url else {}),
                    },
                },
                "apns": {
                    "headers": {
                        "apns-priority": "10",
                    },
                    "payload": {
                        "aps": {
                            "sound": "default",
                            "mutable-content": 1,
                        }
                    },
                    **({"fcm_options": {"image": image_url}} if image_url else {}),
                },
            }
        }
        response = requests.post(
            url,
            headers=headers,
            data=json.dumps(message),
            timeout=15,
        )
        # If token is unregistered, remove it from DB
        if 'UNREGISTERED' in response.text:
            remove_unregistered_token(token)

        if response.status_code >= 400:
            logger.error(
                "FCM send failed (status=%s, token=%s...): %s",
                response.status_code,
                token[:12],
                response.text,
            )

        return response.status_code, response.text
    except Exception as e:
        # Log but do not break the workflow
        logger.error(f"FCM push failed: {e}")
        return None, str(e)



# def send_fcm_push(token, title, body, data=None):
#     try:
#         scopes = ["https://www.googleapis.com/auth/firebase.messaging"]
#         credentials = service_account.Credentials.from_service_account_file(
#             settings.FCM_CREDENTIALS_FILE, scopes=scopes
#         )
#         credentials.refresh(Request())
#         access_token = credentials.token

#         project_id = settings.FCM_PROJECT_ID
#         url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
#         headers = {
#             "Authorization": f"Bearer {access_token}",
#             "Content-Type": "application/json; UTF-8",
#         }
#         message = {
#             "message": {
#                 "token": token,
#                 "data": {
#                     "title": title,
#                     "body": body,
#                     **(data or {})
#                 },
#             }
#         }
#         response = requests.post(url, headers=headers, data=json.dumps(message))
#         if response.status_code == 404 and 'UNREGISTERED' in response.text:
#             remove_unregistered_token(token)
#         return response.status_code, response.text
#     except Exception as e:
#         # Log but do not break the workflow
#         print("FCM push failed:", e)
#         return None, str(e)



def send_fcm_to_users(
    user_ids,
    notif_type,
    message,
    sender,
    title="",
    related_object_id=None,
    extra_data=None,
    create_user_notifications=True,
    image_url=None,
):
    """
    Create UserNotification, then send FCM push to all user devices.
    sender: required, must be a User instance (AUTH_USER_MODEL)
    """
    
    from app.models import Employee
    employee_ids = list(Employee.objects.filter(user_id__in=user_ids).values_list('id', flat=True))

    # Keep DB notification persistence tied to Employee profiles,
    # but never block push delivery when a user profile exists without Employee row.
    if create_user_notifications and employee_ids:
        for eid in employee_ids:
            UserNotification.objects.create(
                recipient_id=eid,
                sender=sender,
                title=title or notif_type.capitalize(),
                message=message,
                related_object_id=related_object_id
            )
    # Prepare mappings from user_id to company logo and name (or empty string)
    employees = Employee.objects.filter(user_id__in=user_ids).select_related('company')
    # Try to get request from extra_data if passed (for absolute URL)
    request = extra_data.get('request') if extra_data and 'request' in extra_data else None
    emp_logo_map = {e.user_id: (get_absolute_logo_url(e.company.logo, request) if e.company and e.company.logo else "") for e in employees}
    emp_name_map = {e.user_id: (e.company.name if e.company and e.company.name else "") for e in employees}
    tokens = list(UserDevice.objects.filter(user_id__in=user_ids).values_list("user_id", "token"))
    if not tokens:
        logger.warning("No registered device tokens for users: %s", user_ids)
        return
    # FCM requires all data values to be strings
    clean_extra_data = {}
    if extra_data:
        clean_extra_data = {k: v for k, v in extra_data.items() if k != 'request'}
    base_extra_data = _stringify_payload_data(clean_extra_data)
    for user_id, tk in tokens:
        this_extra_data = dict(base_extra_data)
        this_extra_data['company_logo'] = emp_logo_map.get(user_id, "")
        this_extra_data['company_name'] = emp_name_map.get(user_id, "")
        try:
            send_fcm_push(tk, title or notif_type.capitalize(), message, this_extra_data, image_url=image_url)
        except Exception as e:
            # Log but don't break the workflow
            logger.error(f"Failed to send FCM push to user {user_id}: {e}")
            continue
  
        
def send_push_notification_to_all(title, message):
    user_ids = list(UserRegister.objects.values_list('id', flat=True))
    send_fcm_to_users(user_ids, "general", message, sender=None, title=title)  # sender can be None for general announcements


# ─────────────────────────────────────────────────────────────────────────────
# Checkout reminder service
# ─────────────────────────────────────────────────────────────────────────────

CHECKOUT_REMINDER_TITLE = "⏰ Checkout Reminder"

# Fallback shift-end hour (6:00 PM) used when an employee has no shift assigned
_DEFAULT_SHIFT_END_HOUR = 18


def send_checkout_reminders(today=None, now_local=None, dry_run=False):
    """
    Find employees who checked in today but have not yet checked out, and whose
    shift end time has already passed.  For each such employee, create a
    UserNotification record and send an FCM push — unless a checkout-reminder
    notification was already sent to them today (deduplication).

    Returns a dict with keys: notified (int), skipped (int), errors (int).

    This function is called by both the management command
    (send_checkout_reminders) and the admin API endpoint
    (TriggerCheckoutReminderView).
    """
    if now_local is None:
        now_local = timezone.localtime(timezone.now())
    if today is None:
        today = now_local.date()

    current_time = now_local.time()

    # Default fallback shift-end time object
    default_shift_end = _time(_DEFAULT_SHIFT_END_HOUR, 0)

    # All attendance records for today where check-in exists but check-out is missing
    pending_qs = (
        Attendance.objects.filter(
            date=today,
            check_in__isnull=False,
            check_out__isnull=True,
        )
        .select_related("employee__shift_assigned", "employee__user")
    )

    # Pre-fetch IDs of employees already notified today — 1 query instead of N
    already_notified_ids = set(
        UserNotification.objects.filter(
            title=CHECKOUT_REMINDER_TITLE,
            created_at__date=today,
        ).values_list("recipient_id", flat=True)
    )

    default_sender = UserRegister.objects.filter(role="admin").first()
    if default_sender is None:
        logger.warning("send_checkout_reminders: no admin user found; notifications will have no sender.")

    notified = 0
    skipped = 0
    errors = 0

    for attendance in pending_qs:
        employee = attendance.employee

        # ── Determine the shift's checkout time ──────────────────────────────
        shift = getattr(employee, "shift_assigned", None)
        shift_end = shift.checkout if (shift and shift.checkout) else default_shift_end

        # ── Only notify if the shift end time has already passed ─────────────
        if current_time < shift_end:
            skipped += 1
            continue

        # ── Deduplication check (uses pre-fetched set) ───────────────────────
        if employee.pk in already_notified_ids:
            skipped += 1
            continue

        # ── Build notification content ────────────────────────────────────────
        employee_name = employee.full_name or "Employee"
        shift_end_str = shift_end.strftime("%I:%M %p")
        message = (
            f"Hi {employee_name}, your shift ended at {shift_end_str} but you haven't "
            f"checked out yet. Please check out to keep your attendance record accurate."
        )

        if dry_run:
            logger.info("[DRY RUN] Checkout reminder would be sent (attendance_id=%s)", attendance.pk)
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
                    title=CHECKOUT_REMINDER_TITLE,
                    extra_data={"attendance_id": str(attendance.pk)},
                    create_user_notifications=True,
                )
            else:
                # No linked user account — create in-app notification only
                UserNotification.objects.create(
                    recipient=employee,
                    sender=default_sender,
                    title=CHECKOUT_REMINDER_TITLE,
                    message=message,
                )
            # Track in local set to prevent double-sending within same run
            already_notified_ids.add(employee.pk)
            notified += 1
            logger.info("Checkout reminder sent (attendance_id=%s)", attendance.pk)
        except Exception as exc:
            errors += 1
            logger.error("Failed to send checkout reminder (attendance_id=%s): %s", attendance.pk, exc)

    return {"notified": notified, "skipped": skipped, "errors": errors}