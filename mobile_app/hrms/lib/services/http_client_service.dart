import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'storage_service.dart';
import 'auth_service.dart';

/// HTTP Client Service with automatic token refresh on 401 errors
class HttpClientService {
  /// Make an authenticated GET request with automatic token refresh
  static Future<http.Response> get(
    String url, {
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _makeRequest(
      () async {
        final token = await StorageService.getAccessToken();
        final requestHeaders = {
          ...ApiConfig.headers,
          ...?headers,
          if (token != null) 'Authorization': 'Bearer $token',
        };
        return await http.get(Uri.parse(url), headers: requestHeaders);
      },
      retryOn401: retryOn401,
    );
  }

  /// Make an authenticated POST request with automatic token refresh
  static Future<http.Response> post(
    String url, {
    Map<String, String>? headers,
    Object? body,
    bool retryOn401 = true,
  }) async {
    return _makeRequest(
      () async {
        final token = await StorageService.getAccessToken();
        final requestHeaders = {
          ...ApiConfig.headers,
          ...?headers,
          if (token != null) 'Authorization': 'Bearer $token',
        };
        return await http.post(
          Uri.parse(url),
          headers: requestHeaders,
          body: body is String ? body : jsonEncode(body),
        );
      },
      retryOn401: retryOn401,
    );
  }

  /// Make an authenticated PATCH request with automatic token refresh
  static Future<http.Response> patch(
    String url, {
    Map<String, String>? headers,
    Object? body,
    bool retryOn401 = true,
  }) async {
    return _makeRequest(
      () async {
        final token = await StorageService.getAccessToken();
        final requestHeaders = {
          ...ApiConfig.headers,
          ...?headers,
          if (token != null) 'Authorization': 'Bearer $token',
        };
        return await http.patch(
          Uri.parse(url),
          headers: requestHeaders,
          body: body is String ? body : jsonEncode(body),
        );
      },
      retryOn401: retryOn401,
    );
  }

  /// Make an authenticated PUT request with automatic token refresh
  static Future<http.Response> put(
    String url, {
    Map<String, String>? headers,
    Object? body,
    bool retryOn401 = true,
  }) async {
    return _makeRequest(
      () async {
        final token = await StorageService.getAccessToken();
        final requestHeaders = {
          ...ApiConfig.headers,
          ...?headers,
          if (token != null) 'Authorization': 'Bearer $token',
        };
        return await http.put(
          Uri.parse(url),
          headers: requestHeaders,
          body: body is String ? body : jsonEncode(body),
        );
      },
      retryOn401: retryOn401,
    );
  }

  /// Make an authenticated DELETE request with automatic token refresh
  static Future<http.Response> delete(
    String url, {
    Map<String, String>? headers,
    bool retryOn401 = true,
  }) async {
    return _makeRequest(
      () async {
        final token = await StorageService.getAccessToken();
        final requestHeaders = {
          ...ApiConfig.headers,
          ...?headers,
          if (token != null) 'Authorization': 'Bearer $token',
        };
        return await http.delete(Uri.parse(url), headers: requestHeaders);
      },
      retryOn401: retryOn401,
    );
  }

  /// Internal method to handle requests with automatic token refresh
  static Future<http.Response> _makeRequest(
    Future<http.Response> Function() request, {
    required bool retryOn401,
    int retryCount = 0,
  }) async {
    try {
      final response = await request();

      // If we get 401 and retry is enabled, try to refresh token
      if (response.statusCode == 401 && retryOn401 && retryCount == 0) {
        // Try to refresh the token
        final refreshResponse = await AuthService.refreshToken();

        if (refreshResponse.success) {
          // Token refreshed successfully, retry the original request
          return _makeRequest(
            request,
            retryOn401: false, // Don't retry again to avoid infinite loop
            retryCount: retryCount + 1,
          );
        } else {
          // Token refresh failed, logout user
          await AuthService.logout();
          return response; // Return the original 401 response
        }
      }

      return response;
    } catch (e) {
      // Re-throw the exception
      rethrow;
    }
  }
}

