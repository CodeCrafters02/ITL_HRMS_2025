import 'package:flutter/material.dart';
import '../services/auth_service.dart';

/// Mixin that provides authentication checking functionality to pages
mixin AuthMixin<T extends StatefulWidget> on State<T> {
  /// Check token validity when page is opened
  /// Returns true if token is valid, false otherwise
  /// Automatically navigates to login if token is invalid
  Future<bool> checkAuthStatus() async {
    try {
      final isValid = await AuthService.ensureValidToken();
      
      if (!isValid && mounted) {
        // Token is invalid, navigate to login
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/login',
          (route) => false,
        );
        return false;
      }
      
      return isValid;
    } catch (e) {
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/login',
          (route) => false,
        );
      }
      return false;
    }
  }
}

