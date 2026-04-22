import 'chat_user_model.dart';

class ChatMessage {
  final int id;
  final int conversationId;
  final ChatUser sender;
  final String content;
  final String? attachmentUrl;
  final String? attachmentName;
  final String? attachmentMime;
  final DateTime createdAt;

  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.sender,
    required this.content,
    required this.attachmentUrl,
    required this.attachmentName,
    required this.attachmentMime,
    required this.createdAt,
  });

  bool get hasAttachment => attachmentUrl != null && attachmentUrl!.isNotEmpty;
  bool get isImageAttachment {
    final mime = (attachmentMime ?? '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    final name = (attachmentName ?? attachmentUrl ?? '').toLowerCase();
    return name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.webp') ||
        name.endsWith('.gif') ||
        name.endsWith('.heic');
  }

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final createdRaw = (json['created_at'] ?? '').toString();
    final dt = DateTime.tryParse(createdRaw)?.toLocal() ?? DateTime.now();

    // Backend sometimes returns conversation_id, sometimes conversation.
    final convId = (json['conversation_id'] as num?)?.toInt() ??
        (json['conversation'] as num?)?.toInt() ??
        0;

    return ChatMessage(
      id: (json['id'] as num?)?.toInt() ?? 0,
      conversationId: convId,
      sender: ChatUser.fromJson(
          (json['sender'] as Map?)?.cast<String, dynamic>() ??
              const <String, dynamic>{}),
      content: (json['content'] as String?) ?? '',
      attachmentUrl: (json['attachment_url'] as String?)?.trim().isEmpty == true
          ? null
          : (json['attachment_url'] as String?)?.trim(),
      attachmentName:
          (json['attachment_name'] as String?)?.trim().isEmpty == true
              ? null
              : (json['attachment_name'] as String?)?.trim(),
      attachmentMime:
          (json['attachment_mime'] as String?)?.trim().isEmpty == true
              ? null
              : (json['attachment_mime'] as String?)?.trim(),
      createdAt: dt,
    );
  }
}

