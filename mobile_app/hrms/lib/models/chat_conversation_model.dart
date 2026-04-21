import 'chat_user_model.dart';

class ChatConversationMember {
  final int id;
  final ChatUser user;
  final String role; // admin/member/viewer/owner (owner may appear from older data)
  final bool canAddMembers;
  final bool canRemoveMembers;
  final bool canRevokeRoles;

  const ChatConversationMember({
    required this.id,
    required this.user,
    required this.role,
    required this.canAddMembers,
    required this.canRemoveMembers,
    required this.canRevokeRoles,
  });

  factory ChatConversationMember.fromJson(Map<String, dynamic> json) {
    return ChatConversationMember(
      id: (json['id'] as num?)?.toInt() ?? 0,
      user: ChatUser.fromJson((json['user'] as Map?)?.cast<String, dynamic>() ??
          const <String, dynamic>{}),
      role: (json['role'] as String?) ?? 'member',
      canAddMembers: (json['can_add_members'] as bool?) ?? false,
      canRemoveMembers: (json['can_remove_members'] as bool?) ?? false,
      canRevokeRoles: (json['can_revoke_roles'] as bool?) ?? false,
    );
  }
}

class ChatLastMessage {
  final int id;
  final String content;
  final DateTime createdAt;
  final int? senderId;

  const ChatLastMessage({
    required this.id,
    required this.content,
    required this.createdAt,
    this.senderId,
  });

  factory ChatLastMessage.fromJson(Map<String, dynamic> json) {
    final createdRaw = (json['created_at'] ?? '').toString();
    final dt = DateTime.tryParse(createdRaw)?.toLocal() ?? DateTime.now();
    return ChatLastMessage(
      id: (json['id'] as num?)?.toInt() ?? 0,
      content: (json['content'] as String?) ?? '',
      createdAt: dt,
      senderId: (json['sender_id'] as num?)?.toInt(),
    );
  }
}

class ChatConversation {
  final int id;
  final String type; // dm|group
  final String? name;
  final List<ChatConversationMember> members;
  final ChatLastMessage? lastMessage;
  final int unreadCount;

  const ChatConversation({
    required this.id,
    required this.type,
    required this.name,
    required this.members,
    required this.lastMessage,
    required this.unreadCount,
  });

  bool get isGroup => type == 'group';

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    final membersRaw = json['members'];
    final members = (membersRaw is List)
        ? membersRaw
            .whereType<Map>()
            .map((m) => ChatConversationMember.fromJson(
                m.cast<String, dynamic>()))
            .toList()
        : <ChatConversationMember>[];

    final lastRaw = json['last_message'];
    final last = (lastRaw is Map)
        ? ChatLastMessage.fromJson(lastRaw.cast<String, dynamic>())
        : null;

    return ChatConversation(
      id: (json['id'] as num?)?.toInt() ?? 0,
      type: (json['type'] as String?) ?? 'dm',
      name: (json['name'] as String?)?.trim().isEmpty == true
          ? null
          : (json['name'] as String?)?.trim(),
      members: members,
      lastMessage: last,
      unreadCount: (json['unread_count'] as num?)?.toInt() ?? 0,
    );
  }
}

