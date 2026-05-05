import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config/api_config.dart';
import '../models/reimbursement_model.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';

class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;
  ApiResponse({required this.success, this.message, this.data});
}

class ReimbursementService {
  static Future<http.Response> _makeAuthenticatedRequest(
    Future<http.Response> Function() request, {
    int retryCount = 0,
  }) async {
    try {
      final response = await request();
      if (response.statusCode == 401 && retryCount == 0) {
        final refreshResponse = await AuthService.refreshToken();
        if (refreshResponse.success) {
          return _makeAuthenticatedRequest(request, retryCount: retryCount + 1);
        }
      }
      return response;
    } catch (e) {
      rethrow;
    }
  }

  static Future<Map<String, String>> _getAuthHeaders() async {
    final token = await StorageService.getAccessToken();
    return ApiConfig.getAuthHeaders(token ?? '');
  }

  /// Get reimbursement categories
  static Future<ApiResponse<List<ReimbursementCategory>>> getCategories() async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.get(
          Uri.parse(ApiConfig.reimbursementCategoriesUrl),
          headers: await _getAuthHeaders(),
        ),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> results = data is Map && data.containsKey('results')
            ? data['results']
            : data is List
                ? data
                : [];
        return ApiResponse(
          success: true,
          data: results.map((j) => ReimbursementCategory.fromJson(j)).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to load categories');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Get my reimbursement requests
  static Future<ApiResponse<List<ReimbursementRequest>>> getMyReimbursements({
    String? status,
  }) async {
    try {
      final qp = <String, String>{};
      if (status != null && status.isNotEmpty) qp['status'] = status;
      final uri = Uri.parse(ApiConfig.reimbursementRequestsUrl)
          .replace(queryParameters: qp.isEmpty ? null : qp);

      final response = await _makeAuthenticatedRequest(
        () async => await http.get(uri, headers: await _getAuthHeaders()),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> results = data is Map && data.containsKey('results')
            ? data['results']
            : data is List
                ? data
                : [];
        return ApiResponse(
          success: true,
          data: results.map((j) => ReimbursementRequest.fromJson(j)).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to load reimbursements');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Submit reimbursement request
  static Future<ApiResponse<ReimbursementRequest>> submitReimbursement({
    int? categoryId,
    String? customCategory,
    required double amount,
    required String description,
    File? billAttachment,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return ApiResponse(success: false, message: 'No access token found');

      final uri = Uri.parse(ApiConfig.reimbursementRequestsUrl);
      final request = http.MultipartRequest('POST', uri);
      request.headers['Authorization'] = 'Bearer $token';

      if (categoryId != null) request.fields['category'] = categoryId.toString();
      if (customCategory != null && customCategory.isNotEmpty) {
        request.fields['custom_category'] = customCategory;
      }
      request.fields['amount'] = amount.toString();
      request.fields['description'] = description;

      if (billAttachment != null) {
        final ext = billAttachment.path.split('.').last.toLowerCase();
        final contentType = ['jpg', 'jpeg', 'png'].contains(ext)
            ? MediaType('image', ext == 'jpg' ? 'jpeg' : ext)
            : MediaType('application', 'octet-stream');
        request.files.add(await http.MultipartFile.fromPath(
          'bill_attachment',
          billAttachment.path,
          contentType: contentType,
        ));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return ApiResponse(
          success: true,
          message: 'Reimbursement submitted successfully',
          data: ReimbursementRequest.fromJson(jsonDecode(response.body)),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      } else {
        try {
          final error = jsonDecode(response.body);
          final msg = error is Map
              ? (error['detail'] ?? error['non_field_errors']?.toString() ?? 'Submission failed')
              : 'Submission failed';
          return ApiResponse(success: false, message: msg);
        } catch (_) {
          return ApiResponse(success: false, message: 'Submission failed (${response.statusCode})');
        }
      }
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Approve reimbursement (manager)
  static Future<ApiResponse<void>> approveReimbursement(int requestId) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.patch(
          Uri.parse('${ApiConfig.reimbursementRequestsUrl}$requestId/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'status': 'approved'}),
        ),
      );
      if (response.statusCode == 200) return ApiResponse(success: true, message: 'Approved');
      if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to approve');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Reject reimbursement (manager)
  static Future<ApiResponse<void>> rejectReimbursement(int requestId, String reason) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.patch(
          Uri.parse('${ApiConfig.reimbursementRequestsUrl}$requestId/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'status': 'rejected', 'rejection_reason': reason}),
        ),
      );
      if (response.statusCode == 200) return ApiResponse(success: true, message: 'Rejected');
      if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to reject');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }
}
