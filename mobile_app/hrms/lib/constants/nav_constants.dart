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
    NavItem(name: 'My Tasks', icon: Icons.task, path: '/employee/my-tasks'),
    NavItem(
      name: 'Attendance',
      icon: Icons.calendar_today,
      path: '/employee/attendance',
    ),
    NavItem(
      name: 'Payslips',
      icon: Icons.payments_rounded,
      path: '/employee/my-payslips',
    ),
  ];
}

/// Drawer navigation items matching React sidebar
class DrawerNavItems {
  static List<NavGroup> getItems({bool isReportingManager = false}) {
    final groups = [
      const NavGroup(
        title: 'MAIN',
        items: [
          NavItem(
            name: 'Calendar',
            icon: Icons.calendar_month_rounded,
            path: '/employee/personal-calendar',
          ),
        ],
      ),
      const NavGroup(
        title: 'TIME & ATTENDANCE',
        items: [
          NavItem(
            name: 'Leave Application',
            icon: Icons.event_note_rounded,
            path: '/employee/leave-application',
          ),
          NavItem(
            name: 'WFH Request',
            icon: Icons.home_work_rounded,
            path: '/employee/wfh-request',
          ),
        ],
      ),
      const NavGroup(
        title: 'PAYROLL & FINANCE',
        items: [
          NavItem(
            name: 'Loan Application',
            icon: Icons.account_balance_rounded,
            path: '/employee/loan-application',
          ),
          NavItem(
            name: 'Reimbursement',
            icon: Icons.payments_rounded,
            path: '/employee/reimbursement',
          ),
        ],
      ),
      const NavGroup(
        title: 'WORKSPACE',
        items: [
          NavItem(
            name: 'Seat Booking',
            icon: Icons.event_seat_rounded,
            path: '/employee/seat-booking',
          ),
          NavItem(
            name: 'Room Booking',
            icon: Icons.meeting_room_rounded,
            path: '/employee/room-booking',
          ),
          NavItem(
            name: 'Asset Requests',
            icon: Icons.inventory_2_rounded,
            path: '/employee/asset-requests',
          ),
        ],
      ),
      const NavGroup(
        title: 'RESOURCES',
        items: [
          NavItem(
            name: 'Learning Corner',
            icon: Icons.school_rounded,
            path: '/employee/learning-corner',
          ),
          NavItem(
            name: 'Company policies',
            icon: Icons.policy_rounded,
            path: '/employee/company-policy',
          ),
          NavItem(
            name: 'References',
            icon: Icons.folder_shared_rounded,
            path: '/employee/references',
          ),
        ],
      ),
    ];

    if (isReportingManager) {
      groups.add(
        const NavGroup(
          title: 'TEAM MANAGEMENT',
          items: [
            NavItem(
              name: 'Reportees',
              icon: Icons.people_alt_rounded,
              path: '/employee/reportees',
            ),
            NavItem(
              name: 'Assign Task',
              icon: Icons.assignment_rounded,
              path: '/employee/assign-task',
              isConditional: true,
            ),
            NavItem(
              name: 'Leave Request',
              icon: Icons.send_rounded,
              path: '/employee/leave-request',
              isConditional: true,
            ),
          ],
        ),
      );
    }

    return groups;
  }
}
