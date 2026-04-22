from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ChatConversation, ChatConversationMember, ChatMessage

User = get_user_model()


class ChatUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class ChatConversationMemberSerializer(serializers.ModelSerializer):
    user = ChatUserSerializer(read_only=True)

    class Meta:
        model = ChatConversationMember
        fields = [
            "id",
            "user",
            "role",
            "can_add_members",
            "can_remove_members",
            "can_revoke_roles",
            "joined_at",
        ]


class ChatConversationSerializer(serializers.ModelSerializer):
    members = ChatConversationMemberSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = ["id", "type", "name", "company", "created_by", "created_at", "updated_at", "members", "last_message", "unread_count"]
        read_only_fields = ["company", "created_by", "created_at", "updated_at", "members", "last_message", "unread_count"]

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "created_at": msg.created_at,
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not getattr(user, "is_authenticated", False):
            return 0
        member = obj.members.filter(user_id=user.id).only("last_seen_at").first()
        if not member:
            return 0
        last_seen = member.last_seen_at
        qs = obj.messages.all()
        if last_seen:
            qs = qs.filter(created_at__gt=last_seen)
        # Don't count your own messages as unread
        qs = qs.exclude(sender_id=user.id)
        return qs.count()


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)
    attachment_url = serializers.SerializerMethodField(read_only=True)
    # In multipart/form-data, it's easy for clients to omit/rename fields.
    # We'll validate conversation in the viewset and allow attachment-only messages.
    conversation = serializers.PrimaryKeyRelatedField(queryset=ChatConversation.objects.all(), required=False, allow_null=True)
    attachment = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "conversation",
            "company",
            "sender",
            "content",
            "attachment",
            "attachment_url",
            "attachment_name",
            "attachment_mime",
            "created_at",
        ]
        read_only_fields = ["company", "sender", "created_at"]

    def validate(self, attrs):
        content = (attrs.get("content") or "").strip()
        attachment = attrs.get("attachment") or None
        if not content and not attachment:
            raise serializers.ValidationError({"detail": "content is required."})
        if attachment and not content:
            raise serializers.ValidationError({"content": "Text is required with an attachment."})
        # Allow viewset to inject conversation; but if present, ensure it's not null.
        if "conversation" in attrs and attrs.get("conversation") is None:
            raise serializers.ValidationError({"conversation": "This field may not be null."})
        attrs["content"] = content
        return attrs

    def get_attachment_url(self, obj):
        f = getattr(obj, "attachment", None)
        if not f:
            return None
        try:
            return f.url
        except Exception:
            return None

    def create(self, validated_data):
        request = self.context.get("request")
        uploaded = None
        if request and hasattr(request, "FILES"):
            uploaded = request.FILES.get("attachment")

        msg = super().create(validated_data)
        if uploaded:
            update = {}
            if not msg.attachment_name:
                update["attachment_name"] = getattr(uploaded, "name", None)
            if not msg.attachment_mime:
                update["attachment_mime"] = getattr(uploaded, "content_type", None)
            if update:
                for k, v in update.items():
                    setattr(msg, k, v)
                msg.save(update_fields=list(update.keys()))
        return msg
