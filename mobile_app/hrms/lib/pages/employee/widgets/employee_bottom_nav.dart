import 'package:flutter/material.dart';
import '../../../constants/nav_constants.dart';
import '../../../theme/app_stitch_theme.dart';

class EmployeeBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const EmployeeBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      backgroundColor: AppStitchTheme.surface,
      selectedItemColor: AppStitchTheme.primary,
      unselectedItemColor: AppStitchTheme.onSurfaceMuted,
      selectedFontSize: 12,
      unselectedFontSize: 12,
      items: BottomNavItems.items.map((item) {
        return BottomNavigationBarItem(
          icon: Icon(item.icon),
          label: item.name,
        );
      }).toList(),
    );
  }
}

