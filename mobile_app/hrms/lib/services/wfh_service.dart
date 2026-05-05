import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/wfh_model.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';

class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;
  ApiResponse({required this.success, this.message, this.data});
}

class WFHService {
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

  /// Get my WFH requests
  static Future<ApiResponse<List<WFHRequest>>> getMyWFHRequests({String? status}) async {
    try {
      final queryParams = {'mine': 'true'};
      if (status != null) queryParams['status'] = status;

      final uri = Uri.parse(ApiConfig.wfhRequestsUrl).replace(
        queryParameters: queryParams,
      );
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
          data: results.map((j) => WFHRequest.fromJson(j)).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to load WFH requests');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Get pending WFH requests for manager approval
  static Future<ApiResponse<List<WFHRequest>>> getPendingWFHRequests() async {
    try {
      final uri = Uri.parse(ApiConfig.wfhRequestsUrl).replace(
        queryParameters: {'status': 'pending'},
      );
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
        final all = results.map((j) => WFHRequest.fromJson(j)).toList();
        return ApiResponse(
          success: true,
          data: all.where((r) => r.status == WFHStatus.pending).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to load pending requests');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Submit WFH request
  static Future<ApiResponse<WFHRequest>> submitWFHRequest({
    required WFHRequestType requestType,
    required String reason,
    required DateTime fromDate,
    required DateTime toDate,
  }) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.post(
          Uri.parse(ApiConfig.wfhRequestsUrl),
          headers: await _getAuthHeaders(),
          body: jsonEncode({
            'request_type': requestType.apiValue,
            'reason': reason,
            'from_date': fromDate.toIso8601String().substring(0, 10),
            'to_date': toDate.toIso8601String().substring(0, 10),
          }),
        ),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return ApiResponse(
          success: true,
          message: 'WFH request submitted successfully',
          data: WFHRequest.fromJson(jsonDecode(response.body)),
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

  /// Approve WFH request (manager)
  static Future<ApiResponse<void>> approveWFHRequest(int requestId) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.patch(
          Uri.parse('${ApiConfig.wfhRequestsUrl}$requestId/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'status': 'approved'}),
        ),
      );
      if (response.statusCode == 200) {
        return ApiResponse(success: true, message: 'Request approved');
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to approve request');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Reject WFH request (manager)
  static Future<ApiResponse<void>> rejectWFHRequest(int requestId, String reason) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.patch(
          Uri.parse('${ApiConfig.wfhRequestsUrl}$requestId/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'status': 'rejected', 'rejection_reason': reason}),
        ),
      );
      if (response.statusCode == 200) {
        return ApiResponse(success: true, message: 'Request rejected');
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to reject request');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }
}
