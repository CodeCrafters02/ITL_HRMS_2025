import 'package:flutter/material.dart';
import '../services/auth_service.dart';

/// AuthGuard widget that checks authentication before showing child
class AuthGuard extends StatefulWidget {
  final Widget child;
  final Widget? loadingWidget;
  final String? redirectTo;

  const AuthGuard({
    super.key,
    required this.child,
    this.loadingWidget,
    this.redirectTo,
  });

  @override
  State<AuthGuard> createState() => _AuthGuardState();
}

class _AuthGuardState extends State<AuthGuard> {
  bool _isChecking = true;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuthentication();
  }

  Future<void> _checkAuthentication() async {
    try {
      // Check if tokens exist and are valid
      final isValid = await AuthService.ensureValidToken();
      
      if (mounted) {
        setState(() {
          _isAuthenticated = isValid;
          _isChecking = false;
        });

        // If not authenticated, navigate to login
        if (!isValid) {
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/login',
            (route) => false,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAuthenticated = false;
          _isChecking = false;
        });
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/login',
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return widget.loadingWidget ??
          const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
    }

    if (!_isAuthenticated) {
      return const SizedBox.shrink();
    }

    return widget.child;
  }
}

