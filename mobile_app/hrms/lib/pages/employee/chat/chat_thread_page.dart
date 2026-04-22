import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:image_gallery_saver_plus/image_gallery_saver_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../models/chat_conversation_model.dart';
import '../../../models/chat_message_model.dart';
import '../../../models/chat_user_model.dart';
import '../../../providers/chat_provider.dart';
import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/stitch_background.dart';
import '../../../config/api_config.dart';

String? _resolveAttachmentUrlForDisplay(String? raw) {
  if (raw == null) return null;
  final u = raw.trim();
  if (u.isEmpty) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return '${ApiConfig.baseUrl}$u';
  return '${ApiConfig.baseUrl}/$u';
}

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
  final _composerFocus = FocusNode();

  File? _pendingFile;
  bool _sending = false;
  ChatUser? _me;
  bool _showScrollToBottom = false;
  ChatMessage? _replyTo;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _textController.addListener(() {
      if (!mounted) return;
      setState(() {});
    });
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
    _composerFocus.dispose();
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
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
      );
    });
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  String _dayLabel(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(dt.year, dt.month, dt.day);
    final diff = today.difference(day).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}';
  }

  List<_ThreadItem> _buildThreadItems(List<ChatMessage> msgs) {
    final items = <_ThreadItem>[];
    ChatMessage? prev;
    for (var i = 0; i < msgs.length; i++) {
      final m = msgs[i];
      if (prev == null || !_isSameDay(prev.createdAt, m.createdAt)) {
        items.add(_ThreadItem.dateSeparator(_dayLabel(m.createdAt)));
      }

      final isMine = (_me?.username.isNotEmpty == true &&
          m.sender.username == _me!.username);

      final sameSender = prev != null && (prev.sender.username == m.sender.username);
      final closeInTime = prev != null &&
          m.createdAt.difference(prev.createdAt).inMinutes.abs() < 2;
      final groupedWithPrev = prev != null && sameSender && closeInTime;

      // Show header for incoming when not grouped.
      final showHeader = !isMine && !groupedWithPrev;

      // Show time only at the end of a group (or for single message).
      final nextIdx = i + 1;
      final hasNext = nextIdx < msgs.length;
      final next = hasNext ? msgs[nextIdx] : null;
      final groupedWithNext = next != null &&
          next.sender.username == m.sender.username &&
          next.createdAt.difference(m.createdAt).inMinutes.abs() < 2 &&
          _isSameDay(next.createdAt, m.createdAt);
      final showTime = !groupedWithNext;

      items.add(_ThreadItem.message(
        message: m,
        isMine: isMine,
        showHeader: showHeader,
        showTime: showTime,
        groupedWithPrev: groupedWithPrev,
      ));

      prev = m;
    }
    return items;
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
    final hasSendableText = _textController.text.trim().isNotEmpty;
    final sendAllowed = canSend &&
        !_sending &&
        ((hasSendableText && _pendingFile == null) ||
            (hasSendableText && _pendingFile != null));

    final msgs = chat.messages;
    final threadItems = _buildThreadItems(msgs);
    final pendingAttachment = chat.pendingAttachment;

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
                      if (chat.reconnecting && chat.wsEverConnected)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.62),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: AppStitchTheme.lightOutline
                                    .withValues(alpha: 0.55),
                              ),
                            ),
                            child: const Text(
                              'Reconnecting…',
                              style: TextStyle(
                                color: AppStitchTheme.lightOnSurfaceMuted,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                            ),
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
                        : Stack(
                            children: [
                              if (msgs.isEmpty)
                                _EmptyThreadState(
                                  onSayHi: () {
                                    _composerFocus.requestFocus();
                                  },
                                ),
                              NotificationListener<ScrollNotification>(
                                onNotification: (n) {
                                  if (!_scrollController.hasClients) {
                                    return false;
                                  }
                                  final nearBottom = _scrollController
                                              .position.maxScrollExtent -
                                          _scrollController.position.pixels <
                                      240;
                                  if (nearBottom == !_showScrollToBottom) {
                                    setState(() =>
                                        _showScrollToBottom = !nearBottom);
                                  }
                                  return false;
                                },
                                child: ListView.builder(
                                  controller: _scrollController,
                                  padding: EdgeInsets.zero,
                                  itemCount: threadItems.length +
                                      ((pendingAttachment != null &&
                                              pendingAttachment.conversationId ==
                                                  widget.conversationId)
                                          ? 1
                                          : 0),
                                  itemBuilder: (context, i) {
                                    final hasPending = pendingAttachment != null &&
                                        pendingAttachment.conversationId ==
                                            widget.conversationId;
                                    if (hasPending && i == threadItems.length) {
                                      return _PendingAttachmentBubble(
                                        pending: pendingAttachment!,
                                      );
                                    }
                                    final it = threadItems[i];
                                    if (it.kind == _ThreadItemKind.date) {
                                      return _DateSeparator(label: it.label!);
                                    }
                                    final m = it.message!;
                                    final isPending =
                                        it.isMine == true && chat.isPendingMessage(m.id);
                                    return _MessageBubble(
                                      message: m,
                                      isMine: it.isMine!,
                                      showHeader: it.showHeader!,
                                      showTime: it.showTime!,
                                      groupedWithPrev: it.groupedWithPrev!,
                                      isPending: isPending,
                                      onSwipeReply: (msg) {
                                        setState(() => _replyTo = msg);
                                        _composerFocus.requestFocus();
                                      },
                                      onOpenAttachment: (msg) async {
                                        final url = _resolveAttachmentUrl(
                                            msg.attachmentUrl);
                                        if (url == null) return;
                                        if (msg.isImageAttachment) {
                                          await showDialog(
                                            context: context,
                                            builder: (_) => _ImageViewerDialog(
                                              url: url,
                                              title: msg.attachmentName ??
                                                  'Image',
                                            ),
                                          );
                                          return;
                                        }
                                        final uri = Uri.tryParse(url);
                                        if (uri == null) return;
                                        await launchUrl(uri,
                                            mode: LaunchMode.externalApplication);
                                      },
                                    );
                                  },
                                ),
                              ),
                              if (_showScrollToBottom)
                                Positioned(
                                  right: 6,
                                  bottom: 6,
                                  child: InkWell(
                                    onTap: _scrollToBottom,
                                    borderRadius: BorderRadius.circular(999),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 10),
                                      decoration: BoxDecoration(
                                        color:
                                            Colors.white.withValues(alpha: 0.70),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                        border: Border.all(
                                          color: AppStitchTheme.lightOutline
                                              .withValues(alpha: 0.60),
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black
                                                .withValues(alpha: 0.08),
                                            blurRadius: 18,
                                            offset: const Offset(0, 10),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: const [
                                          Icon(Icons.arrow_downward_rounded,
                                              size: 18,
                                              color: AppStitchTheme.primary),
                                          SizedBox(width: 6),
                                          Text(
                                            'Latest',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w900,
                                              color: AppStitchTheme.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                            ],
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
                if (_replyTo != null) ...[
                  _ReplyPreview(
                    message: _replyTo!,
                    onClose: () => setState(() => _replyTo = null),
                  ),
                  const SizedBox(height: 10),
                ],
                _ComposerBar(
                  enabled: canSend && !_sending,
                  textController: _textController,
                  hasPendingAttachment: _pendingFile != null,
                  needsTextForAttachment: needsTextForAttachment,
                  errorText: (chat.error ?? '').isNotEmpty ? chat.error : null,
                  focusNode: _composerFocus,
                  onAttach: (!canSend || _sending)
                      ? null
                      : () async {
                          await showModalBottomSheet(
                            context: context,
                            backgroundColor: Colors.transparent,
                            builder: (_) => _AttachSheet(
                              onPickFile: () async {
                                final res = await FilePicker.platform.pickFiles(
                                  allowMultiple: false,
                                  withData: false,
                                );
                                if (res == null || res.files.isEmpty) return;
                                final path = res.files.single.path;
                                if (path == null || path.isEmpty) return;
                                if (!mounted) return;
                                setState(() => _pendingFile = File(path));
                              },
                              onPickGallery: () async {
                                final photos = await Permission.photos.request();
                                if (!photos.isGranted) {
                                  final storage = await Permission.storage.request();
                                  if (!storage.isGranted) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Gallery permission denied')),
                                      );
                                    }
                                    return;
                                  }
                                }
                                final img = await _imagePicker.pickImage(
                                  source: ImageSource.gallery,
                                  imageQuality: 85,
                                );
                                if (img == null) return;
                                if (!mounted) return;
                                setState(() => _pendingFile = File(img.path));
                              },
                              onPickCamera: () async {
                                final camera = await Permission.camera.request();
                                if (!camera.isGranted) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Camera permission denied')),
                                    );
                                  }
                                  return;
                                }
                                final img = await _imagePicker.pickImage(
                                  source: ImageSource.camera,
                                  imageQuality: 85,
                                );
                                if (img == null) return;
                                if (!mounted) return;
                                setState(() => _pendingFile = File(img.path));
                              },
                            ),
                          );
                        },
                  onSend: (!canSend || _sending) ? null : () => _send(chat),
                  sendAllowed: sendAllowed,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String? _resolveAttachmentUrl(String? raw) {
    if (raw == null) return null;
    final u = raw.trim();
    if (u.isEmpty) return null;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return '${ApiConfig.baseUrl}$u';
    return '${ApiConfig.baseUrl}/$u';
  }

  String _buildReplyPrefix(ChatMessage m) {
    final name = m.sender.displayName.trim().isEmpty ? 'User' : m.sender.displayName.trim();
    final snippet = (m.content.trim().isEmpty ? (m.attachmentName ?? 'Attachment') : m.content.trim());
    final clipped = snippet.length > 80 ? '${snippet.substring(0, 80)}…' : snippet;
    return '↩ $name: $clipped\n\n';
  }

  Future<void> _send(ChatProvider chat) async {
    if (_sending) return;
    final text = _textController.text.trim();
    if (_pendingFile != null && text.isEmpty) return;
    if (_pendingFile == null && text.isEmpty) return;

    setState(() => _sending = true);
    try {
      final replyPrefix = _replyTo != null ? _buildReplyPrefix(_replyTo!) : '';
      if (_pendingFile != null) {
        await chat.sendAttachment(
          conversationId: widget.conversationId,
          text: '$replyPrefix$text',
          file: _pendingFile!,
        );
        _textController.clear();
        setState(() {
          _pendingFile = null;
          _replyTo = null;
        });
      } else {
        final me = _me ?? await chat.getMe();
        await chat.sendText(
          conversationId: widget.conversationId,
          text: '$replyPrefix$text',
          me: me,
        );
        _textController.clear();
        setState(() => _replyTo = null);
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
  final bool showHeader;
  final bool showTime;
  final bool groupedWithPrev;
  final bool isPending;
  final void Function(ChatMessage message) onSwipeReply;
  final void Function(ChatMessage message) onOpenAttachment;
  const _MessageBubble({
    required this.message,
    required this.isMine,
    required this.showHeader,
    required this.showTime,
    required this.groupedWithPrev,
    required this.isPending,
    required this.onSwipeReply,
    required this.onOpenAttachment,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isMine
        ? AppStitchTheme.primary
        : Colors.white.withValues(alpha: 0.74);
    final fg = isMine ? Colors.white : AppStitchTheme.lightOnSurface;
    final align = isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start;

    return Padding(
      padding: EdgeInsets.only(bottom: 8, top: groupedWithPrev ? 2 : 10),
      child: Column(
        crossAxisAlignment: align,
        children: [
          if (showHeader)
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
                  maxWidth: MediaQuery.of(context).size.width * 0.74,
                ),
                child: GestureDetector(
                  onHorizontalDragEnd: (d) {
                    final v = d.primaryVelocity ?? 0;
                    if (!isMine && v > 900) onSwipeReply(message); // swipe right
                    if (isMine && v < -900) onSwipeReply(message); // swipe left
                  },
                  child: InkWell(
                    borderRadius: BorderRadius.circular(22),
                    onLongPress: () async {
                      final text = message.content.trim();
                      if (text.isEmpty) return;
                      await Clipboard.setData(ClipboardData(text: text));
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Copied')),
                      );
                    },
                    child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: bg,
                      border: isMine
                          ? null
                          : Border.all(
                              color: AppStitchTheme.lightOutline
                                  .withValues(alpha: 0.55),
                              width: 1,
                            ),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(22),
                        topRight: const Radius.circular(22),
                        bottomLeft: Radius.circular(isMine ? 22 : 8),
                        bottomRight: Radius.circular(isMine ? 8 : 22),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (message.hasAttachment &&
                              message.isImageAttachment &&
                              (message.attachmentUrl ?? '').isNotEmpty) ...[
                            InkWell(
                              onTap: () => onOpenAttachment(message),
                              borderRadius: BorderRadius.circular(18),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(18),
                                child: AspectRatio(
                                  aspectRatio: 4 / 3,
                                  child: Image.network(
                                    _resolveAttachmentUrlForDisplay(
                                            message.attachmentUrl) ??
                                        '',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: Colors.black.withValues(alpha: 0.10),
                                      alignment: Alignment.center,
                                      child: Icon(
                                        Icons.broken_image_outlined,
                                        color: isMine
                                            ? Colors.white.withValues(alpha: 0.9)
                                            : AppStitchTheme.lightOnSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            if (message.content.trim().isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                message.content,
                                style: TextStyle(
                                  color: fg,
                                  fontWeight: FontWeight.w800,
                                  height: 1.25,
                                ),
                              ),
                            ],
                          ] else ...[
                            if (message.content.trim().isNotEmpty)
                              Text(
                                message.content,
                                style: TextStyle(
                                  color: fg,
                                  fontWeight: FontWeight.w800,
                                  height: 1.25,
                                ),
                              ),
                            if (message.hasAttachment) ...[
                              if (message.content.trim().isNotEmpty)
                                const SizedBox(height: 8),
                              InkWell(
                                onTap: () => onOpenAttachment(message),
                                borderRadius: BorderRadius.circular(14),
                                child: _AttachmentChip(
                                  name: message.attachmentName ?? 'Attachment',
                                  isMine: isMine,
                                  isImage: message.isImageAttachment,
                                ),
                              ),
                            ],
                          ],
                          if (showTime) ...[
                            const SizedBox(height: 6),
                            Align(
                              alignment: Alignment.bottomRight,
                              child: Text(
                                isPending ? 'Sending…' : 'Sent • ${_formatTime(message.createdAt)}',
                                style: TextStyle(
                                  color: isMine
                                      ? Colors.white.withValues(alpha: 0.85)
                                      : AppStitchTheme.lightOnSurfaceMuted,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
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

enum _ThreadItemKind { date, message }

class _ThreadItem {
  final _ThreadItemKind kind;
  final String? label;
  final ChatMessage? message;
  final bool? isMine;
  final bool? showHeader;
  final bool? showTime;
  final bool? groupedWithPrev;

  const _ThreadItem._({
    required this.kind,
    this.label,
    this.message,
    this.isMine,
    this.showHeader,
    this.showTime,
    this.groupedWithPrev,
  });

  factory _ThreadItem.dateSeparator(String label) =>
      _ThreadItem._(kind: _ThreadItemKind.date, label: label);

  factory _ThreadItem.message({
    required ChatMessage message,
    required bool isMine,
    required bool showHeader,
    required bool showTime,
    required bool groupedWithPrev,
  }) =>
      _ThreadItem._(
        kind: _ThreadItemKind.message,
        message: message,
        isMine: isMine,
        showHeader: showHeader,
        showTime: showTime,
        groupedWithPrev: groupedWithPrev,
      );
}

class _DateSeparator extends StatelessWidget {
  final String label;
  const _DateSeparator({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.55),
            ),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppStitchTheme.lightOnSurfaceMuted,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.2,
                ),
          ),
        ),
      ),
    );
  }
}

class _PendingAttachmentBubble extends StatelessWidget {
  final PendingAttachmentMessage pending;
  const _PendingAttachmentBubble({required this.pending});

  @override
  Widget build(BuildContext context) {
    final fg = Colors.white;
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.74,
            ),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: AppStitchTheme.primary,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(22),
                  topRight: Radius.circular(22),
                  bottomLeft: Radius.circular(22),
                  bottomRight: Radius.circular(8),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (pending.isImage)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Stack(
                          children: [
                            AspectRatio(
                              aspectRatio: 4 / 3,
                              child: Image.file(
                                pending.file,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  color: Colors.white.withValues(alpha: 0.14),
                                  alignment: Alignment.center,
                                  child: const Icon(Icons.image_outlined,
                                      color: Colors.white),
                                ),
                              ),
                            ),
                            Positioned.fill(
                              child: Container(
                                color: Colors.black.withValues(alpha: 0.22),
                                alignment: Alignment.center,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    SizedBox(
                                      width: 26,
                                      height: 26,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 3,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                                Colors.white),
                                      ),
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      'Uploading…',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.insert_drive_file_outlined,
                                color: Colors.white),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                pending.fileName,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (pending.caption.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        pending.caption,
                        style: TextStyle(
                          color: fg,
                          fontWeight: FontWeight.w800,
                          height: 1.25,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    const Align(
                      alignment: Alignment.bottomRight,
                      child: Text(
                        'Sending…',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
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
    );
  }
}

class _ComposerBar extends StatelessWidget {
  final bool enabled;
  final TextEditingController textController;
  final bool hasPendingAttachment;
  final bool needsTextForAttachment;
  final String? errorText;
  final FocusNode focusNode;
  final VoidCallback? onAttach;
  final VoidCallback? onSend;
  final bool sendAllowed;

  const _ComposerBar({
    required this.enabled,
    required this.textController,
    required this.hasPendingAttachment,
    required this.needsTextForAttachment,
    required this.errorText,
    required this.focusNode,
    required this.onAttach,
    required this.onSend,
    required this.sendAllowed,
  });

  @override
  Widget build(BuildContext context) {
    final sendEnabled = sendAllowed && onSend != null;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.62),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.62),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 16,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              IconButton(
                tooltip: 'Attach',
                onPressed: enabled ? onAttach : null,
                icon: const Icon(Icons.add_circle_outline_rounded),
              ),
              Expanded(
                child: TextField(
                  controller: textController,
                  enabled: enabled,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: hasPendingAttachment
                        ? 'Add a message for the attachment…'
                        : 'Message',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) {
                    if (sendEnabled) onSend?.call();
                  },
                ),
              ),
              const SizedBox(width: 6),
              AnimatedOpacity(
                duration: const Duration(milliseconds: 180),
                opacity: sendEnabled ? 1 : 0.45,
                child: InkWell(
                  onTap: sendEnabled ? onSend : null,
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppStitchTheme.primary,
                    ),
                    child: const Icon(Icons.arrow_upward_rounded,
                        color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (needsTextForAttachment)
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Row(
              children: [
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
        if ((errorText ?? '').isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              errorText!,
              style: const TextStyle(
                color: Color(0xFFB91C1C),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

class _AttachSheet extends StatelessWidget {
  final Future<void> Function() onPickFile;
  final Future<void> Function() onPickGallery;
  final Future<void> Function() onPickCamera;
  const _AttachSheet({
    required this.onPickFile,
    required this.onPickGallery,
    required this.onPickCamera,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: GlassCard(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Attach',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.insert_drive_file_outlined),
                title: const Text('File'),
                onTap: () async {
                  Navigator.pop(context);
                  await onPickFile();
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_outlined),
                title: const Text('Photo'),
                onTap: () async {
                  Navigator.pop(context);
                  await onPickGallery();
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined),
                title: const Text('Camera'),
                onTap: () async {
                  Navigator.pop(context);
                  await onPickCamera();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReplyPreview extends StatelessWidget {
  final ChatMessage message;
  final VoidCallback onClose;
  const _ReplyPreview({required this.message, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final snippet = message.content.trim().isEmpty
        ? (message.attachmentName ?? 'Attachment')
        : message.content.trim();
    final clipped = snippet.length > 80 ? '${snippet.substring(0, 80)}…' : snippet;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppStitchTheme.lightOutline.withValues(alpha: 0.60),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 34,
            decoration: BoxDecoration(
              color: AppStitchTheme.primary,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Replying to ${message.sender.displayName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  clipped,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Cancel reply',
          ),
        ],
      ),
    );
  }
}

class _EmptyThreadState extends StatelessWidget {
  final VoidCallback onSayHi;
  const _EmptyThreadState({required this.onSayHi});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.waving_hand_rounded,
                size: 54, color: AppStitchTheme.primary.withValues(alpha: 0.80)),
            const SizedBox(height: 10),
            Text(
              'Say hi 👋',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Start the conversation with a quick message.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: onSayHi,
              child: const Text('Write a message'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImageViewerDialog extends StatelessWidget {
  final String url;
  final String title;
  const _ImageViewerDialog({required this.url, required this.title});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: GlassCard(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.55,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: InteractiveViewer(
                  child: Image.network(
                    url,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Center(
                      child: Text('Unable to load image'),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final uri = Uri.tryParse(url);
                        if (uri == null) return;
                        await launchUrl(uri,
                            mode: LaunchMode.externalApplication);
                      },
                      icon: const Icon(Icons.open_in_new_rounded),
                      label: const Text('Open'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        try {
                          // Try Photos permission first; fall back to storage.
                          final photos = await Permission.photos.request();
                          if (!photos.isGranted) {
                            final storage =
                                await Permission.storage.request();
                            if (!storage.isGranted) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text('Permission denied')),
                                );
                              }
                              return;
                            }
                          }

                          final resp = await http.get(Uri.parse(url));
                          if (resp.statusCode < 200 || resp.statusCode >= 300) {
                            throw Exception('Download failed');
                          }
                          final result = await ImageGallerySaverPlus.saveImage(
                            resp.bodyBytes,
                            quality: 95,
                            name: title.replaceAll(RegExp(r'\\W+'), '_'),
                          );
                          if (context.mounted) {
                            final ok = (result is Map &&
                                    (result['isSuccess'] == true ||
                                        result['success'] == true)) ||
                                (result is bool && result == true);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content: Text(ok
                                      ? 'Saved to phone'
                                      : 'Saved (check gallery)')),
                            );
                          }
                        } catch (_) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Could not save image')),
                            );
                          }
                        }
                      },
                      icon: const Icon(Icons.save_alt_rounded),
                      label: const Text('Save'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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

