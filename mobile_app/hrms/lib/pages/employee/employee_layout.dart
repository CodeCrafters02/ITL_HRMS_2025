import 'package:flutter/material.dart';
import '../../services/employee_service.dart';
import '../../services/notification_service.dart';
import 'employee_dashboard_page.dart';
import 'my_tasks_page.dart';
import 'attendance_history_page.dart';
import 'widgets/employee_drawer.dart';
import 'widgets/employee_bottom_nav.dart';

class EmployeeLayout extends StatefulWidget {
  const EmployeeLayout({super.key});

  @override
  State<EmployeeLayout> createState() => _EmployeeLayoutState();
}

class _EmployeeLayoutState extends State<EmployeeLayout> {
  int _currentIndex = 0;
  bool _isReportingManager = false;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _checkReportingManagerStatus();
    // Start notification polling
    NotificationService.startPolling();
  }

  @override
  void dispose() {
    NotificationService.stopPolling();
    super.dispose();
  }

  Future<void> _checkReportingManagerStatus() async {
    try {
      final isManager = await EmployeeService.isReportingManager();
      if (mounted) {
        setState(() {
          _isReportingManager = isManager;
        });
      }
    } catch (e) {
      // Handle error silently
    }
  }

  void _onBottomNavTap(int index) {
    if (index == 3) {
      // "More" button - open drawer
      _scaffoldKey.currentState?.openDrawer();
    } else {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  void _onDrawerItemTap(String? path) {
    if (path == null) return;

    Navigator.pop(context); // Close drawer

    // If it's a bottom nav item, switch to that index
    if (path == '/employee/dashboard') {
      setState(() {
        _currentIndex = 0;
      });
    } else if (path == '/employee/my-tasks') {
      setState(() {
        _currentIndex = 1;
      });
    } else if (path == '/employee/attendance' || path == '/employee/attendance-history') {
      setState(() {
        _currentIndex = 2;
      });
    } else {
      // Navigate to full-screen page
      Navigator.pushNamed(context, path);
    }
  }

  Widget _getPage(int index) {
    switch (index) {
      case 0:
        return const EmployeeDashboardPage();
      case 1:
        return const MyTasksPage();
      case 2:
        return const AttendanceHistoryPage();
      default:
        return const EmployeeDashboardPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: EmployeeDrawer(
        isReportingManager: _isReportingManager,
        onItemTap: _onDrawerItemTap,
      ),
      body: _getPage(_currentIndex),
      bottomNavigationBar: EmployeeBottomNav(
        currentIndex: _currentIndex,
        onTap: _onBottomNavTap,
      ),
    );
  }
}

