from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from app.models import Notification, CalendarEvent, LearningCorner,Employee
from notifications.models import UserNotification
from django.utils import timezone
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
        seen_ids = set()  # Track unique IDs to prevent duplicates

        # UserNotification (admin, task, leave, etc.) - Exclude learning corner notifications to avoid duplicates
        if hasattr(user, 'employee_profile') and user.employee_profile:
            user_notifications = UserNotification.objects.filter(
                recipient=user.employee_profile
            ).exclude(
                title__icontains='learning'  # Exclude learning corner notifications from user notifications
            ).distinct()
            
            for n in user_notifications:
                unique_id = f"user_notif_{n.id}"
                if unique_id not in seen_ids:
                    seen_ids.add(unique_id)
                    notifications.append({
                        "id": f"user_notif_{n.id}",
                        "title": n.title,
                        "description": getattr(n, 'message', n.title),
                        "date": n.created_at.isoformat() if n.created_at else timezone.now().isoformat(),
                        "type": "notification",
                        "read": getattr(n, 'read', False)
                    })

        # Admin Notification (company-wide)
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            for n in Notification.objects.filter(company_id=user.employee_profile.company_id).distinct():
                unique_id = f"admin_notif_{n.id}"
                if unique_id not in seen_ids:
                    seen_ids.add(unique_id)
                    notifications.append({
                        "id": f"admin_notif_{n.id}",
                        "title": n.title or "Admin Notification",
                        "description": n.description or n.title or "",
                        "date": n.created_at.isoformat() if hasattr(n, 'created_at') and n.created_at else timezone.now().isoformat(),
                        "type": "admin"
                    })

        # Calendar Events (company-wide)
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            for e in CalendarEvent.objects.filter(company_id=user.employee_profile.company_id).distinct():
                unique_id = f"calendar_{e.id}"
                if unique_id not in seen_ids:
                    seen_ids.add(unique_id)
                    notifications.append({
                        "id": f"calendar_{e.id}",
                        "title": e.name or "Calendar Event",
                        "description": getattr(e, 'description', "Calendar Event"),
                        "date": e.date.isoformat() if hasattr(e, 'date') and e.date else timezone.now().isoformat(),
                        "type": "calendar"
                    })

        # Learning Corner (company-wide)
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            for l in LearningCorner.objects.filter(company_id=user.employee_profile.company_id).distinct():
                unique_id = f"learning_{l.id}"
                if unique_id not in seen_ids:
                    seen_ids.add(unique_id)
                    notifications.append({
                        "id": f"learning_{l.id}",
                        "title": l.title or "Learning Corner",
                        "description": getattr(l, 'description', "Learning Corner"),
                        "date": getattr(l, 'created_at', timezone.now()).isoformat() if hasattr(l, 'created_at') else timezone.now().isoformat(),
                        "type": "learning_corner"
                    })

        # Birthday wishes for all employees whose birthday is today
        today = timezone.localdate()
        if hasattr(user, 'employee_profile') and user.employee_profile and user.employee_profile.company_id:
            birthday_employees = Employee.objects.filter(
                company_id=user.employee_profile.company_id,
                date_of_birth__month=today.month, 
                date_of_birth__day=today.day
            ).distinct()
            for emp in birthday_employees:
                unique_id = f"birthday_{emp.id}_{today}"
                if unique_id not in seen_ids:
                    seen_ids.add(unique_id)
                    notifications.append({
                        "id": f"birthday_{emp.id}_{today}",
                        "title": "🎂 Birthday Wish",
                        "description": f"Happy Birthday, {emp.full_name}! May your day be filled with joy and success 🎉.",
                        "date": today.isoformat(),
                        "type": "birthday"
                    })

        # Sort by date descending, handling None values by using a fallback
        def sort_key(x):
            # If date is None, use a very old date so it appears last
            d = x["date"]
            if d is None or d == "None":
                return "1970-01-01T00:00:00"
            return d
        
        # Remove duplicates based on unique combination of title, description, and date
        unique_notifications = []
        seen_combinations = set()
        
        for notif in notifications:
            combo = f"{notif['title']}_{notif['description']}_{notif['date']}"
            if combo not in seen_combinations:
                seen_combinations.add(combo)
                unique_notifications.append(notif)
        
        unique_notifications.sort(key=sort_key, reverse=True)
        return Response(unique_notifications)
