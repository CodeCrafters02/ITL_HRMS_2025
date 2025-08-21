from rest_framework.views import APIView
from rest_framework import generics, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserNotificationSerializer
from .models import *
import json
import time
from django.http import StreamingHttpResponse
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View


class DeviceTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        user = request.user
        if not token:
            return Response({"detail": "Token required."}, status=status.HTTP_400_BAD_REQUEST)

        # Fix: Prevent unique constraint error on token
        device, created = UserDevice.objects.get_or_create(token=token, defaults={"user": user})
        if not created:
            # If the device exists, update the user if needed
            if device.user != user:
                device.user = user
                device.save(update_fields=["user"])
        return Response({"detail": "Token saved."}, status=status.HTTP_200_OK)


@method_decorator(login_required, name='dispatch')
class NotificationSSEView(View):
    def get(self, request):
        def event_stream(user):
            last_id = int(request.GET.get('last_id', 0))
            while True:
                new_notifications = UserNotification.objects.filter(
                    recipient=user.employee_profile, id__gt=last_id, read=False
                ).order_by('id')
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
                time.sleep(2)  # Poll every 2 seconds

        return StreamingHttpResponse(event_stream(request.user), content_type='text/event-stream')

class UserNotificationListAPIView(generics.ListAPIView):
    serializer_class = UserNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'employee_profile') and user.employee_profile:
            return UserNotification.objects.filter(recipient=user.employee_profile).order_by('-created_at')
        return UserNotification.objects.none()


