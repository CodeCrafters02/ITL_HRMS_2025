import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config/api_config.dart';
import '../models/asset_request_model.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';

class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  ApiResponse({required this.success, this.message, this.data});
}

class AssetService {
  /// Helper method to make HTTP requests with automatic token refresh on 401
  static Future<http.Response> _makeAuthenticatedRequest(
    Future<http.Response> Function() request, {
    int retryCount = 0,
  }) async {
    try {
      final response = await request();

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

  /// Get my asset requests
  static Future<ApiResponse<List<AssetRequest>>> getMyAssetRequests({
    int page = 1,
    int pageSize = 20,
    AssetRequestType? type,
    AssetRequestStatus? status,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final queryParams = <String, String>{
        'page': page.toString(),
        'page_size': pageSize.toString(),
      };

      if (type != null) {
        queryParams['request_type'] = type.apiValue;
      }
      if (status != null) {
        queryParams['status'] = status.name;
      }

      final uri = Uri.parse(ApiConfig.assetRequestsUrl)
          .replace(queryParameters: queryParams);

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

        // Debug: Log status values from API
        if (kDebugMode && results.isNotEmpty) {
          // Log first item's keys to see available fields
          final firstItem = results.first as Map<String, dynamic>;
          print('DEBUG: Available fields in API response: ${firstItem.keys.join(', ')}');
          
          for (var item in results.take(5)) {  // Log first 5 items
            final json = item as Map<String, dynamic>;
            final statusValue = json['status'] ?? json['request_status'] ?? json['approval_status'] ?? json['state'] ?? 'NULL';
            print('DEBUG: Request ${json['request_number']} - Status: $statusValue');
          }
        }

        final requests = results
            .map((json) => AssetRequest.fromJson(json as Map<String, dynamic>))
            .toList();

        // Debug: Log parsed status values
        if (kDebugMode) {
          for (var request in requests) {
            print('DEBUG: Parsed Request ${request.requestNumber} - Status: ${request.status.displayName}');
          }
        }

        // Sort by created date desc
        requests.sort((a, b) => b.createdAt.compareTo(a.createdAt));

        return ApiResponse(
          success: true,
          message: 'Asset requests loaded',
          data: requests,
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
            message: (error is Map) ? (error['detail'] ?? 'Failed to load asset requests') : 'Failed to load asset requests',
          );
        } catch (_) {
          return ApiResponse(
            success: false,
            message: 'Failed to load asset requests (Error ${response.statusCode})',
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

  /// Get my currently assigned assets
  static Future<ApiResponse<List<MyAsset>>> getMyAssets() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await _makeAuthenticatedRequest(
        () async => await http.get(
          Uri.parse(ApiConfig.myAssetsUrl),
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

        final assets = results
            .map((json) => MyAsset.fromJson(json as Map<String, dynamic>))
            .toList();

        return ApiResponse(
          success: true,
          message: 'Assets loaded',
          data: assets,
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load assets',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  /// Get available supply items
  static Future<ApiResponse<List<SupplyItem>>> getSupplyItems({
    String? search,
    String? category,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final queryParams = <String, String>{};
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }

      final uri = Uri.parse(ApiConfig.supplyItemsUrl)
          .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

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

        final items = results
            .map((json) => SupplyItem.fromJson(json as Map<String, dynamic>))
            .toList();

        return ApiResponse(
          success: true,
          message: 'Supply items loaded',
          data: items,
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout(isAutomatic: true);
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load supply items',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  /// Create asset request (core asset)
  static Future<ApiResponse<AssetRequest>> createCoreAssetRequest({
    required String remarks,
    File? image,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final uri = Uri.parse(ApiConfig.assetRequestsUrl);
      final request = http.MultipartRequest('POST', uri);

      // Add headers
      request.headers['Authorization'] = 'Bearer $token';

      // Add fields
      request.fields['request_type'] = 'core';
      request.fields['remarks'] = remarks;

      // Add image if provided
      if (image != null) {
        final fileStream = http.ByteStream(image.openRead());
        final length = await image.length();
        final multipartFile = http.MultipartFile(
          'image',
          fileStream,
          length,
          filename: image.path.split('/').last,
          contentType: MediaType('image', 'jpeg'),
        );
        request.files.add(multipartFile);
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: 'Asset request submitted successfully',
          data: AssetRequest.fromJson(data),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to submit request',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  /// Create supply request (bulk supply items)
  static Future<ApiResponse<AssetRequest>> createSupplyRequest({
    required List<Map<String, dynamic>> items,
    String? remarks,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await _makeAuthenticatedRequest(
        () async => await http.post(
          Uri.parse(ApiConfig.assetRequestsUrl),
          headers: await _getAuthHeaders(),
          body: jsonEncode({
            'request_type': 'supply',
            'items': items,
            'remarks': remarks,
          }),
        ),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: 'Supply request submitted successfully',
          data: AssetRequest.fromJson(data),
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to submit request',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  /// Cancel asset request
  static Future<ApiResponse<void>> cancelRequest(int requestId) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await _makeAuthenticatedRequest(
        () async => await http.patch(
          Uri.parse('${ApiConfig.assetRequestsUrl}$requestId/'),
          headers: await _getAuthHeaders(),
          body: jsonEncode({'status': 'cancelled'}),
        ),
      );

      if (response.statusCode == 200) {
        return ApiResponse(
          success: true,
          message: 'Request cancelled successfully',
        );
      } else if (response.statusCode == 401) {
        await AuthService.logout();
        return ApiResponse(
          success: false,
          message: 'Session expired. Please login again.',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to cancel request',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }
}
