import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../../models/chat_conversation_model.dart';
import '../../../models/chat_message_model.dart';
import '../../../models/chat_user_model.dart';
import '../../../providers/chat_provider.dart';
import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/stitch_background.dart';

class ChatThreadPage extends StatefulWidget {
  final int conversationId;
  const ChatThreadPage({super.key, required this.conversationId});

  @override
  State<ChatThreadPage> createState() => _ChatThreadPageState();
}

class _ChatThreadPageState extends State<ChatThreadPage>
    with WidgetsBindingObserver {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();

  File? _pendingFile;
  bool _sending = false;
  ChatUser? _me;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final chat = ChatScope.of(context);
      _me = await chat.getMe();
      await chat.openConversation(widget.conversationId);
      _scrollToBottom();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final chat = ChatScope.of(context);
    if (state == AppLifecycleState.resumed) {
      chat.setForeground(true);
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      chat.setForeground(false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    });
  }

  ChatConversation? _activeConversation(ChatProvider chat) {
    try {
      return chat.conversations.firstWhere((c) => c.id == widget.conversationId);
    } catch (_) {
      return null;
    }
  }

  String _titleFor(ChatConversation? c) {
    if (c == null) return 'Chat';
    if (c.isGroup) return c.name ?? 'Group';
    // DM: show the other member (best effort)
    if (c.members.isEmpty) return 'Direct message';
    return c.members.first.user.displayName;
  }

  bool _canSend(ChatConversation? c) {
    if (c == null) return true;
    if (!c.isGroup) return true;
    // If we can find my membership, disallow viewers.
    final meName = _me?.username ?? '';
    final mem = c.members
        .where((m) => (m.user.username == meName && meName.isNotEmpty))
        .toList();
    if (mem.isEmpty) return true;
    return mem.first.role != 'viewer';
  }

  @override
  Widget build(BuildContext context) {
    final chat = ChatScope.of(context);
    final conv = _activeConversation(chat);
    final title = _titleFor(conv);
    final canSend = _canSend(conv);
    final needsTextForAttachment =
        _pendingFile != null && _textController.text.trim().isEmpty;

    final msgs = chat.messages;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                GlassCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: () => Navigator.pop(context),
                        tooltip: 'Back',
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              conv?.isGroup == true ? 'Group chat' : 'Direct message',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      if (conv?.isGroup == true)
                        IconButton(
                          tooltip: 'Manage',
                          icon: const Icon(Icons.manage_accounts_outlined),
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              '/employee/chat/manage-group',
                              arguments: {'conversationId': widget.conversationId},
                            );
                          },
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: GlassCard(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    child: chat.loadingMessages && msgs.isEmpty
                        ? const Center(child: CircularProgressIndicator())
                        : ListView.builder(
                            controller: _scrollController,
                            padding: EdgeInsets.zero,
                            itemCount: msgs.length,
                            itemBuilder: (context, i) {
                              final m = msgs[i];
                              final isMine = (_me?.username.isNotEmpty == true &&
                                  m.sender.username == _me!.username);
                              return _MessageBubble(
                                message: m,
                                isMine: isMine,
                              );
                            },
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                if (_pendingFile != null) _AttachmentPreview(
                  file: _pendingFile!,
                  needsText: needsTextForAttachment,
                  onRemove: () => setState(() => _pendingFile = null),
                ),
                const SizedBox(height: 10),
                GlassCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          IconButton(
                            tooltip: 'Attach',
                            onPressed: (!canSend || _sending)
                                ? null
                                : () async {
                                    final res = await FilePicker.platform.pickFiles(
                                      allowMultiple: false,
                                      withData: false,
                                    );
                                    if (res == null || res.files.isEmpty) return;
                                    final path = res.files.single.path;
                                    if (path == null || path.isEmpty) return;
                                    setState(() => _pendingFile = File(path));
                                  },
                            icon: const Icon(Icons.attach_file_rounded),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _textController,
                              enabled: canSend && !_sending,
                              minLines: 1,
                              maxLines: 4,
                              decoration: InputDecoration(
                                hintText: canSend ? 'Type a message…' : 'Messaging disabled',
                                border: InputBorder.none,
                              ),
                              onChanged: (_) => setState(() {}),
                              onSubmitted: (_) => _send(chat),
                            ),
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            tooltip: 'Send',
                            onPressed: (!canSend || _sending)
                                ? null
                                : () => _send(chat),
                            icon: const Icon(Icons.send_rounded),
                          ),
                        ],
                      ),
                      if (needsTextForAttachment)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            children: const [
                              Icon(Icons.info_outline_rounded,
                                  size: 16, color: Color(0xFFB45309)),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Add a short message to send an attachment.',
                                  style: TextStyle(
                                    color: Color(0xFFB45309),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if ((chat.error ?? '').isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            chat.error!,
                            style: const TextStyle(
                              color: Color(0xFFB91C1C),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _send(ChatProvider chat) async {
    if (_sending) return;
    final text = _textController.text.trim();
    if (_pendingFile != null && text.isEmpty) return;
    if (_pendingFile == null && text.isEmpty) return;

    setState(() => _sending = true);
    try {
      if (_pendingFile != null) {
        await chat.sendAttachment(
          conversationId: widget.conversationId,
          text: text,
          file: _pendingFile!,
        );
        _textController.clear();
        setState(() => _pendingFile = null);
      } else {
        final me = _me ?? await chat.getMe();
        await chat.sendText(
          conversationId: widget.conversationId,
          text: text,
          me: me,
        );
        _textController.clear();
      }
      _scrollToBottom();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMine;
  const _MessageBubble({required this.message, required this.isMine});

  @override
  Widget build(BuildContext context) {
    final bg = isMine
        ? AppStitchTheme.primary
        : Colors.white.withValues(alpha: 0.70);
    final fg = isMine ? Colors.white : AppStitchTheme.lightOnSurface;
    final align = isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: align,
        children: [
          if (!isMine)
            Padding(
              padding: const EdgeInsets.only(left: 6, bottom: 4),
              child: Text(
                message.sender.displayName,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ),
          Row(
            mainAxisAlignment:
                isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.78,
                ),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft:
                          Radius.circular(isMine ? 18 : 6),
                      bottomRight:
                          Radius.circular(isMine ? 6 : 18),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 14,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (message.content.trim().isNotEmpty)
                          Text(
                            message.content,
                            style: TextStyle(
                              color: fg,
                              fontWeight: FontWeight.w700,
                              height: 1.25,
                            ),
                          ),
                        if (message.hasAttachment) ...[
                          if (message.content.trim().isNotEmpty)
                            const SizedBox(height: 8),
                          _AttachmentChip(
                            name: message.attachmentName ?? 'Attachment',
                            isMine: isMine,
                            isImage: message.isImageAttachment,
                          ),
                        ],
                        const SizedBox(height: 6),
                        Align(
                          alignment: Alignment.bottomRight,
                          child: Text(
                            _formatTime(message.createdAt),
                            style: TextStyle(
                              color: isMine
                                  ? Colors.white.withValues(alpha: 0.85)
                                  : AppStitchTheme.lightOnSurfaceMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final d = dt;
    final h = d.hour.toString().padLeft(2, '0');
    final m = d.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _AttachmentChip extends StatelessWidget {
  final String name;
  final bool isMine;
  final bool isImage;
  const _AttachmentChip({
    required this.name,
    required this.isMine,
    required this.isImage,
  });

  @override
  Widget build(BuildContext context) {
    final color = isMine
        ? Colors.white.withValues(alpha: 0.18)
        : AppStitchTheme.primary.withValues(alpha: 0.10);
    final icon = isImage ? Icons.image_outlined : Icons.insert_drive_file_outlined;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: color,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: isMine ? Colors.white : AppStitchTheme.primary),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              name,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: isMine ? Colors.white : AppStitchTheme.lightOnSurface,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AttachmentPreview extends StatelessWidget {
  final File file;
  final bool needsText;
  final VoidCallback onRemove;
  const _AttachmentPreview({
    required this.file,
    required this.needsText,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final name = file.path.split(Platform.pathSeparator).last;
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          const Icon(Icons.attach_file_rounded,
              color: AppStitchTheme.lightOnSurfaceMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                if (needsText)
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Text(
                      'Add a message to send this file.',
                      style: TextStyle(
                        color: Color(0xFFB45309),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Remove',
          ),
        ],
      ),
    );
  }
}

