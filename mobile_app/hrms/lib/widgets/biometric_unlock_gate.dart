import 'package:flutter/material.dart';

import '../services/biometric_service.dart';
import '../theme/app_stitch_theme.dart';
import 'glass_card.dart';
import 'stitch_background.dart';

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
      body: StitchBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 360),
                child: GlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppStitchTheme.primary.withValues(alpha: 0.1),
                          border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.1)),
                        ),
                        child: const Icon(
                          Icons.fingerprint_rounded,
                          size: 64,
                          color: AppStitchTheme.primary,
                        ),
                      ),
                      const SizedBox(height: 28),
                      Text(
                        'Secure Access',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: AppStitchTheme.lightOnSurface,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _message,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 32),
                      Container(
                        width: double.infinity,
                        height: 56,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          gradient: LinearGradient(
                            colors: [
                              AppStitchTheme.primary,
                              AppStitchTheme.primary.withValues(alpha: 0.8),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppStitchTheme.primary.withValues(alpha: 0.25),
                              blurRadius: 12,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: ElevatedButton.icon(
                          onPressed: _isUnlocking ? null : _attemptUnlock,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          icon: _isUnlocking
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 3,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.lock_open_rounded, color: Colors.white),
                          label: Text(
                            'Unlock with $_label',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: widget.onUseGoogleSignIn,
                        style: TextButton.styleFrom(
                          foregroundColor: AppStitchTheme.lightOnSurfaceMuted,
                        ),
                        child: const Text(
                          'Use Google Sign-In instead',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}