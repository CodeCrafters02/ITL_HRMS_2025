import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import '../config/api_config.dart';
import '../models/payslip_model.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';

class PayslipService {
  /// Helper method to make HTTP requests with automatic token refresh on 401
  static Future<http.Response> _makeAuthenticatedRequest(
    Future<http.Response> Function() request, {
    int retryCount = 0,
  }) async {
    try {
      final response = await request();

      // If we get 401 and haven't retried yet, try to refresh token and retry
      if (response.statusCode == 401 && retryCount == 0) {
        final refreshResponse = await AuthService.refreshToken();

        if (refreshResponse.success) {
          // Token refreshed successfully, retry the request with new token
          return _makeAuthenticatedRequest(
            request,
            retryCount: retryCount + 1,
          );
        } else {
          // Check if in demo mode - don't logout if we are
          if (await StorageService.isDemoMode()) {
            return response;
          }

          // Token refresh failed, return the 401 response
          return response;
        }
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Helper to get auth headers with current token
  static Future<Map<String, String>> _getAuthHeaders() async {
    final token = await StorageService.getAccessToken();
    return ApiConfig.getAuthHeaders(token ?? '');
  }

  /// Get all payslips for the current employee
  static Future<ApiResponse<List<Payslip>>> getPayslips({
    int pageSize = 100,
    int? year,
  }) async {
    try {
      // Check demo mode
      if (await StorageService.isDemoMode()) {
        return ApiResponse(
          success: true,
          message: 'Demo payslips loaded',
          data: [], // Add dummy data if needed
        );
      }

      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final queryParams = <String, String>{
        'page_size': pageSize.toString(),
      };
      if (year != null) {
        queryParams['year'] = year.toString();
      }

      final uri = Uri.parse(ApiConfig.payslipsUrl(
        pageSize: pageSize,
        year: year,
      ));

      final response = await _makeAuthenticatedRequest(
        () async => await http.get(
          uri,
          headers: await _getAuthHeaders(),
        ),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> results;
        
        if (data is Map && data.containsKey('results')) {
          results = data['results'] as List<dynamic>;
        } else if (data is List) {
          results = data;
        } else {
          results = [];
        }

        final payslips = results
            .map((json) => Payslip.fromJson(json as Map<String, dynamic>))
            .toList();

        // Sort by year desc, then month desc
        payslips.sort((a, b) {
          if (a.year != b.year) return b.year.compareTo(a.year);
          return b.month.compareTo(a.month);
        });

        return ApiResponse(
          success: true,
          message: 'Payslips loaded successfully',
          data: payslips,
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        try {
          final error = jsonDecode(response.body);
          return ApiResponse(
            success: false,
            message: (error is Map) ? (error['detail'] ?? 'Failed to load payslips') : 'Failed to load payslips',
          );
        } catch (_) {
          return ApiResponse(
            success: false,
            message: 'Failed to load payslips (Error ${response.statusCode})',
          );
        }
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  /// Download payslip PDF
  static Future<ApiResponse<String>> downloadPayslip(
    String fileUrl, {
    String? fileName,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      // Build full URL if relative
      final fullUrl = fileUrl.startsWith('http')
          ? fileUrl
          : '${ApiConfig.baseUrl}$fileUrl';

      final response = await _makeAuthenticatedRequest(
        () async => await http.get(
          Uri.parse(fullUrl),
          headers: await _getAuthHeaders(),
        ),
      );

      if (response.statusCode == 200) {
        final actualFileName = fileName ?? 'payslip_${DateTime.now().millisecondsSinceEpoch}.pdf';
        final String saveDir = await _getDownloadDirectory();
        final dir = Directory(saveDir);
        if (!await dir.exists()) await dir.create(recursive: true);
        final filePath = '$saveDir/$actualFileName';

        final file = File(filePath);
        await file.writeAsBytes(response.bodyBytes);

        return ApiResponse(
          success: true,
          message: 'Payslip downloaded successfully',
          data: filePath,
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        return ApiResponse(
          success: false,
          message: 'Failed to download payslip: ${response.statusCode}',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Download error: ${e.toString()}',
      );
    }
  }

  /// Resolves the save directory: Downloads/PeopleSuite on Android, app docs on iOS
  static Future<String> _getDownloadDirectory() async {
    if (Platform.isAndroid) {
      const publicDownloads = '/storage/emulated/0/Download/PeopleSuite';
      try {
        // On Android 13+ this works without any permission.
        // On Android < 13, WRITE_EXTERNAL_STORAGE is declared in the manifest (maxSdkVersion=32).
        // Request it for older devices.
        await Permission.storage.request();
        final testDir = Directory(publicDownloads);
        await testDir.create(recursive: true);
        return publicDownloads;
      } catch (_) {
        // Fallback to external app-specific storage
        final extDir = await getExternalStorageDirectory();
        if (extDir != null) {
          return '${extDir.path}/PeopleSuite';
        }
      }
    }
    // iOS / fallback
    final appDir = await getApplicationDocumentsDirectory();
    return '${appDir.path}/PeopleSuite';
  }

  /// Share payslip via system share dialog
  static Future<ApiResponse<void>> sharePayslip(String filePath) async {
    try {
      final file = XFile(filePath);
      final result = await SharePlus.instance.share(
        ShareParams(
          files: [file],
          subject: 'My Payslip',
          text: 'Here is my payslip',
        ),
      );
      return ApiResponse(success: true, message: 'Shared successfully');
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Share failed: ${e.toString()}',
      );
    }
  }
}

/// Generic API response wrapper
class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  ApiResponse({required this.success, this.message, this.data});
}
