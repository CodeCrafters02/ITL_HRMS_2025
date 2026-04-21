import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as ws_status;

import '../config/api_config.dart';
import '../models/chat_conversation_model.dart';
import '../models/chat_message_model.dart';
import '../models/chat_user_model.dart';
import 'auth_service.dart';
import 'http_client_service.dart';
import 'storage_service.dart';

class ChatServiceException implements Exception {
  final String message;
  final int? statusCode;
  ChatServiceException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ChatService {
  WebSocketChannel? _channel;
  StreamSubscription? _sub;

  final StreamController<Map<String, dynamic>> _eventsController =
      StreamController.broadcast();

  Stream<Map<String, dynamic>> get events => _eventsController.stream;

  bool get isConnected => _channel != null;

  Future<void> connect() async {
    if (_channel != null) return;

    final ok = await AuthService.ensureValidToken();
    if (!ok) throw ChatServiceException('Session expired. Please login again.');

    final token = await StorageService.getAccessToken();
    if (token == null || token.isEmpty) {
      throw ChatServiceException('Missing access token.');
    }

    try {
      final uri = ApiConfig.chatWsUri(token: token);
      final socket = await WebSocket.connect(uri.toString());
      final channel = IOWebSocketChannel(socket);
      _channel = channel;
      _sub = channel.stream.listen(
        (data) {
          try {
            final decoded = jsonDecode(data.toString());
            if (decoded is Map<String, dynamic>) {
              _eventsController.add(decoded);
            }
          } catch (_) {
            // ignore parse errors
          }
        },
        onError: (err) {
          _eventsController.add({'type': 'ws_error', 'detail': err.toString()});
        },
        onDone: () {
          _eventsController.add({'type': 'ws_closed'});
        },
        cancelOnError: false,
      );
    } catch (e) {
      await disconnect();
      throw ChatServiceException('Unable to connect to chat.');
    }
  }

  Future<void> disconnect() async {
    try {
      await _sub?.cancel();
    } catch (_) {}
    _sub = null;

    try {
      await _channel?.sink.close(ws_status.goingAway);
    } catch (_) {}
    _channel = null;
  }

  void joinConversation(int conversationId) {
    final ch = _channel;
    if (ch == null) return;
    ch.sink.add(jsonEncode({'type': 'join', 'conversation_id': conversationId}));
  }

  void leaveConversation(int conversationId) {
    final ch = _channel;
    if (ch == null) return;
    ch.sink
        .add(jsonEncode({'type': 'leave', 'conversation_id': conversationId}));
  }

  void sendMessageWs({
    required int conversationId,
    required String content,
  }) {
    final ch = _channel;
    if (ch == null) {
      throw ChatServiceException('Chat is not connected.');
    }
    final text = content.trim();
    if (text.isEmpty) return;
    ch.sink.add(jsonEncode(
        {'type': 'message', 'conversation_id': conversationId, 'content': text}));
  }

  Future<List<ChatConversation>> fetchConversations() async {
    final resp = await HttpClientService.get(ApiConfig.chatConversationsUrl);
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(_extractDetail(body) ?? 'Failed to load chat.',
          statusCode: resp.statusCode);
    }

    final list = _extractResultsList(body);
    return list
        .whereType<Map>()
        .map((e) => ChatConversation.fromJson(e.cast<String, dynamic>()))
        .where((c) => c.id != 0)
        .toList();
  }

