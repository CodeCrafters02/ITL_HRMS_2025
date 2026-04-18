import 'package:flutter/material.dart';
import '../../../theme/app_stitch_theme.dart';

/// Hero branding for auth screens (Stitch-style dark gradient + headline).
class AuthBrandingPanel extends StatelessWidget {
  const AuthBrandingPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1E0F4A),
            AppStitchTheme.primaryDim,
            AppStitchTheme.scaffoldBackground,
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                ),
                child: Icon(
                  Icons.groups_rounded,
                  size: 40,
                  color: Colors.white.withValues(alpha: 0.95),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Innovyx Human Resource\nManagement System',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppStitchTheme.onSurface,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                'Empowering your workforce,\nstreamlining your success.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppStitchTheme.onSurfaceVariant,
                      height: 1.5,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
