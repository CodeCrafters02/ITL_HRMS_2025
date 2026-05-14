from rest_framework.views import APIView
from rest_framework import generics, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserNotificationSerializer
from .models import *
from app.permissions import IsAdminUser



class DeviceTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        user = request.user
       

        if not token:
            return Response({"detail": "Token required."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure each token is tied to the correct user
        device, created = UserDevice.objects.get_or_create(
            token=token,
            defaults={"user": user}
        )

        if not created:
            if device.user != user:
                
                device.user = user
                device.save(update_fields=["user"])

        return Response({"detail": "Token saved."}, status=status.HTTP_200_OK)



class UserNotificationListAPIView(generics.ListAPIView):
    serializer_class = UserNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'employee_profile') and user.employee_profile:
            return UserNotification.objects.filter(recipient=user.employee_profile).order_by('-created_at')
        return UserNotification.objects.none()


class DismissAnnouncementAPIView(APIView):
    """Allow a user to dismiss (clear) a specific announcement for themselves only."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response({"detail": "No employee profile."}, status=status.HTTP_400_BAD_REQUEST)

        notification_id = request.data.get("notification_id")
        if not notification_id:
            return Response({"detail": "notification_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        DismissedNotification.objects.get_or_create(
            employee=employee,
            notification_id=str(notification_id),
        )
        return Response({"detail": "Announcement dismissed."}, status=status.HTTP_200_OK)

    def delete(self, request):
        """Clear all dismissed announcements (restore all)."""
        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response({"detail": "No employee profile."}, status=status.HTTP_400_BAD_REQUEST)

        DismissedNotification.objects.filter(employee=employee).delete()
        return Response({"detail": "All dismissed announcements restored."}, status=status.HTTP_200_OK)


class DismissedAnnouncementListAPIView(APIView):
    """Get list of notification IDs dismissed by the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response([], status=status.HTTP_200_OK)

        dismissed_ids = list(
            DismissedNotification.objects.filter(employee=employee).values_list('notification_id', flat=True)
        )
        return Response(dismissed_ids, status=status.HTTP_200_OK)


class TriggerCheckoutReminderView(APIView):
    """
    Admin-only endpoint to immediately send checkout-reminder notifications
    to all employees who have checked in today but not yet checked out and
    whose shift end time has already passed.

    POST /notifications/trigger-checkout-reminder/

    Optionally accepts a JSON body:
        { "dry_run": true }  — reports who would be notified without sending.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        from notifications.service import send_checkout_reminders

        dry_run = bool(request.data.get("dry_run", False))
        results = send_checkout_reminders(dry_run=dry_run)
        return Response(
            {
                "detail": "Checkout reminders processed.",
                "dry_run": dry_run,
                "notified": results["notified"],
                "skipped": results["skipped"],
                "errors": results["errors"],
            },
            status=status.HTTP_200_OK,
        )




