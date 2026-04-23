import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import 'video_splash_screen.dart';
import 'biometric_unlock_gate.dart';

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
  bool _isAuthLoading = true;
  bool _isSplashFinished = false;
  bool _isAuthenticated = false;
  bool _isBiometricEnabled = false;

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
            _isAuthLoading = false;
            _isBiometricEnabled = false;
          });
        }
        return;
      }

      // Validate tokens and refresh if needed
      final isValid = await AuthService.ensureValidToken();
      final biometricEnabled = isValid
          ? await StorageService.isBiometricEnabled()
          : false;
      
      if (mounted) {
        setState(() {
          _isAuthenticated = isValid;
          _isAuthLoading = false;
          _isBiometricEnabled = biometricEnabled;
        });
      }
    } catch (e) {
      // On error, logout and show login
      await AuthService.logout();
      if (mounted) {
        setState(() {
          _isAuthenticated = false;
          _isAuthLoading = false;
          _isBiometricEnabled = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobileSplashPlatform = !kIsWeb &&
        (defaultTargetPlatform == TargetPlatform.android ||
            defaultTargetPlatform == TargetPlatform.iOS);

    if (!_isSplashFinished) {
      if (isMobileSplashPlatform) {
        return VideoSplashScreen(
          onFinished: () {
            if (!mounted || _isSplashFinished) {
              return;
            }
            setState(() {
              _isSplashFinished = true;
            });
          },
        );
      }

      // Non-mobile targets keep a white loading screen.
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_isAuthLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_isAuthenticated && _isBiometricEnabled) {
      return BiometricUnlockGate(
        child: widget.authenticatedChild,
        onUseGoogleSignIn: () async {
          await AuthService.logout();
          if (!mounted) {
            return;
          }
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
        },
      );
    }

    return _isAuthenticated ? widget.authenticatedChild : widget.unauthenticatedChild;
  }
}

