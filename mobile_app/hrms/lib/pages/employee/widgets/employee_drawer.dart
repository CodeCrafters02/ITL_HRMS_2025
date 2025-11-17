import 'package:flutter/material.dart';
import '../../../constants/nav_constants.dart';
import '../../../models/nav_item_model.dart';
import '../../../services/employee_service.dart';
import '../../../services/notification_service.dart';
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
  String? _companyLogo;
  String? _companyName;
  bool _isLoadingCompanyInfo = true;

  @override
  void initState() {
    super.initState();
    _fetchCompanyInfo();
  }

  Future<void> _fetchCompanyInfo() async {
    try {
      final response = await EmployeeService.getCompanyInfo();
      if (mounted) {
        setState(() {
          _isLoadingCompanyInfo = false;
          if (response.success && response.data != null) {
            _companyLogo = response.data!['company_logo_url'];
            _companyName = response.data!['company_name'];
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingCompanyInfo = false;
        });
      }
    }
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
          color: isActive ? const Color(0xFFF3F4F6) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 20,
              color: isActive
                  ? const Color(0xFF4F46E5)
                  : const Color(0xFF6B7280),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.name,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                  color: isActive
                      ? const Color(0xFF4F46E5)
                      : const Color(0xFF111827),
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
    final navItems = DrawerNavItems.getItems(
      isReportingManager: widget.isReportingManager,
    );

    // Update nav items with badge counts from notification service
    final itemsWithBadges = navItems.map((item) {
      int? badge;
      switch (item.name) {
        case 'Notifications':
          badge = NotificationService.notificationsBadge;
          break;
        case 'My Tasks':
          badge = NotificationService.myTasksBadge;
          break;
        case 'Learning Corner':
          badge = NotificationService.learningCornerBadge;
          break;
        case 'Calendar':
          badge = NotificationService.calendarBadge;
          break;
        case 'Leave Application':
          badge = NotificationService.leaveApplicationBadge;
          break;
        case 'Leave Request':
          badge = NotificationService.leaveRequestBadge;
          break;
      }
      return NavItem(
        name: item.name,
        icon: item.icon,
        path: item.path,
        badge: badge,
        onClick: item.onClick,
        isConditional: item.isConditional,
      );
    }).toList();

    // Get current route to highlight active item
    final currentRoute = ModalRoute.of(context)?.settings.name ?? '';

    return Drawer(
      child: Column(
        children: [
          // Header with company logo/name
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: Colors.grey.shade200,
                  width: 1,
                ),
              ),
            ),
            child: _isLoadingCompanyInfo
                ? const Center(child: CircularProgressIndicator())
                : Row(
                    children: [
                      if (_companyLogo != null)
                        Image.network(
                          _companyLogo!,
                          width: 40,
                          height: 40,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(Icons.business, size: 40),
                        )
                      else
                        const Icon(Icons.business, size: 40),
                      if (_companyName != null) ...[
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _companyName!,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF111827),
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
          ),

          // Menu header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Row(
              children: const [
                Text(
                  'MENU',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF9CA3AF),
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),

          // Menu items
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: itemsWithBadges.length,
              itemBuilder: (context, index) {
                final item = itemsWithBadges[index];
                final isActive = item.path != null &&
                    (currentRoute == item.path ||
                        currentRoute.startsWith(item.path!));
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: _buildDrawerItem(item, isActive),
                );
              },
            ),
          ),

          // User section at bottom
          const DrawerUserSection(),
        ],
      ),
    );
  }
}

