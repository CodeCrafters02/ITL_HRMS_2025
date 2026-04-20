import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userRoleKey = 'user_role';
  static const String _usernameKey = 'username';
  static const String _userEmailKey = 'user_email';
  static const String _firstNameKey = 'first_name';
  static const String _lastNameKey = 'last_name';

  // Save tokens after login
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required String role,
    String? username,
    String? userEmail,
    String? firstName,
    String? lastName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, accessToken);
    await prefs.setString(_refreshTokenKey, refreshToken);
    await prefs.setString(_userRoleKey, role);
    if (username != null) {
      await prefs.setString(_usernameKey, username);
    }
    if (userEmail != null) {
      await prefs.setString(_userEmailKey, userEmail);
    }
    if (firstName != null) {
      await prefs.setString(_firstNameKey, firstName);
    }
    if (lastName != null) {
      await prefs.setString(_lastNameKey, lastName);
    }
  }

  // Get access token
  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
  }

  // Get refresh token
  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }

  // Get user role
  static Future<String?> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userRoleKey);
  }

  // Get username
  static Future<String?> getUsername() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_usernameKey);
  }

  static Future<String?> getUserEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userEmailKey);
  }

  static Future<String?> getFirstName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_firstNameKey);
  }

  static Future<String?> getLastName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_lastNameKey);
  }

  // Check if user is logged in
  static Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  // Clear all stored data (logout)
  static Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_userRoleKey);
    await prefs.remove(_usernameKey);
    await prefs.remove(_userEmailKey);
    await prefs.remove(_firstNameKey);
    await prefs.remove(_lastNameKey);
  }
}
