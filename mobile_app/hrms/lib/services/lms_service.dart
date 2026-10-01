import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user_model.dart';
import 'auth_service.dart';
import 'http_client_service.dart';
import 'storage_service.dart';

typedef Json = Map<String, dynamic>;

/// Paginated list result mirroring the backend `Pagination` envelope.
class LmsPage {
  const LmsPage(this.items, {this.count = 0, this.totalPages = 1});
  final List<Json> items;
  final int count;
  final int totalPages;
}

/// Learning Management endpoints — same contract the web employee LMS uses.
class LmsService {
  static String get _b => '${ApiConfig.baseUrl}/employee';

  static int? _myEmployeeId;
  static String? _myEmployeeUser;

  /// Absolute media URL (backend usually returns absolute, but guard relative paths).
  static String? mediaUrl(dynamic raw) {
    final s = raw?.toString().trim();
    if (s == null || s.isEmpty) return null;
    if (s.startsWith('http')) return s;
    return '${ApiConfig.baseUrl}${s.startsWith('/') ? '' : '/'}$s';
  }

  static num n(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;

  static String _qs(Map<String, Object?> p) {
    final q = p.entries
        .where((e) => e.value != null && '${e.value}'.isNotEmpty)
        .map((e) => '${e.key}=${Uri.encodeQueryComponent('${e.value}')}')
        .join('&');
    return q.isEmpty ? '' : '?$q';
  }

  static List<Json> _list(dynamic d) {
    final raw = d is Map ? d['results'] : d;
    return raw is List ? raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList() : <Json>[];
  }

  static String _err(http.Response r, String fallback) {
    try {
      final d = jsonDecode(r.body);
      if (d is Map) {
        for (final k in ['detail', 'course', 'non_field_errors', 'error', 'message']) {
          final v = d[k];
          if (v is List && v.isNotEmpty) return '${v.first}';
          if (v is String && v.isNotEmpty) return v;
        }
      }
      if (d is List && d.isNotEmpty) return '${d.first}';
    } catch (_) {}
    return fallback;
  }

  static String _netErr(Object e) {
    final s = e.toString();
    if (s.contains('SocketException') || s.contains('TimeoutException')) {
      return 'Connection error. Please check your internet connection.';
    }
    return 'Something went wrong. Please try again.';
  }

  static Future<ApiResponse<LmsPage>> _getPage(String path, [Map<String, Object?> q = const {}]) async {
    try {
      final r = await HttpClientService.get('$_b$path${_qs(q)}');
      if (r.statusCode != 200) return ApiResponse(success: false, message: _err(r, 'Failed to load data'));
      final d = jsonDecode(r.body);
      return ApiResponse(
        success: true,
        data: LmsPage(
          _list(d),
          count: d is Map ? n(d['count']).toInt() : _list(d).length,
          totalPages: d is Map ? n(d['total_pages']).toInt().clamp(1, 1 << 20) : 1,
        ),
      );
    } catch (e) {
      return ApiResponse(success: false, message: _netErr(e));
    }
  }

  static Future<ApiResponse<List<Json>>> _getList(String path, [Map<String, Object?> q = const {}]) async {
    final r = await _getPage(path, {'limit': 100, ...q});
    return ApiResponse(success: r.success, message: r.message, data: r.data?.items);
  }

  static Future<ApiResponse<Json>> _send(String method, String path, [Object? body]) async {
    try {
      final url = '$_b$path';
      final r = switch (method) {
        'POST' => await HttpClientService.post(url, body: body ?? const {}),
        'PATCH' => await HttpClientService.patch(url, body: body ?? const {}),
        _ => await HttpClientService.delete(url),
      };
      if (r.statusCode >= 200 && r.statusCode < 300) {
        final d = r.body.isEmpty ? null : jsonDecode(r.body);
        return ApiResponse(success: true, data: d is Map ? d.cast<String, dynamic>() : <String, dynamic>{});
      }
      return ApiResponse(success: false, message: _err(r, 'Request failed (${r.statusCode})'));
    } catch (e) {
      return ApiResponse(success: false, message: _netErr(e));
    }
  }

  /// Logged-in user's employee PK — scopes "my" data even for admin/manager roles.
  static Future<int?> myEmployeeId() async {
    final user = await StorageService.getUsername();
    if (_myEmployeeId != null && _myEmployeeUser == user) return _myEmployeeId;
    _myEmployeeId = null;
    try {
      final r = await HttpClientService.get(ApiConfig.employeeIdUrl);
      if (r.statusCode == 200) {
        final d = jsonDecode(r.body);
        _myEmployeeId = d is Map ? (d['id'] as num?)?.toInt() : null;
        _myEmployeeUser = user;
      }
    } catch (_) {}
    return _myEmployeeId;
  }

  /// Server-side `employee` filter plus a client-side guard (admin/manager roles see everyone's rows).
  static Future<ApiResponse<List<Json>>> _mine(String path, [Map<String, Object?> q = const {}, bool serverFilter = true]) async {
    final me = await myEmployeeId();
    final r = await _getList(path, {if (serverFilter) 'employee': me, ...q});
    if (!r.success || me == null) return r;
    return ApiResponse(success: true, data: r.data!.where((x) => x['employee'] == null || n(x['employee']).toInt() == me).toList());
  }

  // ---- Dashboard / My learning ----
  static Future<ApiResponse<List<Json>>> myEnrollments({String? search}) async =>
      _getList('/enrollments/', {'employee': await myEmployeeId(), 'search': search});

  static Future<ApiResponse<List<Json>>> myCompliance() => _mine('/compliance-assignments/');


  static Future<ApiResponse<List<Json>>> myCertificates({int? course}) =>
      _getList('/certificates/', {'mine': 'true', 'course': course});

  static Future<ApiResponse<List<Json>>> myWishlist() => _getList('/course-wishlists/');
  static Future<ApiResponse<List<Json>>> myLearningPaths() => _mine('/learning-path-assignments/', const {}, false);


  static Future<ApiResponse<List<Json>>> trainingSessions() => _getList('/training-sessions/');

  static Future<ApiResponse<Json>> enroll(int courseId) => _send('POST', '/enrollments/', {'course': courseId});
  static Future<ApiResponse<Json>> addWishlist(int courseId) => _send('POST', '/course-wishlists/', {'course': courseId});
  static Future<ApiResponse<Json>> removeWishlist(int id) => _send('DELETE', '/course-wishlists/$id/');

  // ---- Catalog ----
  static Future<ApiResponse<List<Json>>> categories() => _getList('/course-categories/');

  static Future<ApiResponse<LmsPage>> courses({
    int page = 1,
    int limit = 10,
    String? search,
    String? difficulty,
    int? category,
  }) =>
      _getPage('/courses/', {
        'page': page,
        'limit': limit,
        'status': 'published',
        'search': search,
        'difficulty_level': difficulty,
        'category': category,
      });

  // ---- Training requests ----
  static Future<ApiResponse<List<Json>>> myTrainingRequests({String? status}) =>
      _mine('/training-requests/', {'status': status});


  static Future<ApiResponse<Json>> requestTraining({
    int? course,
    String customTitle = '',
    String reason = '',
    bool budgetRequired = false,
  }) =>
      _send('POST', '/training-requests/', {
        'course': course,
        'custom_course_title': customTitle,
        'reason': reason.isEmpty ? 'Self-enrollment request from course catalog' : reason,
        'budget_required': budgetRequired,
      });

  // ---- Course player ----
  static Future<ApiResponse<Json>> enrollment(int id) async {
    try {
      final r = await HttpClientService.get('$_b/enrollments/$id/');
      if (r.statusCode != 200) return ApiResponse(success: false, message: _err(r, 'Course not found'));
      return ApiResponse(success: true, data: (jsonDecode(r.body) as Map).cast<String, dynamic>());
    } catch (e) {
      return ApiResponse(success: false, message: _netErr(e));
    }
  }

  static Future<ApiResponse<List<Json>>> contents(int courseId) async {
    final r = await _getList('/course-contents/', {'course_id': courseId});
    r.data?.sort((a, b) => n(a['sequence']).compareTo(n(b['sequence'])));
    return r;
  }

  static Future<ApiResponse<List<Json>>> progress(int enrollmentId) =>
      _getList('/lesson-progresses/', {'enrollment': enrollmentId});

  static Future<ApiResponse<Json>> markComplete(int enrollmentId, int contentId) =>
      _send('POST', '/lesson-progresses/', {'enrollment': enrollmentId, 'content': contentId});

  static Future<ApiResponse<List<Json>>> assessments(int courseId) => _getList('/assessments/', {'course': courseId});
  static Future<ApiResponse<List<Json>>> questions(int assessmentId) =>
      _getList('/assessment-questions/', {'assessment_id': assessmentId});

  static Future<ApiResponse<List<Json>>> myAttempts() => _mine('/assessment-attempts/');


  static Future<ApiResponse<Json>> submitAttempt({
    required int assessment,
    required int enrollment,
    required int score,
    required bool passed,
  }) =>
      _send('POST', '/assessment-attempts/', {
        'assessment': assessment,
        'enrollment': enrollment,
        'score': score,
        'is_passed': passed,
      });

  static Future<ApiResponse<List<Json>>> assignments(int courseId) => _getList('/assignments/', {'course': courseId});

  static Future<ApiResponse<List<Json>>> mySubmissions() => _mine('/assignment-submissions/');


  /// Multipart upload — POST new submission or PATCH an existing one.
  static Future<ApiResponse<Json>> submitAssignment({
    required int assignment,
    required String filePath,
    int? existingId,
  }) async {
    Future<http.StreamedResponse> send() async {
      final token = await StorageService.getAccessToken();
      final req = http.MultipartRequest(
        existingId == null ? 'POST' : 'PATCH',
        Uri.parse(existingId == null ? '$_b/assignment-submissions/' : '$_b/assignment-submissions/$existingId/'),
      )
        ..headers['Authorization'] = 'Bearer ${token ?? ''}'
        ..fields['assignment'] = '$assignment'
        ..files.add(await http.MultipartFile.fromPath('submitted_file', filePath));
      return req.send();
    }

    try {
      var s = await send();
      if (s.statusCode == 401 && (await AuthService.refreshToken()).success) s = await send();
      final r = await http.Response.fromStream(s);
      if (r.statusCode >= 200 && r.statusCode < 300) {
        return ApiResponse(success: true, data: (jsonDecode(r.body) as Map).cast<String, dynamic>());
      }
      return ApiResponse(success: false, message: _err(r, 'File upload failed'));
    } catch (e) {
      return ApiResponse(success: false, message: _netErr(e));
    }
  }

  static Future<ApiResponse<List<Json>>> myReviews({int? courseId}) =>
      _mine('/course-reviews/', {'course_id': courseId}, false);


  static Future<ApiResponse<Json>> submitReview(int courseId, int rating, String text) =>
      _send('POST', '/course-reviews/', {'course': courseId, 'rating': rating, 'review_text': text});
}
