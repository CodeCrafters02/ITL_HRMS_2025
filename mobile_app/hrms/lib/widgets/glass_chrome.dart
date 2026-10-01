import 'package:flutter/material.dart';

import '../theme/app_stitch_theme.dart';
import 'glass_card.dart';
import 'session_dialogs.dart';

/// Frosted circular icon button — same as the Employee Dashboard header buttons.
class GlassIconButton extends StatelessWidget {
  const GlassIconButton({super.key, required this.icon, required this.onTap, this.tooltip, this.color, this.badge});
  final IconData icon;
  final VoidCallback? onTap;
  final String? tooltip;
  final Color? color;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final btn = GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.1),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Badge(
          isLabelVisible: (badge ?? 0) > 0,
          label: Text('${badge ?? ''}'),
          child: Icon(icon, color: color ?? AppStitchTheme.lightOnSurface, size: 21),
        ),
      ),
    );
    return tooltip == null ? btn : Tooltip(message: tooltip!, child: btn);
  }
}

/// Header bar matching the Employee Dashboard: glass pill with
/// back/home on the left, a branded title in the middle and actions on the right.
class GlassHeader extends StatelessWidget {
  const GlassHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.icon = Icons.people_alt_rounded,
    this.actions = const [],
    this.showBack = true,
    this.showHome = true,
    this.onBack,
    this.bottom,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final List<Widget> actions;
  final bool showBack, showHome;
  final VoidCallback? onBack;

  /// Optional strip under the header (e.g. a progress line).
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
          boxShadow: [
            BoxShadow(
              color: AppStitchTheme.primary.withValues(alpha: 0.06),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                if (showBack && (canPop || onBack != null))
                  GlassIconButton(
                    icon: Icons.arrow_back_rounded,
                    tooltip: 'Back',
                    onTap: onBack ?? () => Navigator.of(context).maybePop(),
                  ),
                if (showHome) ...[
                  const SizedBox(width: 8),
                  GlassIconButton(icon: Icons.home_rounded, tooltip: 'Home', onTap: () => goHome(context)),
                ],
                const SizedBox(width: 8),
                Expanded(
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppStitchTheme.primary.withValues(alpha: 0.12),
                            AppStitchTheme.primary.withValues(alpha: 0.04),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.15)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(icon, size: 18, color: AppStitchTheme.primary.withValues(alpha: 0.85)),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title.toUpperCase(),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.2,
                                    color: AppStitchTheme.lightOnSurface.withValues(alpha: 0.85),
                                  ),
                                ),
                                if (subtitle != null)
                                  Text(
                                    subtitle!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppStitchTheme.lightOnSurfaceMuted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                for (final a in actions) ...[const SizedBox(width: 8), a],
              ],
            ),
            if (bottom != null) ...[
              const SizedBox(height: 6),
              Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: bottom!),
            ],
          ],
        ),
      ),
    );
  }
}

class GlassNavItem {
  const GlassNavItem(this.icon, this.label, {this.activeIcon, this.badge = 0});
  final IconData icon;
  final IconData? activeIcon;
  final String label;
  final int badge;
}

/// Floating glass bottom navigation — same as the Employee Dashboard `EmployeeBottomNav`.
class GlassBottomNav extends StatelessWidget {
  const GlassBottomNav({super.key, required this.items, required this.currentIndex, required this.onTap});
  final List<GlassNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: GlassCard(
          borderRadius: 28,
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          child: Row(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final isActive = i == currentIndex;
              final color = isActive ? AppStitchTheme.primary : AppStitchTheme.lightOnSurfaceMuted;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  borderRadius: BorderRadius.circular(22),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(22),
                      color: isActive ? AppStitchTheme.primary.withValues(alpha: 0.10) : Colors.transparent,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Badge(
                          isLabelVisible: item.badge > 0,
                          label: Text('${item.badge}'),
                          child: Icon(isActive ? (item.activeIcon ?? item.icon) : item.icon, color: color),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: color,
                            fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
