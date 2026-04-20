import 'dart:convert';
import 'dart:math';

import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../config/google_oauth_config.dart';
import '../models/user_model.dart';
import 'storage_service.dart';
import 'fcm_service.dart';

class AuthService {
  static GoogleSignIn? _googleSignIn;
  static const Duration _refreshLeeway = Duration(minutes: 3);

  static GoogleSignIn _ensureGoogleSignIn() {
    if (kGoogleServerClientId.isEmpty) {
      throw StateError(
        'Missing GOOGLE_SERVER_CLIENT_ID. Pass --dart-define=GOOGLE_SERVER_CLIENT_ID='
        '<your-web-client-id>.apps.googleusercontent.com (same as Django GOOGLE_CLIENT_ID).',
      );
    }
    return _googleSignIn ??= GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId: kGoogleServerClientId,
    );
  }

  /// Google SSO: obtains ID token, posts to `/app/google-login/` as `credential`.
  static Future<ApiResponse<LoginResponse>> loginWithGoogle() async {
    if (kGoogleServerClientId.isEmpty) {
      return ApiResponse(
        success: false,
        message:
            'Google sign-in is not configured. Build with --dart-define=GOOGLE_SERVER_CLIENT_ID='
            '<web-client-id>.apps.googleusercontent.com',
      );
    }

    try {
      final gsi = _ensureGoogleSignIn();
      final account = await gsi.signIn();
      if (account == null) {
        return ApiResponse(success: false, message: 'Sign in cancelled');
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) {
        return ApiResponse(
          success: false,
          message:
              'No ID token from Google. Check serverClientId matches Django GOOGLE_CLIENT_ID.',
        );
      }

      final response = await http.post(
        Uri.parse(ApiConfig.googleLoginUrl),
        headers: ApiConfig.headers,
        body: jsonEncode({'credential': idToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final loginResponse = LoginResponse.fromJson(data);
        final storedName = (data['username'] as String?)?.trim();
        final email = account.email.trim();
        await StorageService.saveTokens(
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
          role: loginResponse.role,
          username: (storedName != null && storedName.isNotEmpty)
              ? storedName
              : email,
          userEmail: email,
          firstName: (data['first_name'] as String?)?.trim(),
          lastName: (data['last_name'] as String?)?.trim(),
        );

        return ApiResponse(
          success: true,
          message: 'Login successful',
          data: loginResponse,
        );
      }

      try {
        final error = jsonDecode(response.body);
        final detail = error is Map ? error['detail'] : null;
        return ApiResponse(
          success: false,
          message: detail != null ? detail.toString() : 'Google login failed',
        );
      } catch (_) {
        return ApiResponse(
          success: false,
          message: response.body.isNotEmpty ? response.body : 'Google login failed',
        );
      }
    } on StateError catch (e) {
      return ApiResponse(success: false, message: e.message);
    } on PlatformException catch (e) {
      final msg = e.message ?? '';
      if (e.code == 'channel-error' &&
          msg.contains('GoogleSignInApi')) {
        return ApiResponse(
          success: false,
          message:
              'Google Sign-In could not start on this device. Stop the app, run '
              '`flutter clean` then `flutter run`, and ensure Google Play services '
              'is updated. If it persists, add your debug SHA-1 in Firebase and '
              're-download android/app/google-services.json.',
        );
      }
      // ApiException 10 = DEVELOPER_ERROR: SHA-1 / package name mismatch in Firebase or GCP.
      if (e.code == 'sign_in_failed' ||
          RegExp(r'ApiException:\s*10\b').hasMatch(msg) ||
          RegExp(r':\s*10\s*:').hasMatch(msg)) {
        return ApiResponse(
          success: false,
          message:
              'Google Sign-In setup (error 10): Firebase does not trust this build yet. '
              'In Firebase Console → Project settings → Your apps → Android '
              '(com.innovyx.peoplesuite), add the SHA-1 fingerprint of the keystore '
              'you use to run the app (debug: from ~/.android/debug.keystore). '
              'Then download a fresh google-services.json. '
              'In Google Cloud Console → APIs & Services → Credentials, ensure an '
              'Android OAuth client exists for this package + SHA-1.',
        );
      }
      return ApiResponse(
        success: false,
        message: 'Sign in error: ${e.message ?? e.code}',
      );
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
    try {
      await _googleSignIn?.signOut();
    } catch (_) {
      // Ignore sign-out errors (e.g. not signed in with Google)
    }
    await StorageService.clearAll();
    // Clear FCM token on logout
    try {
      await FCMService.clearToken();
    } catch (e) {
      // Ignore errors during logout
    }
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

      if (!_isJwtExpiringSoon(token, leeway: _refreshLeeway)) {
        return true;
      }

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

      // Avoid refreshing on every app start; refresh only when close to expiry.
      if (!_isJwtExpiringSoon(accessToken, leeway: _refreshLeeway)) {
        return true;
      }

      final refreshResponse = await refreshToken();
      if (refreshResponse.success) {
        return true;
      }

      await logout();
      return false;
    } catch (e) {
      // On any error, clear tokens and return false
      await logout();
      return false;
    }
  }

  static bool _isJwtExpiringSoon(String jwt, {required Duration leeway}) {
    try {
      final parts = jwt.split('.');
      if (parts.length < 2) return true;

      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final json = jsonDecode(decoded);
      if (json is! Map<String, dynamic>) return true;

      final exp = json['exp'];
      if (exp is! num) return true;

      final expMs = exp.toInt() * 1000;
      final nowMs = DateTime.now().millisecondsSinceEpoch;
      final remainingMs = expMs - nowMs;

      return remainingMs <= max(0, leeway.inMilliseconds);
    } catch (_) {
      // If we can't parse, be safe and refresh.
      return true;
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
