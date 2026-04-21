import 'dart:convert';

import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/google_oauth_config.dart';
import '../models/google_calendar_model.dart';
import 'storage_service.dart';

class GoogleCalendarService {
  GoogleCalendarService._();

  static const String _scopeCalendar = 'https://www.googleapis.com/auth/calendar';
  static const String _base = 'https://www.googleapis.com/calendar/v3';
  static const String companyHolidaySyncKey = 'hrms_gcal_company_holiday_map_v1';

  static GoogleSignIn? _gsi;

  static GoogleSignIn _ensureSignIn() {
    // Note: on Android/iOS, access tokens are issued for the signed-in account.
    // We still keep serverClientId consistent with your Google SSO setup.
    return _gsi ??= GoogleSignIn(
      scopes: const [_scopeCalendar, 'email', 'profile'],
      serverClientId: kGoogleServerClientId.isEmpty ? null : kGoogleServerClientId,
    );
  }

  static Future<bool> isConnected() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getString(_oauthTokenKey()) ?? '').isNotEmpty;
  }

  static String _oauthTokenKey() => 'google_calendar_oauth_${StorageServiceUsernameCache.username ?? 'anon'}';

  static Future<void> _cacheToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_oauthTokenKey(), token);
  }

  static Future<String?> _readCachedToken() async {
    final prefs = await SharedPreferences.getInstance();
    final t = prefs.getString(_oauthTokenKey());
    return (t != null && t.isNotEmpty) ? t : null;
  }

  static Future<void> disconnect() async {
    final gsi = _ensureSignIn();
    try {
      await gsi.disconnect();
    } catch (_) {
      // ignore
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_oauthTokenKey());
  }

  /// Interactive connect; returns access token if successful.
  static Future<String?> connect() async {
    final gsi = _ensureSignIn();
    final account = await gsi.signIn();
    if (account == null) return null;
    final auth = await account.authentication;
    final token = auth.accessToken;
    if (token == null || token.isEmpty) return null;
    await _cacheToken(token);
    return token;
  }

  /// Best-effort: refresh token by silent sign-in; falls back to cached token.
  static Future<String?> getAccessToken({bool interactiveIfNeeded = false}) async {
    // Ensure username is known for scoping storage key.
    StorageServiceUsernameCache.username ??= await StorageService.getUsername();

    final gsi = _ensureSignIn();
    try {
      final current = gsi.currentUser ?? await gsi.signInSilently();
      if (current != null) {
        final auth = await current.authentication;
        final token = auth.accessToken;
        if (token != null && token.isNotEmpty) {
          await _cacheToken(token);
          return token;
        }
      }
    } catch (_) {
      // ignore and fall back
    }

    final cached = await _readCachedToken();
    if (cached != null) return cached;
    if (!interactiveIfNeeded) return null;
    return connect();
  }

  static Map<String, String> _authHeaders(String accessToken) => {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      };

  static Future<List<GoogleCalendarEvent>> listPrimaryEvents({
    required DateTime timeMin,
    required DateTime timeMax,
    int maxResults = 500,
  }) async {
    final token = await getAccessToken(interactiveIfNeeded: false);
    if (token == null) {
      throw StateError('Google Calendar not connected');
    }

    final params = {
      'timeMin': timeMin.toUtc().toIso8601String(),
      'timeMax': timeMax.toUtc().toIso8601String(),
      'singleEvents': 'true',
      'orderBy': 'startTime',
      'maxResults': '$maxResults',
    };

    final uri = Uri.parse('$_base/calendars/primary/events').replace(
      queryParameters: params,
    );
    final res = await http.get(uri, headers: _authHeaders(token));
    if (res.statusCode == 401) {
      await disconnect();
      throw StateError('Session expired — connect Google Calendar again.');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError('Google Calendar request failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final items = data['items'];
    if (items is! List) return const [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(GoogleCalendarEvent.fromJson)
        .toList();
  }

  static Future<GoogleCalendarEvent> createEvent({
    required String title,
    required DateTime start,
    required DateTime end,
    required bool allDay,
    String? description,
    bool withMeet = false,
    List<String> guests = const [],
    Map<String, String> privateProps = const {},
    bool sendUpdatesToGuests = false,
  }) async {
    final token = await getAccessToken(interactiveIfNeeded: true);
    if (token == null) throw StateError('Google Calendar not connected');

    final body = <String, dynamic>{
      'summary': title,
      if (description != null && description.trim().isNotEmpty)
        'description': description.trim(),
      'extendedProperties': {
        'private': privateProps,
      },
    };

    if (allDay) {
      final date = start.toIso8601String().split('T').first;
      final endDate = end.toIso8601String().split('T').first;
      body['start'] = {'date': date};
      body['end'] = {'date': endDate};
    } else {
      body['start'] = {'dateTime': start.toUtc().toIso8601String()};
      body['end'] = {'dateTime': end.toUtc().toIso8601String()};
    }

    if (guests.isNotEmpty) {
      body['attendees'] = guests.map((e) => {'email': e}).toList();
    }

    if (withMeet) {
      body['conferenceData'] = {
        'createRequest': {
          'requestId': DateTime.now().millisecondsSinceEpoch.toString(),
          'conferenceSolutionKey': {'type': 'hangoutsMeet'},
        }
      };
    }

    final qp = <String, String>{};
    if (withMeet) qp['conferenceDataVersion'] = '1';
    if (sendUpdatesToGuests && guests.isNotEmpty) qp['sendUpdates'] = 'all';

    final uri = Uri.parse('$_base/calendars/primary/events').replace(
      queryParameters: qp.isEmpty ? null : qp,
    );
    final res = await http.post(
      uri,
      headers: _authHeaders(token),
      body: jsonEncode(body),
    );
    if (res.statusCode == 401) {
      await disconnect();
      throw StateError('Session expired — connect Google Calendar again.');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError('Create event failed (${res.statusCode})');
    }
    return GoogleCalendarEvent.fromJson(jsonDecode(res.body));
  }

  static Future<void> deleteEvent(String googleEventId) async {
    final token = await getAccessToken(interactiveIfNeeded: true);
    if (token == null) throw StateError('Google Calendar not connected');
    final uri = Uri.parse('$_base/calendars/primary/events/${Uri.encodeComponent(googleEventId)}');
    final res = await http.delete(uri, headers: _authHeaders(token));
    if (res.statusCode == 401) {
      await disconnect();
      throw StateError('Session expired — connect Google Calendar again.');
    }
    if (res.statusCode == 204 || res.statusCode == 200 || res.statusCode == 404) return;
    throw StateError('Delete failed (${res.statusCode})');
  }

  static Future<void> patchEvent(
    String googleEventId, {
    String? title,
    String? description,
  }) async {
    final token = await getAccessToken(interactiveIfNeeded: true);
    if (token == null) throw StateError('Google Calendar not connected');
    final body = <String, dynamic>{};
    if (title != null) body['summary'] = title;
    if (description != null) body['description'] = description;
    if (body.isEmpty) return;
    final uri = Uri.parse('$_base/calendars/primary/events/${Uri.encodeComponent(googleEventId)}');
    final res = await http.patch(uri, headers: _authHeaders(token), body: jsonEncode(body));
    if (res.statusCode == 401) {
      await disconnect();
      throw StateError('Session expired — connect Google Calendar again.');
    }
    if (res.statusCode == 200) return;
    throw StateError('Update failed (${res.statusCode})');
  }

  static String holidayMapKeyForUser(String username) =>
      '${companyHolidaySyncKey}_$username';

  static Future<Map<String, String>> readHolidayMap(String username) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(holidayMapKeyForUser(username));
    if (raw == null || raw.trim().isEmpty) return {};
    try {
      final data = jsonDecode(raw);
      if (data is! Map) return {};
      return data.map((k, v) => MapEntry(k.toString(), v.toString()));
    } catch (_) {
      return {};
    }
  }

  static Future<void> writeHolidayMap(
      String username, Map<String, String> map) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(holidayMapKeyForUser(username), jsonEncode(map));
  }
}

/// Tiny helper to avoid re-reading username many times in static service.
class StorageServiceUsernameCache {
  static String? username;
}

