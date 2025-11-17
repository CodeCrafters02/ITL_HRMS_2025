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

        // Update access token in storage
        final role = await StorageService.getUserRole();
        final username = await StorageService.getUsername();
        await StorageService.saveTokens(
          accessToken: newAccessToken,
          refreshToken: refreshToken,
          role: role ?? '',
          username: username,
        );

        return ApiResponse(
          success: true,
          message: 'Token refreshed successfully',
          data: newAccessToken,
        );
      } else {
        return ApiResponse(success: false, message: 'Token refresh failed');
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }
}
