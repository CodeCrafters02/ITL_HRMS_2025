import 'package:flutter/material.dart';

import '../services/biometric_service.dart';
import '../theme/app_stitch_theme.dart';

class BiometricUnlockGate extends StatefulWidget {
  const BiometricUnlockGate({
    super.key,
    required this.child,
    required this.onUseGoogleSignIn,
  });

  final Widget child;
  final VoidCallback onUseGoogleSignIn;

  @override
  State<BiometricUnlockGate> createState() => _BiometricUnlockGateState();
}

class _BiometricUnlockGateState extends State<BiometricUnlockGate> {
  bool _isChecking = true;
  bool _isUnlocking = false;
  bool _isUnlocked = false;
  String _message = 'Unlock with Face ID or Fingerprint to continue.';
  String _label = 'Biometric';

  @override
  void initState() {
    super.initState();
    _loadBiometricLabel();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _attemptUnlock();
    });
  }

  Future<void> _loadBiometricLabel() async {
    final label = await BiometricService.biometricLabel();
    if (!mounted) {
      return;
    }
    setState(() {
      _label = label;
    });
  }

  Future<void> _attemptUnlock() async {
    if (!mounted || _isUnlocking) {
      return;
    }
    setState(() {
      _isChecking = false;
      _isUnlocking = true;
      _message = 'Authenticating with $_label...';
    });

    final success = await BiometricService.authenticate(
      reason: 'Unlock Innovyx HRMS with $_label',
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _isUnlocking = false;
      _isUnlocked = success;
      _message = success
          ? 'Authentication successful.'
          : 'Biometric authentication was not completed.';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isUnlocked) {
      return widget.child;
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.lock,
                    size: 64,
                    color: AppStitchTheme.primary,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Secure Access',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: AppStitchTheme.onSurface,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _message,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppStitchTheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _isUnlocking ? null : _attemptUnlock,
                      icon: _isUnlocking
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.fingerprint),
                      label: Text(
                        'Unlock with $_label',
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: widget.onUseGoogleSignIn,
                    child: const Text('Use Google Sign-In instead'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}