from django.conf import settings
from app.models import UserRegister
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


def send_fcm_push(token, title, body, data=None):
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

        # Send both notification + data payload for reliable system-tray behavior.
        message = {
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": body,
                },
                "data": {
                    "title": title,
                    "body": body,
                    **payload_data,
                },
                "android": {
                    "priority": "HIGH",
                    "notification": {
                        "channel_id": "hrms_notifications",
                        "sound": "default",
                    },
                },
                "apns": {
                    "headers": {
                        "apns-priority": "10",
                    },
                    "payload": {
                        "aps": {
                            "sound": "default",
                        }
                    },
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
):
    """
    Create UserNotification, then send FCM push to all user devices.
    sender: required, must be a User instance (AUTH_USER_MODEL)
    """
    
    from app.models import Employee
    employee_ids = list(Employee.objects.filter(user_id__in=user_ids).values_list('id', flat=True))
    if not employee_ids:
        
        return
    if create_user_notifications:
        for eid in employee_ids:
            UserNotification.objects.create(
                recipient_id=eid,
                sender=sender,
                title=title or notif_type.capitalize(),
                message=message,
                related_object_id=related_object_id
            )
    from app.models import Employee
    # Prepare mappings from user_id to company logo and name (or empty string)
    employees = Employee.objects.filter(user_id__in=user_ids).select_related('company')
    # Try to get request from extra_data if passed (for absolute URL)
    request = extra_data.get('request') if extra_data and 'request' in extra_data else None
    emp_logo_map = {e.user_id: (get_absolute_logo_url(e.company.logo, request) if e.company and e.company.logo else "") for e in employees}
    emp_name_map = {e.user_id: (e.company.name if e.company and e.company.name else "") for e in employees}
    tokens = list(UserDevice.objects.filter(user_id__in=user_ids).values_list("user_id", "token"))
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
            send_fcm_push(tk, title or notif_type.capitalize(), message, this_extra_data)
        except Exception as e:
            # Log but don't break the workflow
            logger.error(f"Failed to send FCM push to user {user_id}: {e}")
            continue
  
        
def send_push_notification_to_all(title, message):
    user_ids = list(UserRegister.objects.values_list('id', flat=True))
    send_fcm_to_users(user_ids, "general", message, sender=None, title=title)  # sender can be None for general announcements