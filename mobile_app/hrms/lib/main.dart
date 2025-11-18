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
import 'pages/employee/profile_page.dart';
import 'pages/auth/change_password_page.dart';
import 'widgets/auth_wrapper.dart';
import 'widgets/auth_guard.dart';

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
      home: AuthWrapper(
        authenticatedChild: const EmployeeLayout(),
        unauthenticatedChild: const LoginPage(),
      ),
      routes: {
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/employee': (context) => const AuthGuard(child: EmployeeLayout()),
        '/employee/dashboard': (context) =>
            const AuthGuard(child: EmployeeLayout()),
        '/employee/my-tasks': (context) =>
            const AuthGuard(child: MyTasksPage()),
        '/employee/attendance': (context) =>
            const AuthGuard(child: AttendanceHistoryPage()),
        '/employee/attendance-history': (context) =>
            const AuthGuard(child: AttendanceHistoryPage()),
        '/employee/leave-application': (context) =>
            const AuthGuard(child: LeaveApplicationPage()),
        '/employee/notifications': (context) =>
            const AuthGuard(child: NotificationsPage()),
        '/employee/learning-corner': (context) =>
            const AuthGuard(child: LearningCornerPage()),
        '/employee/personal-calendar': (context) =>
            const AuthGuard(child: PersonalCalendarPage()),
        '/employee/company-policy': (context) =>
            const AuthGuard(child: CompanyPolicyPage()),
        '/employee/references': (context) =>
            const AuthGuard(child: ReferencesPage()),
        '/employee/reportees': (context) =>
            const AuthGuard(child: ReporteesPage()),
        '/employee/assign-task': (context) =>
            const AuthGuard(child: AssignTaskPage()),
        '/employee/leave-request': (context) =>
            const AuthGuard(child: LeaveRequestPage()),
        '/employee/profile': (context) => const AuthGuard(child: ProfilePage()),
        '/change-password': (context) =>
            const AuthGuard(child: ChangePasswordPage()),
      },
    );
  }
}
