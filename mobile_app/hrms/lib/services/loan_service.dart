import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config/api_config.dart';
import '../models/loan_model.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';

class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;
  ApiResponse({required this.success, this.message, this.data});
}

class LoanService {
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

  /// Get available loan categories
  static Future<ApiResponse<List<LoanCategory>>> getLoanCategories() async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.get(
          Uri.parse(ApiConfig.loanCategoriesUrl),
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
          data: results.map((j) => LoanCategory.fromJson(j)).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      } else {
        return ApiResponse(success: false, message: 'Failed to load loan categories');
      }
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Get interest slabs for a category
  static Future<ApiResponse<List<LoanInterestSlab>>> getInterestSlabs(int categoryId) async {
    try {
      final uri = Uri.parse(ApiConfig.loanInterestSlabsUrl).replace(
        queryParameters: {'category': categoryId.toString()},
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
          data: results.map((j) => LoanInterestSlab.fromJson(j)).toList(),
        );
      }
      return ApiResponse(success: false, message: 'Failed to load interest slabs');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Check loan eligibility
  static Future<ApiResponse<Map<String, dynamic>>> checkEligibility({
    required int categoryId,
    required double amount,
  }) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.post(
          Uri.parse('${ApiConfig.loanApplicationsUrl}check_eligibility/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'category_id': categoryId, 'amount': amount}),
        ),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return ApiResponse(success: true, data: data);
      } else if (response.statusCode == 400) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return ApiResponse(success: true, data: data);
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Eligibility check failed');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Get my loan applications
  static Future<ApiResponse<List<LoanApplication>>> getMyLoanApplications() async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.get(
          Uri.parse(ApiConfig.loanApplicationsUrl),
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
          data: results.map((j) => LoanApplication.fromJson(j)).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to load applications');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Get pending loan applications for manager approval (reportees)
  static Future<ApiResponse<List<LoanApplication>>> getPendingLoanApplications() async {
    try {
      final uri = Uri.parse(ApiConfig.loanApplicationsUrl).replace(
        queryParameters: {'status': 'PENDING'},
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
        final all = results.map((j) => LoanApplication.fromJson(j)).toList();
        return ApiResponse(
          success: true,
          data: all.where((a) => a.status == LoanStatus.pending).toList(),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      return ApiResponse(success: false, message: 'Failed to load pending applications');
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Approve a loan application (manager)
  static Future<ApiResponse<void>> approveLoan(int applicationId) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.post(
          Uri.parse('${ApiConfig.loanApplicationsUrl}$applicationId/approve/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'status': 'APPROVED'}),
        ),
      );
      if (response.statusCode == 200) {
        return ApiResponse(success: true, message: 'Loan application approved');
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      try {
        final err = jsonDecode(response.body);
        return ApiResponse(success: false, message: err['error'] ?? err['message'] ?? 'Approval failed');
      } catch (_) {
        return ApiResponse(success: false, message: 'Approval failed (${response.statusCode})');
      }
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Reject a loan application (manager)
  static Future<ApiResponse<void>> rejectLoan(int applicationId, String remarks) async {
    try {
      final response = await _makeAuthenticatedRequest(
        () async => await http.post(
          Uri.parse('${ApiConfig.loanApplicationsUrl}$applicationId/reject/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'remarks': remarks}),
        ),
      );
      if (response.statusCode == 200) {
        return ApiResponse(success: true, message: 'Loan application rejected');
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(success: false, message: 'Session expired. Please login again.');
      }
      try {
        final err = jsonDecode(response.body);
        return ApiResponse(success: false, message: err['error'] ?? err['message'] ?? 'Rejection failed');
      } catch (_) {
        return ApiResponse(success: false, message: 'Rejection failed (${response.statusCode})');
      }
    } catch (e) {
      return ApiResponse(success: false, message: 'Network error: ${e.toString()}');
    }
  }

  /// Submit a loan application
  static Future<ApiResponse<LoanApplication>> applyForLoan({
    required int categoryId,
    required double requestedAmount,
    required int repaymentMonths,
    required double interestRate,
    required double emiAmount,
    String? reason,
    File? supportingDocument,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return ApiResponse(success: false, message: 'No access token found');

      final uri = Uri.parse(ApiConfig.loanApplicationsUrl);
      final request = http.MultipartRequest('POST', uri);
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['category'] = categoryId.toString();
      request.fields['requested_amount'] = requestedAmount.toString();
      request.fields['repayment_months'] = repaymentMonths.toString();
      request.fields['interest_rate'] = interestRate.toString();
      request.fields['emi_amount'] = emiAmount.toString();
      if (reason != null && reason.isNotEmpty) {
        request.fields['reason'] = reason;
      }
      if (supportingDocument != null) {
        request.files.add(await http.MultipartFile.fromPath(
          'supporting_document',
          supportingDocument.path,
          contentType: MediaType('application', 'octet-stream'),
        ));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return ApiResponse(
          success: true,
          message: 'Loan application submitted successfully',
          data: LoanApplication.fromJson(jsonDecode(response.body)),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
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
}