  Future<List<ChatUser>> searchUsers(String q) async {
    final uri = Uri.parse(ApiConfig.chatUsersUrl)
        .replace(queryParameters: q.trim().isEmpty ? null : {'q': q.trim()});
    final resp = await HttpClientService.get(uri.toString());
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to search users.',
          statusCode: resp.statusCode);
    }
    final results = (body is Map && body['results'] is List)
        ? (body['results'] as List)
        : <dynamic>[];
    return results
        .whereType<Map>()
        .map((e) => ChatUser.fromJson(e.cast<String, dynamic>()))
        .where((u) => u.id != 0)
        .toList();
  }

  Future<ChatConversation> createDm(int userId) async {
    final resp = await HttpClientService.post(
      ApiConfig.chatConversationsDmUrl,
      body: {'user_id': userId},
    );
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to start chat.',
          statusCode: resp.statusCode);
    }
    if (body is! Map<String, dynamic>) {
      throw ChatServiceException('Invalid server response.');
    }
    return ChatConversation.fromJson(body);
  }

  Future<ChatConversation> createGroup({
    required String name,
    required List<int> memberIds,
  }) async {
    final resp = await HttpClientService.post(
      ApiConfig.chatConversationsUrl,
      body: {
        'type': 'group',
        'name': name.trim(),
        if (memberIds.isNotEmpty) 'member_ids': memberIds,
      },
    );
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to create group.',
          statusCode: resp.statusCode);
    }
    if (body is! Map<String, dynamic>) {
      throw ChatServiceException('Invalid server response.');
    }
    return ChatConversation.fromJson(body);
  }

  Future<List<ChatMessage>> fetchMessages({
    required int conversationId,
    int pageSize = 100,
  }) async {
    final uri = Uri.parse(ApiConfig.chatMessagesUrl).replace(queryParameters: {
      'conversation': conversationId.toString(),
      'page_size': pageSize.toString(),
    });
    final resp = await HttpClientService.get(uri.toString());
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to load messages.',
          statusCode: resp.statusCode);
    }
    final list = _extractResultsList(body);
    final msgs = list
        .whereType<Map>()
        .map((e) => ChatMessage.fromJson(e.cast<String, dynamic>()))
        .where((m) => m.id != 0)
        .toList();
    // API returns newest-first; reverse for display.
    return msgs.reversed.toList();
  }

  Future<ChatMessage> sendMessageRest({
    required int conversationId,
    required String content,
  }) async {
    final text = content.trim();
    final resp = await HttpClientService.post(
      ApiConfig.chatMessagesUrl,
      body: {'conversation': conversationId, 'content': text},
    );
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(_extractDetail(body) ?? 'Failed to send.',
          statusCode: resp.statusCode);
    }
    if (body is! Map<String, dynamic>) {
      throw ChatServiceException('Invalid server response.');
    }
    return ChatMessage.fromJson(body);
  }

  Future<ChatMessage> sendAttachment({
    required int conversationId,
    required String content,
    required File file,
  }) async {
    final ok = await AuthService.ensureValidToken();
    if (!ok) throw ChatServiceException('Session expired. Please login again.');
    final token = await StorageService.getAccessToken();
    if (token == null || token.isEmpty) {
      throw ChatServiceException('Missing access token.');
    }

    final req = http.MultipartRequest(
      'POST',
      Uri.parse(ApiConfig.chatMessagesUrl),
    );
    req.headers['Authorization'] = 'Bearer $token';
    req.fields['conversation'] = conversationId.toString();
    req.fields['conversation_id'] = conversationId.toString();
    req.fields['content'] = content.trim();
    req.files.add(await http.MultipartFile.fromPath('attachment', file.path));

    final streamed = await req.send();
    final resp = await http.Response.fromStream(streamed);
    final body = _decodeJson(resp);

    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to send attachment.',
          statusCode: resp.statusCode);
    }
    if (body is! Map<String, dynamic>) {
      throw ChatServiceException('Invalid server response.');
    }
    return ChatMessage.fromJson(body);
  }

  Future<void> addMembers({
    required int conversationId,
    required List<int> memberIds,
  }) async {
    final url =
        '${ApiConfig.chatConversationsUrl}$conversationId/members/add/';
    final resp = await HttpClientService.post(url, body: {'member_ids': memberIds});
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(_extractDetail(body) ?? 'Failed to add members.',
          statusCode: resp.statusCode);
    }
  }

  Future<void> removeMember({
    required int conversationId,
    required int userId,
  }) async {
    final url =
        '${ApiConfig.chatConversationsUrl}$conversationId/members/remove/';
    final resp = await HttpClientService.post(url, body: {'user_id': userId});
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to remove member.',
          statusCode: resp.statusCode);
    }
  }

  Future<void> updateMemberRole({
    required int conversationId,
    required int userId,
    required String role,
  }) async {
    final url =
        '${ApiConfig.chatConversationsUrl}$conversationId/members/permissions/';
    final resp = await HttpClientService.patch(
      url,
      body: {'user_id': userId, 'role': role},
    );
    final body = _decodeJson(resp);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ChatServiceException(
          _extractDetail(body) ?? 'Failed to update permissions.',
          statusCode: resp.statusCode);
    }
  }

  dynamic _decodeJson(http.Response resp) {
    final text = resp.body;
    if (text.isEmpty) return null;
    try {
      return jsonDecode(text);
    } catch (_) {
      return text;
    }
  }

  List _extractResultsList(dynamic body) {
    if (body is Map && body['results'] is List) return body['results'] as List;
    if (body is List) return body;
    return const [];
  }

  String? _extractDetail(dynamic body) {
    if (body is Map) {
      final d = body['detail'];
      if (d != null) return d.toString();
      // DRF field errors
      if (body.isNotEmpty) {
        final first = body.entries.first;
        final v = first.value;
        if (v is List && v.isNotEmpty) return v.first.toString();
        if (v != null) return v.toString();
      }
    }
    return null;
  }
}

