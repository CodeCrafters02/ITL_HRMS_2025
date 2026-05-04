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
import 'widgets/employee_drawer.dart';
import 'widgets/employee_bottom_nav.dart';
import '../../widgets/stitch_background.dart';

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

  Future<bool> _onWillPop() async {
    if (_scaffoldKey.currentState?.isDrawerOpen ?? false) {
      _scaffoldKey.currentState?.closeDrawer();
      return false;
    }

    final bool? shouldExit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppStitchTheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Exit App',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Are you sure you want to exit the application?',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Colors.white54, fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444), // Red for exit
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            child: const Text('Exit'),
          ),
        ],
      ),
    );

    return shouldExit ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _onWillPop,
      child: Scaffold(
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
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.12),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppStitchTheme.primary.withValues(alpha: 0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Menu button
                      _GlassIconButton(
                        icon: Icons.menu_rounded,
                        onTap: () => _scaffoldKey.currentState?.openDrawer(),
                      ),
                      const Spacer(),
                      // Center branding — logo with subtle glow
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppStitchTheme.primary.withValues(alpha: 0.12),
                              AppStitchTheme.primary.withValues(alpha: 0.04),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppStitchTheme.primary.withValues(
                              alpha: 0.15,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Image.asset(
                              'assets/logo/app_logo.png',
                              height: 22,
                              errorBuilder: (context, error, stackTrace) =>
                                  Icon(
                                    Icons.people_alt_rounded,
                                    size: 20,
                                    color: AppStitchTheme.primary.withValues(
                                      alpha: 0.8,
                                    ),
                                  ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'PEOPLE SUITE',
                              style: Theme.of(context).textTheme.labelMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.5,
                                    color: AppStitchTheme.lightOnSurface
                                        .withValues(alpha: 0.85),
                                  ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // Notification + Profile
                      const _GlassNotificationButton(),
                      const SizedBox(width: 8),
                      _buildProfileAvatar(),
                    ],
                  ),
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
    ),
  );
}
}

/// A frosted-glass circular icon button for the header bar.
class _GlassIconButton extends StatelessWidget {
  const _GlassIconButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.1),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Icon(icon, color: AppStitchTheme.lightOnSurface, size: 21),
      ),
    );
  }
}

/// Notification button styled to match the glassmorphic header.
class _GlassNotificationButton extends StatefulWidget {
  const _GlassNotificationButton();

  @override
  State<_GlassNotificationButton> createState() =>
      _GlassNotificationButtonState();
}

class _GlassNotificationButtonState extends State<_GlassNotificationButton> {
  int _badgeCount = 0;

  @override
  void initState() {
    super.initState();
    _updateBadge();
    _poll();
  }

  void _poll() {
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        _updateBadge();
        _poll();
      }
    });
  }

  void _updateBadge() {
    if (mounted) {
      setState(() {
        _badgeCount = NotificationService.notificationsBadge;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/employee/notifications');
        NotificationService.updateLastSeen('notifications');
        _updateBadge();
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.1),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              Icons.notifications_outlined,
              color: AppStitchTheme.lightOnSurface,
              size: 21,
            ),
            if (_badgeCount > 0)
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.9),
                      width: 1.5,
                    ),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Center(
                    child: Text(
                      _badgeCount > 99 ? '99+' : _badgeCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        height: 1,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
