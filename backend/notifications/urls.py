from django.urls import path
from .views import UserNotificationListAPIView, DeviceTokenView, DismissAnnouncementAPIView, DismissedAnnouncementListAPIView


urlpatterns = [
    
    path('api/notifications/', UserNotificationListAPIView.as_view(), name='user-notifications'),
    path('devices/', DeviceTokenView.as_view(), name='device-token'),
    path('dismiss-announcement/', DismissAnnouncementAPIView.as_view(), name='dismiss-announcement'),
    path('dismissed-announcements/', DismissedAnnouncementListAPIView.as_view(), name='dismissed-announcements'),
   ]
