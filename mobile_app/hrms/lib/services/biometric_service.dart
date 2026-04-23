import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

import 'storage_service.dart';

class BiometricService {
  BiometricService._();

  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> isBiometricAvailable() async {
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) {
        return false;
      }
      return await _auth.canCheckBiometrics;
    } catch (_) {
      return false;
    }
  }

  static Future<String> biometricLabel() async {
    try {
      final biometrics = await _auth.getAvailableBiometrics();
      if (biometrics.contains(BiometricType.face)) {
        return 'Face ID';
      }
      if (biometrics.contains(BiometricType.fingerprint)) {
        return 'Fingerprint';
      }
      if (biometrics.contains(BiometricType.strong)) {
        return 'Biometric';
      }
      return 'Biometric';
    } catch (_) {
      return 'Biometric';
    }
  }

  static Future<bool> authenticate({String? reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason ?? 'Unlock HRMS with Face ID or Fingerprint',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> isEnabled() async {
    return StorageService.isBiometricEnabled();
  }

  static Future<void> enableBiometricLogin() async {
    await StorageService.setBiometricEnabled(true);
  }

  static Future<void> disableBiometricLogin() async {
    await StorageService.setBiometricEnabled(false);
  }
}