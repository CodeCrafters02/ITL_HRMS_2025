import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../theme/app_stitch_theme.dart';

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.borderRadius = 28,
    this.enableBlur = true,
    this.blurSigma = 10, // Reduced from 18 for performance
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final bool enableBlur;
  final double blurSigma;

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(borderRadius);
    final content = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        border: Border.all(
          color: AppStitchTheme.lightOutline.withValues(alpha: 0.78),
          width: 1,
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.78),
            AppStitchTheme.accentBlue.withValues(alpha: 0.10),
            Colors.white.withValues(alpha: 0.62),
          ],
          stops: const [0.0, 0.55, 1.0],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.26),
            blurRadius: 18,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );

    // Clamp blur for performance on low-end devices
    final effectiveBlur = blurSigma.clamp(0.0, 12.0);
    
    return RepaintBoundary(
      child: ClipRRect(
        borderRadius: r,
        child: enableBlur && effectiveBlur > 0
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: effectiveBlur, sigmaY: effectiveBlur),
                child: content,
              )
            : content,
      ),
    );
  }
}

