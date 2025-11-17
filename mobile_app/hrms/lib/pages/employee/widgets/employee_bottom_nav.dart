import 'package:flutter/material.dart';
import '../../../constants/nav_constants.dart';

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
      selectedItemColor: const Color(0xFF4F46E5),
      unselectedItemColor: const Color(0xFF6B7280),
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

