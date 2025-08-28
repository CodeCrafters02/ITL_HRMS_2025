from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from app.models import Notification, CalendarEvent, LearningCorner
from notifications.models import UserNotification
from datetime import datetime
import json
import time
from django.http import StreamingHttpResponse
from django.views import View




class NotificationSSEView(View):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        def event_stream(user):
            if not hasattr(user, 'is_authenticated') or not user.is_authenticated:
                yield f"data: {json.dumps({'error': 'Not authenticated'})}\n\n"
                return
            if not hasattr(user, 'employee_profile') or not user.employee_profile:
                yield f"data: {json.dumps({'error': 'No employee profile'})}\n\n"
                return
            last_id = int(request.GET.get('last_id', 0))
            while True:
                new_notifications = UserNotification.objects.filter(
                    recipient=user.employee_profile, id__gt=last_id, read=False
                ).order_by('id')
                sent = False
                for notif in new_notifications:
                    data = {
                        "id": notif.id,
                        "title": notif.title,
                        "message": notif.message,
                        "type": notif.title.lower(),  # or add a type field to your model
                        "created_at": notif.created_at.isoformat(),
                        "related_object_id": notif.related_object_id,
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    last_id = notif.id
                    sent = True
                if not sent:
                    time.sleep(2)  # Only sleep if nothing was sent

        return StreamingHttpResponse(event_stream(request.user), content_type='text/event-stream')


class AllNotificationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        notifications = []

        # UserNotification (admin, task, leave, etc.)
        if hasattr(user, 'employee_profile') and user.employee_profile:
            for n in UserNotification.objects.filter(recipient=user.employee_profile):
                notifications.append({
                    "id": n.id,
                    "title": n.title,
                    "description": getattr(n, 'message', n.title),
                    "date": n.created_at.isoformat() if n.created_at else str(n.created_at),
                    "type": "notification"
                })

        # Admin Notification (company-wide)
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            for n in Notification.objects.filter(company_id=user.employee_profile.company_id):
                notifications.append({
                    "id": n.id + 1000000,  # offset to avoid id clash
                    "title": n.title or "Admin Notification",
                    "description": n.description or n.title or "",
                    "date": n.date.isoformat() if hasattr(n, 'date') and n.date else str(n.created_at),
                    "type": "admin"
                })

        # Calendar Events (company-wide)
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            for e in CalendarEvent.objects.filter(company_id=user.employee_profile.company_id):
                notifications.append({
                    "id": e.id + 2000000,
                    "title": e.name or "Calendar Event",
                    "description": getattr(e, 'description', "Calendar Event"),
                    "date": e.date.isoformat() if hasattr(e, 'date') and isinstance(e.date, datetime) else str(e.date),
                    "type": "calendar"
                })

        # Learning Corner (company-wide)
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            for l in LearningCorner.objects.filter(company_id=user.employee_profile.company_id):
                # LearningCorner has no created_at, so use id as fallback for date sorting, or None
                notifications.append({
                    "id": l.id + 3000000,
                    "title": l.title or "Learning Corner",
                    "description": getattr(l, 'description', "Learning Corner"),
                    "date": None,  # No date field available in model
                    "type": "learning_corner"
                })

        # Sort by date descending, handling None values by using a fallback
        def sort_key(x):
            # If date is None, use a very old date so it appears last
            d = x["date"]
            if d is None:
                return "0000-01-01T00:00:00"
            return d
        notifications.sort(key=sort_key, reverse=True)
        return Response(notifications)
