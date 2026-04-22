import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../models/chat_conversation_model.dart';
import '../models/chat_message_model.dart';
import '../models/chat_user_model.dart';
import '../services/chat_service.dart';
import '../services/storage_service.dart';

class PendingAttachmentMessage {
  final int localId;
  final int conversationId;
  final ChatUser me;
  final String caption;
  final File file;
  final DateTime createdAt;

  const PendingAttachmentMessage({
    required this.localId,
    required this.conversationId,
    required this.me,
    required this.caption,
    required this.file,
    required this.createdAt,
  });

  bool get isImage {
    final p = file.path.toLowerCase();
    return p.endsWith('.png') ||
        p.endsWith('.jpg') ||
        p.endsWith('.jpeg') ||
        p.endsWith('.webp') ||
        p.endsWith('.gif') ||
        p.endsWith('.heic');
  }

  String get fileName {
    final parts = file.path.split(Platform.pathSeparator);
    return parts.isNotEmpty ? parts.last : 'attachment';
  }
}

class ChatProvider extends ChangeNotifier {
  final ChatService _service;

  ChatProvider({ChatService? service}) : _service = service ?? ChatService();

  bool _loadingConversations = false;
  bool get loadingConversations => _loadingConversations;

  bool _loadingMessages = false;
  bool get loadingMessages => _loadingMessages;

  String? _error;
  String? get error => _error;

  List<ChatConversation> _conversations = const [];
  List<ChatConversation> get conversations => _conversations;

  int _unreadTotal = 0;
  int get unreadTotal => _unreadTotal;

  int? _activeConversationId;
  int? get activeConversationId => _activeConversationId;

  List<ChatMessage> _messages = const [];
  List<ChatMessage> get messages => _messages;

  bool _wsConnected = false;
  bool get wsConnected => _wsConnected;

  bool _reconnecting = false;
  bool get reconnecting => _reconnecting;

  bool _wsEverConnected = false;
  bool get wsEverConnected => _wsEverConnected;

  final Set<int> _pendingMessageIds = <int>{};
  bool isPendingMessage(int messageId) => _pendingMessageIds.contains(messageId);

  PendingAttachmentMessage? _pendingAttachment;
  PendingAttachmentMessage? get pendingAttachment => _pendingAttachment;

  Timer? _unreadPollTimer;
  Timer? _threadSyncTimer;
  Timer? _reconnectTimer;
  StreamSubscription? _wsSub;

  bool _foreground = true;

  Future<void> initialize() async {
    await refreshConversations(showLoading: true);
    await _ensureConnected();
    _startUnreadPolling();
  }

  void setForeground(bool isForeground) {
    _foreground = isForeground;
    if (!_foreground) {
      _stopTimers();
      _service.disconnect();
    } else {
      _startUnreadPolling();
      _ensureConnected();
      final id = _activeConversationId;
      if (id != null) {
        _startThreadSync(id);
      }
    }
  }

  Future<void> refreshConversations({bool showLoading = false}) async {
    if (showLoading) {
      _loadingConversations = true;
      notifyListeners();
    }
    try {
      _error = null;
      final list = await _service.fetchConversations();
      _conversations = list;
      _unreadTotal =
          list.fold<int>(0, (sum, c) => sum + (c.unreadCount > 0 ? c.unreadCount : 0));
    } catch (e) {
      _error = e.toString();
    } finally {
      if (showLoading) {
        _loadingConversations = false;
      }
      notifyListeners();
    }
  }

  Future<void> openConversation(int conversationId) async {
    _activeConversationId = conversationId;
    // Prevent "flash of previous thread" while new messages load.
    _messages = const [];
    _loadingMessages = true;
    notifyListeners();

    await _ensureConnected();
    _service.joinConversation(conversationId);
    await refreshMessages(conversationId: conversationId, showLoading: true);
    _startThreadSync(conversationId);
    // Re-fetch conversations to get accurate unread_count from backend after last_seen update.
    await refreshConversations(showLoading: false);
  }

