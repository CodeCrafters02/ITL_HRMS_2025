import 'package:flutter/material.dart';
import '../../theme/app_stitch_theme.dart';
import '../../services/employee_service.dart';
import '../../services/notification_service.dart';
import '../../services/auth_service.dart';
import '../../services/fcm_service.dart';
import '../../models/profile_model.dart';
import '../../providers/chat_scope.dart';
import '../../utils/performance_helper.dart';
import '../../widgets/optimized_image.dart';
import 'employee_dashboard_page.dart';
import 'my_tasks_page.dart';
import 'attendance_history_page.dart';
import 'my_payslips_page.dart';
import 'reportees_page.dart';
import 'widgets/employee_drawer.dart';
import 'widgets/employee_bottom_nav.dart';
import 'widgets/notification_button.dart';
import 'widgets/chat_button.dart';
import '../../widgets/app_header.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/glass_card.dart';

class EmployeeLayout extends StatefulWidget {
  const EmployeeLayout({super.key});

  @override
  State<EmployeeLayout> createState() => _EmployeeLayoutState();
}

class _EmployeeLayoutState extends State<EmployeeLayout>
    with WidgetsBindingObserver {
  int _currentIndex = 0;
  bool _isReportingManager = false;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  EmployeeProfile? _profile;
  bool _isLoadingProfile = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkAuthAndInitialize();
    // Keep chat badge/conversations warm for global unread counts.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ChatScope.of(context).initialize();
    });
    // Check for pending notifications after a short delay to ensure context is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handlePendingNotifications();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Check for pending notifications when app resumes
      _handlePendingNotifications();
      if (mounted) {
        ChatScope.of(context).setForeground(true);
      }
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      if (mounted) {
        ChatScope.of(context).setForeground(false);
      }
    }
  }

  Future<void> _checkAuthAndInitialize() async {
    // Check token validity first
    final isValid = await AuthService.ensureValidToken();
    if (!isValid && mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      return;
    }

    // If valid, proceed with initialization
    _checkReportingManagerStatus();
    _loadProfile();
    // Start notification polling
    NotificationService.startPolling();
    // Initialize FCM for push notifications
    FCMService.initialize();

    // Check for pending notifications after initialization
    _handlePendingNotifications();
  }

  // Handle pending notifications from FCM
  void _handlePendingNotifications() {
    final pendingData = FCMService.getPendingNotificationData();
    if (pendingData != null && mounted) {
      _navigateFromNotification(pendingData);
    }
  }

  // Navigate based on notification type
  void _navigateFromNotification(Map<String, dynamic> data) {
    final type = data['type']?.toString().toLowerCase();

    if (type == 'leave_request') {
      // Navigate to Leave Request page for managers
      Navigator.pushNamed(context, '/employee/leave-request');
    } else if (type == 'leave_status') {
      // Navigate to Leave Application page for employees
      Navigator.pushNamed(context, '/employee/leave-application');
    } else if (type == 'chat') {
      final convIdRaw = data['conversation_id'] ?? data['conversationId'];
      final convId = int.tryParse(convIdRaw?.toString() ?? '') ?? 0;
      if (convId > 0) {
        Navigator.pushNamed(
          context,
          '/employee/chat/thread',
          arguments: {'conversationId': convId},
        );
      } else {
        Navigator.pushNamed(context, '/employee/chat');
      }
    } else if (type == 'task') {
      // Navigate to My Tasks page
      setState(() {
        _currentIndex = 1; // My Tasks tab
      });
    } else if (type == 'loan_status' ||
        type == 'loan_request' ||
        type == 'loan_admin_review') {
      Navigator.pushNamed(context, '/employee/loan-application');
    } else if (type == 'wfh_status' || type == 'wfh_request') {
      Navigator.pushNamed(context, '/employee/wfh-request');
    } else if (type == 'reimbursement_status' ||
        type == 'reimbursement_request') {
      Navigator.pushNamed(context, '/employee/reimbursement');
    } else if (type == 'payslip_new') {
      Navigator.pushNamed(context, '/employee/my-payslips');
    } else if (type == 'asset_request') {
      Navigator.pushNamed(context, '/employee/asset-requests');
    } else {
      // Default: Navigate to notifications page
      Navigator.pushNamed(context, '/employee/notifications');
    }
  }

  Future<void> _loadProfile() async {
    try {
      final response = await EmployeeService.getEmployeeProfile();
      if (mounted) {
        setState(() {
          _isLoadingProfile = false;
          if (response.success) {
            _profile = response.data;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingProfile = false;
        });
      }
    }
  }

  String _getInitials(String? firstName, String? lastName) {
    final first = firstName?.isNotEmpty == true ? firstName![0] : '';
    final last = lastName?.isNotEmpty == true ? lastName![0] : '';
    return (first + last).toUpperCase();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
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
    setState(() {
      _currentIndex = index;
    });
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
    } else if (path == '/employee/attendance' ||
        path == '/employee/attendance-history') {
      setState(() {
        _currentIndex = 2;
      });
    } else if (path == '/employee/my-payslips') {
      setState(() {
        _currentIndex = 3;
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
      case 3:
        return const MyPayslipsPage();
      default:
        return const EmployeeDashboardPage();
    }
  }

  Widget _buildProfileAvatar() {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/employee/profile');
      },
      child: Container(
        margin: const EdgeInsets.only(left: 8),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppStitchTheme.primary, Color(0xFF8B5CF6)],
          ),
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: _isLoadingProfile
            ? const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              )
            : _profile?.photo != null && _profile!.photo!.isNotEmpty
            ? OptimizedImage(
                imageUrl: _profile!.photo!,
                width: 40,
                height: 40,
                fit: BoxFit.cover,
                shape: BoxShape.circle,
                memCacheWidth: 80,
                memCacheHeight: 80,
                errorWidget: _buildInitialsWidget(),
              )
            : _buildInitialsWidget(),
      ),
    );
  }

  Widget _buildInitialsWidget() {
    final initials = _profile != null
        ? _getInitials(_profile!.firstName, _profile!.lastName)
        : 'E';
    return Center(
      child: Text(
        initials.isEmpty ? 'E' : initials,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawerEdgeDragWidth: MediaQuery.of(context).size.width * 0.2,
      drawer: EmployeeDrawer(
        isReportingManager: _isReportingManager,
        onItemTap: _onDrawerItemTap,
      ),
      body: StitchBackground(
        enableAnimations: PerformanceHelper.enableParticles,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: AppHeader(
                  title: _getPageTitle(),
                  showLogo: true,
                  showMenuButton: true,
                  onMenuPressed: () => _scaffoldKey.currentState?.openDrawer(),
                  actions: [
                    const NotificationButton(),
                    const ChatButton(),
                    _buildProfileAvatar(),
                  ],
                ),
              ),
              Expanded(child: _getPage(_currentIndex)),
            ],
          ),
        ),
      ),
      bottomNavigationBar: EmployeeBottomNav(
        currentIndex: _currentIndex,
        onTap: _onBottomNavTap,
      ),
    );
  }

  String _getPageTitle() {
    switch (_currentIndex) {
      case 0:
        return 'Dashboard';
      case 1:
        return 'My Tasks';
      case 2:
        return 'Attendance';
      case 3:
        return 'My Payslips';
      default:
        return 'HRMS';
    }
  }
}
