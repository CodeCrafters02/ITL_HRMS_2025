import 'package:flutter/material.dart';
import '../theme/app_stitch_theme.dart';
import 'glass_card.dart';

class AppHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool showBackButton;
  final bool showMenuButton;
  final VoidCallback? onMenuPressed;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showLogo;
  final EdgeInsetsGeometry? padding;

  const AppHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showBackButton = false,
    this.showMenuButton = false,
    this.onMenuPressed,
    this.actions,
    this.leading,
    this.showLogo = false,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          if (showMenuButton)
            IconButton(
              icon: const Icon(Icons.menu_rounded),
              onPressed: onMenuPressed,
            ),
          if (showBackButton)
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
              onPressed: () => Navigator.pop(context),
            ),
          if (leading != null) leading!,
          if (showLogo) ...[
            Image.asset(
              'assets/logo/app_logo.png',
              height: 28,
              width: 28,
              errorBuilder: (context, error, stackTrace) =>
                  const SizedBox.shrink(),
            ),
            const SizedBox(width: 10),
          ],
          if (showBackButton || showMenuButton || leading != null || showLogo)
            const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                        letterSpacing: -0.5,
                      ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
              ],
            ),
          ),
          if (actions != null) ...[
            const SizedBox(width: 8),
            ...actions!,
          ],
        ],
      ),
    );
  }
}
