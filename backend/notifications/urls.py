from django.urls import path
from .views import NotificationSSEView, UserNotificationListAPIView, DeviceTokenView

urlpatterns = [
    path('sse/', NotificationSSEView.as_view(), name='notification_sse'),
    path('api/notifications/', UserNotificationListAPIView.as_view(), name='user-notifications'),
    path('devices/', DeviceTokenView.as_view(), name='device-token'),
]
