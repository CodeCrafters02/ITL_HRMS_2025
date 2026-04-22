import 'package:flutter/material.dart';
import '../models/nav_item_model.dart';

/// Bottom navigation bar items
class BottomNavItems {
  static const List<NavItem> items = [
    NavItem(
      name: 'Dashboard',
      icon: Icons.dashboard,
      path: '/employee/dashboard',
    ),
    NavItem(
      name: 'My Tasks',
      icon: Icons.task,
      path: '/employee/my-tasks',
    ),
    NavItem(
      name: 'Attendance',
      icon: Icons.calendar_today,
      path: '/employee/attendance',
    ),
    NavItem(
      name: 'More',
      icon: Icons.more_horiz,
      path: null, // Opens drawer
    ),
  ];
}

/// Drawer navigation items matching React sidebar
class DrawerNavItems {
  static List<NavItem> getItems({bool isReportingManager = false}) {
    final baseItems = [
      NavItem(
        name: 'Dashboard',
        icon: Icons.dashboard,
        path: '/employee/dashboard',
      ),
      NavItem(
        name: 'My Tasks',
        icon: Icons.task,
        path: '/employee/my-tasks',
      ),
      NavItem(
        name: 'Leave Application',
        icon: Icons.event_note,
        path: '/employee/leave-application',
      ),
      NavItem(
        name: 'Attendance History',
        icon: Icons.history,
        path: '/employee/attendance-history',
      ),
      NavItem(
        name: 'Notifications',
        icon: Icons.notifications,
        path: '/employee/notifications',
      ),
      NavItem(
        name: 'Chat',
        icon: Icons.chat_bubble_outline_rounded,
        path: '/employee/chat',
      ),
      NavItem(
        name: 'Learning Corner',
        icon: Icons.school,
        path: '/employee/learning-corner',
      ),
      NavItem(
        name: 'Calendar',
        icon: Icons.calendar_today,
        path: '/employee/personal-calendar',
      ),
      NavItem(
        name: 'Seat Booking',
        icon: Icons.event_seat_rounded,
        path: '/employee/seat-booking',
      ),
      NavItem(
        name: 'Company policies',
        icon: Icons.policy,
        path: '/employee/company-policy',
      ),
      NavItem(
        name: 'References',
        icon: Icons.folder,
        path: '/employee/references',
      ),
      NavItem(
        name: 'Reportees',
        icon: Icons.people,
        path: '/employee/reportees',
      ),
    ];

    // Add conditional items for reporting managers
    if (isReportingManager) {
      baseItems.addAll([
        NavItem(
          name: 'Assign Task',
          icon: Icons.assignment,
          path: '/employee/assign-task',
          isConditional: true,
        ),
        NavItem(
          name: 'Leave Request',
          icon: Icons.send,
          path: '/employee/leave-request',
          isConditional: true,
        ),
      ]);
    }

    return baseItems;
  }
}

