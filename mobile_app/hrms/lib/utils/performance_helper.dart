import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';

/// Performance helper to detect low-end devices and optimize UI accordingly
class PerformanceHelper {
  static bool? _isLowEndDevice;
  static bool? _shouldEnableAnimations;
  
  /// Initialize performance detection (call once at app startup)
  static Future<void> initialize() async {
    if (_isLowEndDevice != null) return;
    
    _isLowEndDevice = await _detectLowEndDevice();
    _shouldEnableAnimations = !_isLowEndDevice!;
  }
  
  /// Detect if the current device is low-end based on various factors
  static Future<bool> _detectLowEndDevice() async {
    try {
      // Web is generally not considered low-end for this context
      if (kIsWeb) return false;
      
      final deviceInfo = DeviceInfoPlugin();
      
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        // Consider low-end if:
        // - SDK version < 29 (Android 10)
        // - Less than 4GB RAM (approximated by version/brand checks)
        if (androidInfo.version.sdkInt < 29) {
          return true;
        }
        
        // Check for known low-end device patterns
        final model = androidInfo.model?.toLowerCase() ?? '';
        final brand = androidInfo.brand?.toLowerCase() ?? '';
        
        // Known low-end device patterns
        final lowEndPatterns = [
          'go', 'lite', 'mini', 'a1', 'a2', 'a3', 'j2', 'j3', 'j4', 'j5', 'j6',
          'm10', 'm20', 'core', 'grand', 'trend', 'ace', 'mini', 'pocket',
        ];
        
        for (final pattern in lowEndPatterns) {
          if (model.contains(pattern) || brand.contains(pattern)) {
            return true;
          }
        }
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        // iPhone 8 and older are considered lower-end for animations
        final model = iosInfo.model?.toLowerCase() ?? '';
        final name = iosInfo.name?.toLowerCase() ?? '';
        
        // Check for older iPhone models
        if (model.contains('iphone')) {
          // Extract model number (e.g., iPhone8,1 -> 8)
          final match = RegExp(r'iphone(\d+)').firstMatch(model);
          if (match != null) {
            final version = int.tryParse(match.group(1) ?? '0') ?? 0;
            if (version < 10) return true; // iPhone X and older
          }
        }
      }
      
      return false;
    } catch (e) {
      // Default to enabling everything if detection fails
      return false;
    }
  }
  
  /// Returns true if the device is considered low-end
  static bool get isLowEndDevice => _isLowEndDevice ?? false;
  
  /// Returns true if animations should be enabled
  static bool get enableAnimations => _shouldEnableAnimations ?? true;
  
  /// Returns true if blur effects should be enabled
  static bool get enableBlurEffects => _shouldEnableAnimations ?? true;
  
  /// Returns true if particle animations should be enabled
  static bool get enableParticles => !(_isLowEndDevice ?? false);
  
  /// Get recommended blur sigma (lower for low-end devices)
  static double get recommendedBlurSigma => isLowEndDevice ? 5.0 : 10.0;
  
  /// Get recommended particle count (lower for low-end devices)
  static int get recommendedParticleCount => isLowEndDevice ? 0 : 20;
  
  /// Get recommended polling interval multiplier
  static double get pollingIntervalMultiplier => isLowEndDevice ? 2.0 : 1.0;
}
