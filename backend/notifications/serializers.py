from rest_framework import serializers
from .models import UserNotification

class UserNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = [
            'id', 'recipient', 'sender', 'title', 'message',
            'type', 'related_object_id', 'read', 'created_at'
        ]
