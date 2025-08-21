from django.db import models
from django.conf import settings
from app.models import Employee 
from django.utils import timezone

class UserNotification(models.Model):

    recipient = models.ForeignKey(Employee, related_name='notifications', on_delete=models.CASCADE)
    sender =  models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recipient.full_name} - {self.title}"

class UserDevice(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="devices")
    token = models.CharField(max_length=255, unique=True) 
    platform = models.CharField(max_length=20, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user_id} - {self.platform} - {self.token[:12]}..."


