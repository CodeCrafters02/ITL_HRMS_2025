import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import '../models/calendar_event_model.dart';
import 'auth_service.dart';
import 'storage_service.dart';

class OutlookCalendarService {
  OutlookCalendarService._();

  static const String companyHolidaySyncKey = 'hrms_outlook_company_holiday_map_v1';
  static final String _base = '${ApiConfig.baseUrl}/app/outlook/calendar/';

  static Future<Map<String, String>> _headers() async =>
      ApiConfig.getAuthHeaders(await StorageService.getAccessToken() ?? '');

  static String _err(http.Response r, String fallback) {
    try {
      final b = jsonDecode(r.body);
      if (b is Map && b['detail'] != null) return '${b['detail']}';
    } catch (_) {}
    return '$fallback (${r.statusCode})';
  }

  /// Opens the Microsoft sign-in again so the Calendars permission can be granted.
  static Future<bool> connect() async => (await AuthService.loginWithMicrosoft()).success;

  /// Events of the signed-in Microsoft account; `null` when calendar permission is missing.
  static Future<List<OutlookCalendarEvent>?> listEvents({required DateTime timeMin, required DateTime timeMax}) async {
    final uri = Uri.parse(_base).replace(queryParameters: {
      'start': timeMin.toUtc().toIso8601String(),
      'end': timeMax.toUtc().toIso8601String(),
    });
    final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 30));
    if (res.statusCode == 404) throw StateError('Outlook calendar is not available on the server yet. Ask admin to deploy the latest backend.');
    final body = jsonDecode(res.body);
    if (res.statusCode == 409 || (body is Map && body['connected'] == false)) return null;
    if (res.statusCode != 200 || body is! Map) throw StateError(_err(res, 'Outlook calendar request failed'));
    return ((body['events'] as List?) ?? []).whereType<Map<String, dynamic>>().map(OutlookCalendarEvent.fromJson).toList();
  }

  static Future<OutlookCalendarEvent> createEvent({
    required String title,
    required DateTime start,
    required DateTime end,
    required bool allDay,
    String? description,
    bool withMeet = false,
    List<String> guests = const [],
  }) async {
    String d(DateTime v) => v.toIso8601String().split('T').first;
    final res = await http.post(
      Uri.parse(_base),
      headers: await _headers(),
      body: jsonEncode({
        'title': title,
        'description': description?.trim() ?? '',
        'all_day': allDay,
        'start': allDay ? d(start) : start.toUtc().toIso8601String(),
        'end': allDay ? d(end) : end.toUtc().toIso8601String(),
        'online_meeting': withMeet,
        'guests': guests,
      }),
    );
    if (res.statusCode != 201) throw StateError(_err(res, 'Create event failed'));
    return OutlookCalendarEvent.fromJson(jsonDecode(res.body));
  }

  static Future<void> deleteEvent(String id) async {
    final res = await http.delete(Uri.parse('$_base${Uri.encodeComponent(id)}/'), headers: await _headers());
    if (res.statusCode != 204 && res.statusCode != 404) throw StateError(_err(res, 'Delete failed'));
  }

  static Future<void> patchEvent(String id, {String? title, String? description}) async {
    final body = {if (title != null) 'title': title, if (description != null) 'description': description};
    if (body.isEmpty) return;
    final res = await http.patch(Uri.parse('$_base${Uri.encodeComponent(id)}/'), headers: await _headers(), body: jsonEncode(body));
    if (res.statusCode != 200) throw StateError(_err(res, 'Update failed'));
  }

  static String _holidayKey(String username) => '${companyHolidaySyncKey}_$username';

  static Future<Map<String, String>> readHolidayMap(String username) async {
    final raw = (await SharedPreferences.getInstance()).getString(_holidayKey(username));
    if (raw == null || raw.trim().isEmpty) return {};
    try {
      return (jsonDecode(raw) as Map).map((k, v) => MapEntry('$k', '$v'));
    } catch (_) {
      return {};
    }
  }

  static Future<void> writeHolidayMap(String username, Map<String, String> map) async =>
      (await SharedPreferences.getInstance()).setString(_holidayKey(username), jsonEncode(map));
}
