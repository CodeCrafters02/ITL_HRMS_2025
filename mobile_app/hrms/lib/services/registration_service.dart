import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user_model.dart';

/// Self-registration from the mobile app — reviewed by company admins on the web.
class RegistrationService {
  /// Submits a registration request. Returns field errors (e.g. `email`) in [ApiResponse.message].
  static Future<ApiResponse<Map<String, dynamic>>> submit(Map<String, dynamic> body) async {
    try {
      final r = await http
          .post(Uri.parse(ApiConfig.registrationRequestsUrl), headers: ApiConfig.headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 20));
      final data = r.body.isEmpty ? null : jsonDecode(r.body);
      if (r.statusCode == 201 || r.statusCode == 200) {
        return ApiResponse(success: true, data: (data as Map).cast<String, dynamic>(), message: '${data['detail'] ?? ''}');
      }
      return ApiResponse(success: false, message: _firstError(data) ?? 'Registration failed (${r.statusCode})');
    } catch (e) {
      return ApiResponse(success: false, message: 'Could not reach the server. Check your connection and try again.');
    }
  }

  /// `pending`, `approved` or `not_found` (+ `company_name` once approved).
  static Future<ApiResponse<Map<String, dynamic>>> status(String email) async {
    try {
      final uri = Uri.parse('${ApiConfig.registrationRequestsUrl}status/').replace(queryParameters: {'email': email.trim()});
      final r = await http.get(uri, headers: ApiConfig.headers).timeout(const Duration(seconds: 20));
      if (r.statusCode != 200) return ApiResponse(success: false, message: 'Could not check status (${r.statusCode})');
      return ApiResponse(success: true, data: (jsonDecode(r.body) as Map).cast<String, dynamic>());
    } catch (_) {
      return ApiResponse(success: false, message: 'Could not reach the server. Check your connection and try again.');
    }
  }

  static String? _firstError(dynamic d) {
    if (d is Map) {
      if (d['detail'] != null) return '${d['detail']}';
      for (final e in d.entries) {
        final v = e.value;
        final msg = v is List && v.isNotEmpty ? '${v.first}' : (v is String ? v : null);
        if (msg != null) return e.key == 'non_field_errors' ? msg : '${_label(e.key)}: $msg';
      }
    }
    return null;
  }

  static String _label(String k) => k.split('_').map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1)).join(' ');
}
