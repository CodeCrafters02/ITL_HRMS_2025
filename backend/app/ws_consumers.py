from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from .models import ChatConversation, ChatConversationMember, ChatMessage


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close(code=4401)
            return
        await self.accept()

    async def receive_json(self, content, **kwargs):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close(code=4401)
            return

        msg_type = content.get("type")
        if msg_type == "join":
            await self._join_conversation(user, content.get("conversation_id"))
        elif msg_type == "leave":
            await self._leave_conversation(user, content.get("conversation_id"))
        elif msg_type == "message":
            await self._send_message(user, content)
        else:
            await self.send_json({"type": "error", "detail": "Unknown message type."})

    async def _join_conversation(self, user, conversation_id):
        if not conversation_id:
            await self.send_json({"type": "error", "detail": "conversation_id required."})
            return
        allowed = await ChatConversationMember.objects.filter(conversation_id=conversation_id, user_id=user.id).aexists()
        if not allowed:
            await self.send_json({"type": "error", "detail": "Not allowed."})
            return
        group_name = f"chat_conv_{conversation_id}"
        await self.channel_layer.group_add(group_name, self.channel_name)
        # Mark as seen when user joins
        await ChatConversationMember.objects.filter(conversation_id=conversation_id, user_id=user.id).aupdate(last_seen_at=timezone.now())
        await self.send_json({"type": "joined", "conversation_id": conversation_id})

    async def _leave_conversation(self, user, conversation_id):
        if not conversation_id:
            return
        group_name = f"chat_conv_{conversation_id}"
        await self.channel_layer.group_discard(group_name, self.channel_name)
        await self.send_json({"type": "left", "conversation_id": conversation_id})

    async def _send_message(self, user, payload):
        conversation_id = payload.get("conversation_id")
        text = (payload.get("content") or "").strip()
        if not conversation_id or not text:
            await self.send_json({"type": "error", "detail": "conversation_id and content are required."})
            return

        member = await ChatConversationMember.objects.filter(conversation_id=conversation_id, user_id=user.id).afirst()
        if not member:
            await self.send_json({"type": "error", "detail": "Not allowed."})
            return
        if getattr(member, "role", None) == "viewer":
            await self.send_json({"type": "error", "detail": "View-only members cannot send messages."})
            return

        conv = await ChatConversation.objects.filter(id=conversation_id, company=user.company).afirst()
        if not conv:
            await self.send_json({"type": "error", "detail": "Conversation not found."})
            return

        msg = await ChatMessage.objects.acreate(
            conversation_id=conversation_id,
            company=user.company,
            sender_id=user.id,
            content=text,
        )
        # Sender has seen this conversation at send time
        await ChatConversationMember.objects.filter(conversation_id=conversation_id, user_id=user.id).aupdate(last_seen_at=timezone.now())
        await ChatConversation.objects.filter(id=conversation_id).aupdate(updated_at=timezone.now())

        group_name = f"chat_conv_{conversation_id}"
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "chat.message",
                "message": {
                    "id": msg.id,
                    "conversation_id": conversation_id,
                    "sender": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                    },
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        await self.send_json({"type": "message", **event["message"]})

