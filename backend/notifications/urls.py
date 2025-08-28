from django.urls import path
from .views import UserNotificationListAPIView, DeviceTokenView


urlpatterns = [
    
    path('api/notifications/', UserNotificationListAPIView.as_view(), name='user-notifications'),
    path('devices/', DeviceTokenView.as_view(), name='device-token'),
   ]
