from rest_framework.views import APIView
from rest_framework import generics, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserNotificationSerializer
from .models import *



class DeviceTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        user = request.user
        print("DEBUG >> Saving token:", token, "for user:", user.id, user.username)

        if not token:
            return Response({"detail": "Token required."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure each token is tied to the correct user
        device, created = UserDevice.objects.get_or_create(
            token=token,
            defaults={"user": user}
        )

        if not created:
            if device.user != user:
                print(f"DEBUG >> Updating token {token} from user {device.user_id} to {user.id}")
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




