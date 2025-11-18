import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

/// Wrapper that checks authentication status on app start
class AuthWrapper extends StatefulWidget {
  final Widget authenticatedChild;
  final Widget unauthenticatedChild;

  const AuthWrapper({
    super.key,
    required this.authenticatedChild,
    required this.unauthenticatedChild,
  });

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isLoading = true;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    try {
      // Check if tokens exist
      final hasTokens = await StorageService.isLoggedIn();
      
      if (!hasTokens) {
        if (mounted) {
          setState(() {
            _isAuthenticated = false;
            _isLoading = false;
          });
        }
        return;
      }

      // Validate tokens and refresh if needed
      final isValid = await AuthService.ensureValidToken();
      
      if (mounted) {
        setState(() {
          _isAuthenticated = isValid;
          _isLoading = false;
        });
      }
    } catch (e) {
      // On error, logout and show login
      await AuthService.logout();
      if (mounted) {
        setState(() {
          _isAuthenticated = false;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return _isAuthenticated
        ? widget.authenticatedChild
        : widget.unauthenticatedChild;
  }
}

