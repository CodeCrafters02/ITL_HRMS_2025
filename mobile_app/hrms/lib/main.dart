import 'package:flutter/material.dart';
import 'pages/auth/login_page.dart';
import 'pages/auth/signup_page.dart';
import 'pages/employee/employee_layout.dart';
import 'pages/employee/my_tasks_page.dart';
import 'pages/employee/attendance_history_page.dart';
import 'pages/employee/leave_application_page.dart';
import 'pages/employee/notifications_page.dart';
import 'pages/employee/learning_corner_page.dart';
import 'pages/employee/personal_calendar_page.dart';
import 'pages/employee/company_policy_page.dart';
import 'pages/employee/references_page.dart';
import 'pages/employee/reportees_page.dart';
import 'pages/employee/assign_task_page.dart';
import 'pages/employee/leave_request_page.dart';

void main() {
  runApp(const MyApp());
}

/// Main application widget.
/// Configures routing and theme for the HRMS mobile app.
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFF4F46E5),
        fontFamily: 'Roboto',
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/employee': (context) => const EmployeeLayout(),
        '/employee/dashboard': (context) => const EmployeeLayout(),
        '/employee/my-tasks': (context) => const MyTasksPage(),
        '/employee/attendance': (context) => const AttendanceHistoryPage(),
        '/employee/attendance-history': (context) =>
            const AttendanceHistoryPage(),
        '/employee/leave-application': (context) =>
            const LeaveApplicationPage(),
        '/employee/notifications': (context) => const NotificationsPage(),
        '/employee/learning-corner': (context) => const LearningCornerPage(),
        '/employee/personal-calendar': (context) =>
            const PersonalCalendarPage(),
        '/employee/company-policy': (context) => const CompanyPolicyPage(),
        '/employee/references': (context) => const ReferencesPage(),
        '/employee/reportees': (context) => const ReporteesPage(),
        '/employee/assign-task': (context) => const AssignTaskPage(),
        '/employee/leave-request': (context) => const LeaveRequestPage(),
      },
    );
  }
}
