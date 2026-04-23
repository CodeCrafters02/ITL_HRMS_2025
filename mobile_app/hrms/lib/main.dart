import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
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
import 'pages/employee/seat_booking_page.dart';
import 'pages/employee/conf_room_booking_page.dart';
import 'pages/auth/change_password_page.dart';
import 'pages/employee/chat/chat_conversations_page.dart';
import 'pages/employee/chat/chat_thread_page.dart';
import 'pages/employee/chat/manage_group_page.dart';
import 'providers/chat_provider.dart';
import 'providers/chat_scope.dart';
import 'widgets/auth_wrapper.dart';
import 'widgets/auth_guard.dart';
import 'theme/app_stitch_theme.dart';

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Badge updates will happen when app comes to foreground
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Register background message handler
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  runApp(const MyApp());
}

/// Main application widget.
/// Configures routing and theme for the HRMS mobile app.
class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final ChatProvider _chatProvider;

  @override
  void initState() {
    super.initState();
    _chatProvider = ChatProvider();
  }

  @override
  void dispose() {
    _chatProvider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChatScope(
      notifier: _chatProvider,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppStitchTheme.lightTheme(),
        themeMode: ThemeMode.light,
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
          '/employee/chat': (context) =>
              const AuthGuard(child: ChatConversationsPage()),
          '/employee/chat/thread': (context) {
            final args =
                (ModalRoute.of(context)?.settings.arguments as Map?)?.cast<String, dynamic>() ??
                    const <String, dynamic>{};
            final id = (args['conversationId'] as num?)?.toInt() ?? 0;
            return AuthGuard(child: ChatThreadPage(conversationId: id));
          },
          '/employee/chat/manage-group': (context) {
            final args =
                (ModalRoute.of(context)?.settings.arguments as Map?)?.cast<String, dynamic>() ??
                    const <String, dynamic>{};
            final id = (args['conversationId'] as num?)?.toInt() ?? 0;
            return AuthGuard(child: ManageGroupPage(conversationId: id));
          },
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
          '/employee/profile': (context) =>
              const AuthGuard(child: ProfilePage()),
          '/employee/seat-booking': (context) =>
              const AuthGuard(child: SeatBookingPage()),
          '/employee/room-booking': (context) =>
              const AuthGuard(child: ConfRoomBookingPage()),
          '/change-password': (context) =>
              const AuthGuard(child: ChangePasswordPage()),
        },
      ),
    );
  }
}
