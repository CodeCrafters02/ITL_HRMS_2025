import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user_model.dart';
import 'storage_service.dart';

class AuthService {
  // Login
  static Future<ApiResponse<LoginResponse>> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.loginUrl),
        headers: ApiConfig.headers,
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final loginResponse = LoginResponse.fromJson(data);

        // Save tokens to local storage
        await StorageService.saveTokens(
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
          role: loginResponse.role,
          username: username,
        );

        return ApiResponse(
          success: true,
          message: 'Login successful',
          data: loginResponse,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Login failed',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Register (Signup)
  static Future<ApiResponse<UserModel>> register({
    required String username,
    required String email,
    required String password,
    String role = 'master', // Default role for registration
  }) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.registerUrl),
        headers: ApiConfig.headers,
        body: jsonEncode({
          'username': username,
          'email': email,
          'password': password,
          'role': role,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: 'Registration successful! Please login.',
          data: UserModel.fromJson(data),
        );
      } else {
        final error = jsonDecode(response.body);
        String errorMessage = 'Registration failed';

        if (error['detail'] != null) {
          errorMessage = error['detail'];
        } else if (error['email'] != null) {
          errorMessage = 'Email: ${error['email'][0]}';
        } else if (error['username'] != null) {
          errorMessage = 'Username: ${error['username'][0]}';
        } else if (error['password'] != null) {
          errorMessage = 'Password: ${error['password'][0]}';
        }

        return ApiResponse(success: false, message: errorMessage);
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Logout
  static Future<void> logout() async {
    await StorageService.clearAll();
  }

  // Check if user is authenticated
  static Future<bool> isAuthenticated() async {
    return await StorageService.isLoggedIn();
  }

  // Validate token by making a test API call
  static Future<bool> validateToken() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null || token.isEmpty) {
        return false;
      }

      // Try to refresh token first to validate both tokens
      final refreshResponse = await refreshToken();
      return refreshResponse.success;
    } catch (e) {
      return false;
    }
  }

  // Check and refresh token if needed
  static Future<bool> ensureValidToken() async {
    try {
      final accessToken = await StorageService.getAccessToken();
      final refreshTokenValue = await StorageService.getRefreshToken();

      // If no tokens exist, user is not authenticated
      if (accessToken == null || refreshTokenValue == null) {
        return false;
      }

      // Try to validate by attempting to refresh token
      // This ensures both access and refresh tokens are valid
      final refreshResponse = await refreshToken();
      
      if (refreshResponse.success) {
        return true;
      }

      // If refresh fails, tokens are invalid - clear them
      await logout();
      return false;
    } catch (e) {
      // On any error, clear tokens and return false
      await logout();
      return false;
    }
  }

  // Get current user role
  static Future<String?> getCurrentUserRole() async {
    return await StorageService.getUserRole();
  }

  // Refresh token
  static Future<ApiResponse<String>> refreshToken() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) {
        return ApiResponse(success: false, message: 'No refresh token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.tokenRefreshUrl),
        headers: ApiConfig.headers,
        body: jsonEncode({'refresh': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newAccessToken = data['access'];
        // Some APIs return a new refresh token, use it if available
        final newRefreshToken = data['refresh'] ?? refreshToken;

        // Update tokens in storage
        final role = await StorageService.getUserRole();
        final username = await StorageService.getUsername();
        await StorageService.saveTokens(
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          role: role ?? '',
          username: username,
        );

        return ApiResponse(
          success: true,
          message: 'Token refreshed successfully',
          data: newAccessToken,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Token refresh failed',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Change password
  static Future<ApiResponse<void>> changePassword({
    required String oldPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.patch(
        Uri.parse(ApiConfig.changePasswordUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({
          'old_password': oldPassword,
          'new_password': newPassword,
          'confirm_password': confirmPassword,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: data['detail'] ?? 'Password updated successfully',
        );
      } else {
        final error = jsonDecode(response.body);
        String errorMessage = 'Failed to change password';

        // Handle field-specific errors
        if (error['old_password'] != null) {
          errorMessage = error['old_password'] is List
              ? error['old_password'][0]
              : error['old_password'].toString();
        } else if (error['new_password'] != null) {
          errorMessage = error['new_password'] is List
              ? error['new_password'][0]
              : error['new_password'].toString();
        } else if (error['confirm_password'] != null) {
          errorMessage = error['confirm_password'] is List
              ? error['confirm_password'][0]
              : error['confirm_password'].toString();
        } else if (error['detail'] != null) {
          errorMessage = error['detail'];
        } else if (error['non_field_errors'] != null) {
          errorMessage = error['non_field_errors'] is List
              ? error['non_field_errors'][0]
              : error['non_field_errors'].toString();
        }

        return ApiResponse(success: false, message: errorMessage);
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }
}
