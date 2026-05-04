import 'package:flutter/material.dart';
import '../../../constants/nav_constants.dart';
import '../../../models/nav_item_model.dart';
import '../../../services/employee_service.dart';
import '../../../services/notification_service.dart';
import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/stitch_background.dart';
import '../../../widgets/glass_card.dart';
import 'drawer_user_section.dart';

class EmployeeDrawer extends StatefulWidget {
  final bool isReportingManager;
  final Function(String?) onItemTap;

  const EmployeeDrawer({
    super.key,
    required this.isReportingManager,
    required this.onItemTap,
  });

  @override
  State<EmployeeDrawer> createState() => _EmployeeDrawerState();
}

class _EmployeeDrawerState extends State<EmployeeDrawer> {
  String? _companyName;
  bool _isLoadingCompanyInfo = false;

  @override
  void initState() {
    super.initState();
    // Company info endpoint not available - using default
    _companyName = null;
  }

  Widget _buildBadge(int? count) {
    if (count == null || count <= 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        count > 99 ? '99+' : count.toString(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildDrawerItem(NavItem item, bool isActive) {
    return InkWell(
      onTap: () {
        if (item.onClick != null) {
          item.onClick!();
        } else {
          widget.onItemTap(item.path);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isActive
              ? AppStitchTheme.primary.withValues(alpha: 0.10)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 20,
              color: isActive
                  ? AppStitchTheme.primary
                  : AppStitchTheme.lightOnSurfaceMuted,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.name,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                  color: isActive
                      ? AppStitchTheme.primary
                      : AppStitchTheme.lightOnSurface,
                ),
              ),
            ),
            _buildBadge(item.badge),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final navGroups = DrawerNavItems.getItems(
      isReportingManager: widget.isReportingManager,
    );

    // Get current route to highlight active item
    final currentRoute = ModalRoute.of(context)?.settings.name ?? '';

    return Drawer(
      width: 340,
      elevation: 0,
      backgroundColor: Colors.transparent,
      child: StitchBackground(
        showParticles: false,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                GlassCard(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: _isLoadingCompanyInfo
                            ? const SizedBox(
                                height: 20,
                                child: LinearProgressIndicator(),
                              )
                            : Text(
                                _companyName ?? 'People Suite',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: GlassCard(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                    child: ListView(
                      padding: EdgeInsets.zero,
                      children: navGroups.map((group) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(10, 16, 10, 8),
                              child: Text(
                                group.title,
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      letterSpacing: 1,
                                      fontWeight: FontWeight.w800,
                                      color: AppStitchTheme.lightOnSurfaceMuted,
                                    ),
                              ),
                            ),
                            ...group.items.map((item) {
                              final isActive = item.path != null &&
                                  (currentRoute == item.path ||
                                      currentRoute
                                          .startsWith(item.path!));

                              return Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: _buildDrawerItem(item, isActive),
                              );
                            }),
                            const SizedBox(height: 8),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const DrawerUserSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