  Future<void> refreshMessages({
    required int conversationId,
    bool showLoading = false,
  }) async {
    if (showLoading) {
      _loadingMessages = true;
      notifyListeners();
    }
    try {
      _error = null;
      final msgs = await _service.fetchMessages(conversationId: conversationId);
      _messages = msgs;
      // Server sync clears optimistic pending states.
      _pendingMessageIds.clear();
      if (_pendingAttachment?.conversationId == conversationId) {
        _pendingAttachment = null;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (showLoading) _loadingMessages = false;
      notifyListeners();
    }
  }

  Future<ChatConversation> startDm(int userId) async {
    final conv = await _service.createDm(userId);
    await refreshConversations(showLoading: false);
    return conv;
  }

  Future<ChatConversation> createGroup({
    required String name,
    required List<int> memberIds,
  }) async {
    final conv = await _service.createGroup(name: name, memberIds: memberIds);
    await refreshConversations(showLoading: false);
    return conv;
  }

  Future<List<ChatUser>> searchUsers(String q) => _service.searchUsers(q);

  Future<void> addMembers(int conversationId, List<int> memberIds) async {
    await _service.addMembers(conversationId: conversationId, memberIds: memberIds);
    await refreshConversations(showLoading: false);
  }

  Future<void> removeMember(int conversationId, int userId) async {
    await _service.removeMember(conversationId: conversationId, userId: userId);
    await refreshConversations(showLoading: false);
  }

  Future<void> updateMemberRole(int conversationId, int userId, String role) async {
    await _service.updateMemberRole(conversationId: conversationId, userId: userId, role: role);
    await refreshConversations(showLoading: false);
  }

  Future<void> sendText({
    required int conversationId,
    required String text,
    required ChatUser me,
  }) async {
    final content = text.trim();
    if (content.isEmpty) return;

    // Optimistic append
    final optimisticId = DateTime.now().millisecondsSinceEpoch;
    final optimistic = ChatMessage(
      id: optimisticId,
      conversationId: conversationId,
      sender: me,
      content: content,
      attachmentUrl: null,
      attachmentName: null,
      attachmentMime: null,
      createdAt: DateTime.now(),
    );
    _pendingMessageIds.add(optimisticId);
    _messages = List.of(_messages)..add(optimistic);
    notifyListeners();

    // Make sending feel instant: run network + sync in background.
    unawaited(_sendTextAndSync(
      conversationId: conversationId,
      content: content,
    ));
  }

  Future<void> _sendTextAndSync({
    required int conversationId,
    required String content,
  }) async {
    try {
      await _ensureConnected();
      if (_service.isConnected) {
        _service.sendMessageWs(conversationId: conversationId, content: content);
      } else {
        await _service.sendMessageRest(conversationId: conversationId, content: content);
      }
    } catch (_) {
      // Fallback to REST if WS fails
      await _service.sendMessageRest(conversationId: conversationId, content: content);
    } finally {
      // Sync from server to ensure ids/order are correct
      await refreshMessages(conversationId: conversationId, showLoading: false);
      await refreshConversations(showLoading: false);
    }
  }

  Future<void> sendAttachment({
    required int conversationId,
    required String text,
    required File file,
  }) async {
    final me = await getMe();
    final localId = DateTime.now().millisecondsSinceEpoch;
    _pendingAttachment = PendingAttachmentMessage(
      localId: localId,
      conversationId: conversationId,
      me: me,
      caption: text.trim(),
      file: file,
      createdAt: DateTime.now(),
    );
    notifyListeners();

    try {
      await _service.sendAttachment(
        conversationId: conversationId,
        content: text,
        file: file,
      );
    } finally {
      // Sync and clear pending (even on error, refresh will update error state elsewhere).
      _pendingAttachment = null;
      notifyListeners();
      await refreshMessages(conversationId: conversationId, showLoading: false);
      await refreshConversations(showLoading: false);
    }
  }

  Future<ChatUser> getMe() async {
    final username = (await StorageService.getUsername()) ?? '';
    final email = (await StorageService.getUserEmail()) ?? '';
    final first = await StorageService.getFirstName();
    final last = await StorageService.getLastName();
    // Backend websocket messages use numeric IDs, but our storage service doesn't store it.
    // We'll rely on username matching in UI for ownership decisions.
    return ChatUser(
      id: 0,
      username: username,
      email: email,
      firstName: first,
      lastName: last,
    );
  }

  Future<void> _ensureConnected() async {
    if (!_foreground) return;
    if (_wsConnected) return;
    try {
      await _service.connect();
      _wsConnected = true;
      _wsEverConnected = true;
      _reconnecting = false;
      _bindWs();
      notifyListeners();
    } catch (_) {
      _wsConnected = false;
      _scheduleReconnect();
      notifyListeners();
    }
  }

  void _bindWs() {
    _wsSub?.cancel();
    _wsSub = _service.events.listen((evt) async {
      final type = (evt['type'] ?? '').toString();
      if (type == 'ws_closed' || type == 'ws_error') {
        _wsConnected = false;
        _scheduleReconnect();
        notifyListeners();
        return;
      }
      if (type != 'message') return;
      final convId = (evt['conversation_id'] as num?)?.toInt() ?? 0;
      if (convId == 0) return;

      final msg = ChatMessage.fromJson(evt);
      if (_activeConversationId == convId) {
        _messages = List.of(_messages)..add(msg);
        notifyListeners();
      }
      // Refresh conversation list periodically for unread counts/preview ordering.
      // Keep it light: only when foregrounded.
      if (_foreground) {
        refreshConversations(showLoading: false);
      }
    });
  }

  void _scheduleReconnect() {
    if (!_foreground) return;
    if (_reconnectTimer != null) return;
    _reconnecting = true;
    _reconnectTimer = Timer(const Duration(seconds: 2), () async {
      _reconnectTimer = null;
      await _service.disconnect();
      _wsConnected = false;
      await _ensureConnected();
    });
  }

  void _startUnreadPolling() {
    _unreadPollTimer?.cancel();
    _unreadPollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (!_foreground) return;
      refreshConversations(showLoading: false);
    });
  }

  void _startThreadSync(int conversationId) {
    _threadSyncTimer?.cancel();
    _threadSyncTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!_foreground) return;
      if (_activeConversationId != conversationId) return;
      refreshMessages(conversationId: conversationId, showLoading: false);
      refreshConversations(showLoading: false);
    });
  }

  void _stopTimers() {
    _unreadPollTimer?.cancel();
    _unreadPollTimer = null;
    _threadSyncTimer?.cancel();
    _threadSyncTimer = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
  }

  @override
  void dispose() {
    _stopTimers();
    _wsSub?.cancel();
    _wsSub = null;
    _service.disconnect();
    super.dispose();
  }
}

