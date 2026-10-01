import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user_model.dart';
import 'http_client_service.dart';
import 'lms_service.dart' show Json, LmsService;

/// Performance Management endpoints — same contract the web employee
/// `/employee/performance/*` pages use.
class PmsService {
  static String get _b => '${ApiConfig.baseUrl}/employee';

  static num n(dynamic v) => LmsService.n(v);

  static List<Json> list(dynamic d) {
    final raw = d is Map ? (d['results'] ?? d['targets']) : d;
    return raw is List ? raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList() : <Json>[];
  }

  static String _err(http.Response r, String fallback) {
    try {
      final d = jsonDecode(r.body);
      if (d is Map) {
        for (final v in d.values) {
          if (v is String && v.isNotEmpty) return v;
          if (v is List && v.isNotEmpty) return '${v.first}';
        }
      }
    } catch (_) {}
    return fallback;
  }

  static String _netErr(Object e) {
    final s = e.toString();
    return s.contains('SocketException') || s.contains('TimeoutException')
        ? 'Connection error. Please check your internet connection.'
        : 'Something went wrong. Please try again.';
  }

  static Future<ApiResponse<dynamic>> _get(String path) async {
    try {
      final r = await HttpClientService.get('$_b$path');
      if (r.statusCode != 200) return ApiResponse(success: false, message: _err(r, 'Failed to load data'));
      return ApiResponse(success: true, data: jsonDecode(r.body));
    } catch (e) {
      return ApiResponse(success: false, message: _netErr(e));
    }
  }

  static Future<ApiResponse<List<Json>>> _list(String path) async {
    final r = await _get(path);
    return ApiResponse(success: r.success, message: r.message, data: r.success ? list(r.data) : null);
  }

  static Future<ApiResponse<dynamic>> _send(String method, String path, [Object? body]) async {
    try {
      final url = '$_b$path';
      final r = switch (method) {
        'POST' => await HttpClientService.post(url, body: body ?? const {}),
        'PATCH' => await HttpClientService.patch(url, body: body ?? const {}),
        _ => await HttpClientService.delete(url),
      };
      if (r.statusCode >= 200 && r.statusCode < 300) {
        return ApiResponse(success: true, data: r.body.isEmpty ? null : jsonDecode(r.body));
      }
      return ApiResponse(success: false, message: _err(r, 'Request failed (${r.statusCode})'));
    } catch (e) {
      return ApiResponse(success: false, message: _netErr(e));
    }
  }

  static Future<int?> myEmployeeId() => LmsService.myEmployeeId();

  // ---- Dashboard ----
  static Future<ApiResponse<Json>> profile({String? start, String? end}) async {
    final id = await myEmployeeId();
    if (id == null) return ApiResponse(success: false, message: 'Employee profile not found');
    final q = [if ((start ?? '').isNotEmpty) 'start_date=$start', if ((end ?? '').isNotEmpty) 'end_date=$end'].join('&');
    final r = await _get('/performance-profile/$id/${q.isEmpty ? '' : '?$q'}');
    return ApiResponse(success: r.success, message: r.message, data: r.data is Map ? (r.data as Map).cast<String, dynamic>() : null);
  }

  // ---- KRAs ----
  static Future<ApiResponse<List<Json>>> myKras() async => _list('/employee-kra/?employee_id=${await myEmployeeId()}');
  static Future<ApiResponse<List<Json>>> kpis() => _list('/kpi-master/');
  static Future<ApiResponse<List<Json>>> kraMasters() => _list('/kra-master/');
  static Future<ApiResponse<List<Json>>> kraEvaluations() async => _list('/kra-evaluations/?employee_id=${await myEmployeeId()}');
  static Future<ApiResponse<List<Json>>> krasToReview() async => _list('/employee-kra/?reviewer_id=${await myEmployeeId()}');

  static Future<ApiResponse<dynamic>> mapKra({required int masterId, required int weightage, required String target}) async =>
      _send('POST', '/employee-kra/', {
        'employee': await myEmployeeId(),
        'kra_master': masterId,
        'weightage': weightage,
        'target_description': target,
      });

  static Future<ApiResponse<dynamic>> unmapKra(int id) => _send('DELETE', '/employee-kra/$id/');

  static Future<ApiResponse<dynamic>> evaluateKra(int employeeKraId, double score, String remarks) =>
      _send('POST', '/kra-evaluations/', {'employee_kra': employeeKraId, 'score': score, 'remarks': remarks});

  // ---- Feedback ----
  static Future<ApiResponse<List<Json>>> cycles() => _list('/appraisal-cycles/');
  static Future<ApiResponse<List<Json>>> myEvaluations({int? cycle}) =>
      _list('/appraisal-evaluations/?mine=true${cycle == null ? '' : '&cycle=$cycle'}');
  static Future<ApiResponse<List<Json>>> directFeedbackReceived() => _list('/continuous-feedback/?mine=true');
  static Future<ApiResponse<dynamic>> acknowledge(int id) => _send('PATCH', '/continuous-feedback/$id/', {'acknowledged': true});
  static Future<ApiResponse<List<Json>>> myReportees() => _list('/continuous-feedback/my_reportees/');
  static Future<ApiResponse<List<Json>>> feedbackFor(int receiver) => _list('/continuous-feedback/?receiver=$receiver');

  static Future<ApiResponse<dynamic>> giveFeedback({
    required int receiver,
    required String text,
    required String category,
    required int rating,
    required String visibility,
  }) =>
      _send('POST', '/continuous-feedback/', {
        'receiver': receiver,
        'feedback_text': text,
        'category': category,
        'rating': rating,
        'visibility': visibility,
      });

  // ---- Appraisal ----
  static Future<ApiResponse<Json>> feedbackTargets(int cycle) async {
    final r = await _get('/appraisal-evaluations/my_feedback_targets/?cycle=$cycle');
    return ApiResponse(success: r.success, message: r.message, data: r.data is Map ? (r.data as Map).cast<String, dynamic>() : null);
  }

  static Future<ApiResponse<List<Json>>> questions(int cycle, String role) => _list('/appraisal-questions/?cycle=$cycle&role_type=$role');

  static Future<ApiResponse<dynamic>> submitAppraisal({
    required int target,
    required int cycle,
    required String role,
    required Map<int, num> answers,
  }) =>
      _send('POST', '/appraisal-evaluations/submit_feedback/', {
        'target_employee_id': target,
        'cycle_id': cycle,
        'role_type': role,
        'answers': answers.entries.map((e) => {'question_id': e.key, 'rating_score': e.value}).toList(),
      });

  static Future<ApiResponse<List<Json>>> myExtensions() async => _list('/appraisal-extensions/?employee=${await myEmployeeId()}');

  static Future<ApiResponse<dynamic>> requestExtension({
    required int cycle,
    required DateTime original,
    required DateTime extended,
    required String reason,
  }) async {
    final me = await myEmployeeId();
    return _send('POST', '/appraisal-extensions/', {
      'cycle': cycle,
      'employee': me,
      'requester': me,
      'original_deadline': original.toUtc().toIso8601String(),
      'extended_deadline': extended.toUtc().toIso8601String(),
      'reason': reason,
      'status': 'pending',
    });
  }

  static Future<ApiResponse<List<Json>>> myCertificates() => _list('/certificates/?mine=true&limit=100');
}
