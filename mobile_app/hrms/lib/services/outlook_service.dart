import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'storage_service.dart';

class OutlookMessage {
  OutlookMessage.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        subject = j['subject'] ?? '(No subject)',
        fromName = j['from_name'] ?? '',
        receivedAt = DateTime.tryParse(j['received_at'] ?? '')?.toLocal(),
        isRead = j['is_read'] ?? true,
        preview = j['preview'] ?? '',
        webLink = j['web_link'],
        hasAttachments = j['has_attachments'] ?? false,
        isImportant = j['importance'] == 'high';

  final String id, subject, fromName, preview;
  final String? webLink;
  final DateTime? receivedAt;
  final bool isRead, hasAttachments, isImportant;
}

class OutlookInbox {
  OutlookInbox.fromJson(Map<String, dynamic> j)
      : connected = j['connected'] == true,
        unreadCount = j['unread_count'] ?? 0,
        inboxUrl = j['inbox_url'] ?? 'https://outlook.office.com/mail/inbox',
        messages = ((j['messages'] as List?) ?? []).map((m) => OutlookMessage.fromJson(m)).toList();

  final bool connected;
  final int unreadCount;
  final String inboxUrl;
  final List<OutlookMessage> messages;
}

/// Shared Outlook inbox state (header badge, dashboard card and inbox page read the same notifier).
class OutlookService {
  static final inbox = ValueNotifier<OutlookInbox?>(null);
  static final error = ValueNotifier<String?>(null);
  static Future<void>? _inFlight;
  static DateTime _lastFetch = DateTime.fromMillisecondsSinceEpoch(0);

  static Future<void> refresh({bool force = false}) {
    if (_inFlight != null) return _inFlight!;
    if (!force && inbox.value != null && DateTime.now().difference(_lastFetch).inSeconds < 60) {
      return Future.value();
    }
    return _inFlight = _fetch().whenComplete(() => _inFlight = null);
  }

  static Future<void> _fetch() async {
    try {
      final token = await StorageService.getAccessToken();
      final res = await http
          .get(Uri.parse('${ApiConfig.baseUrl}/app/outlook/mail/?top=20'), headers: ApiConfig.getAuthHeaders(token ?? ''))
          .timeout(const Duration(seconds: 20));
      final body = jsonDecode(res.body);
      if (res.statusCode != 200 || body is! Map<String, dynamic>) {
        error.value = body is Map && body['detail'] != null ? '${body['detail']}' : 'Could not load Outlook mail';
        return;
      }
      _lastFetch = DateTime.now();
      error.value = null;
      inbox.value = OutlookInbox.fromJson(body);
    } catch (_) {
      error.value = 'Could not load Outlook mail';
    }
  }

  static String formatTime(DateTime? d) {
    if (d == null) return '';
    final now = DateTime.now();
    String two(int n) => n.toString().padLeft(2, '0');
    if (d.year == now.year && d.month == now.month && d.day == now.day) return '${two(d.hour)}:${two(d.minute)}';
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day} ${m[d.month - 1]}';
  }
}
