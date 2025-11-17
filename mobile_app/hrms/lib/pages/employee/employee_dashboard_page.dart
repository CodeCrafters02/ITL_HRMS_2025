import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/dashboard_model.dart';
import '../../services/employee_service.dart';
import 'widgets/dashboard_header.dart';
import 'widgets/today_status_card.dart';
import 'widgets/performance_card.dart';
import 'widgets/payroll_card.dart';
import 'widgets/recent_breaks_card.dart';
import 'widgets/break_controls.dart';
import 'widgets/notification_button.dart';

class EmployeeDashboardPage extends StatefulWidget {
  const EmployeeDashboardPage({super.key});

  @override
  State<EmployeeDashboardPage> createState() => _EmployeeDashboardPageState();
}

class _EmployeeDashboardPageState extends State<EmployeeDashboardPage> {
  DashboardData? _dashboardData;
  bool _isLoading = false;
  bool _checkInOutLoading = false;
  int _localTimer = 0;
  int _breakTimer = 0;
  Timer? _timer;
  Timer? _breakTimerRef;

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _breakTimerRef?.cancel();
    super.dispose();
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await EmployeeService.getDashboardData();
      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (response.success && response.data != null) {
          setState(() {
            _dashboardData = response.data;
          });
          _startTimers();
        } else {
          _showNotification(
            response.message ?? 'Failed to load dashboard',
            isError: true,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showNotification('Error: ${e.toString()}', isError: true);
      }
    }
  }

  void _startTimers() {
    _timer?.cancel();
    _breakTimerRef?.cancel();

    if (_dashboardData == null) return;

    final isCheckedIn = _dashboardData!.isCheckedIn;
    final hasActiveBreak = _dashboardData!.hasActiveBreak;

    // Work timer
    if (isCheckedIn && !hasActiveBreak && _dashboardData!.checkinTime != null) {
      _calculateLocalTimer();
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) {
          setState(() {
            _localTimer++;
          });
        }
      });
    } else {
      _localTimer = 0;
    }

    // Break timer
    if (hasActiveBreak && _dashboardData!.activeBreak?.startTime != null) {
      _calculateBreakTimer();
      _breakTimerRef = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) {
          setState(() {
            _breakTimer++;
          });
        }
      });
    } else {
      _breakTimer = 0;
    }
  }

  void _calculateLocalTimer() {
    if (_dashboardData?.checkinTime == null) {
      _localTimer = 0;
      return;
    }

    try {
      final checkinTime = _dashboardData!.checkinTime!;
      final parts = checkinTime.split(':');
      if (parts.length >= 2) {
        final now = DateTime.now();
        final checkin = DateTime(
          now.year,
          now.month,
          now.day,
          int.parse(parts[0]),
          int.parse(parts[1]),
          parts.length > 2 ? int.parse(parts[2]) : 0,
        );
        final elapsed = now.difference(checkin);
        _localTimer = elapsed.inSeconds;
      }
    } catch (e) {
      _localTimer = 0;
    }
  }

  void _calculateBreakTimer() {
    if (_dashboardData?.activeBreak?.startTime == null) {
      _breakTimer = 0;
      return;
    }

    try {
      final startTime = _dashboardData!.activeBreak!.startTime;
      final parts = startTime.split(':');
      if (parts.length >= 2) {
        final now = DateTime.now();
        final breakStart = DateTime(
          now.year,
          now.month,
          now.day,
          int.parse(parts[0]),
          int.parse(parts[1]),
          parts.length > 2 ? int.parse(parts[2]) : 0,
        );
        final elapsed = now.difference(breakStart);
        _breakTimer = elapsed.inSeconds;
      }
    } catch (e) {
      _breakTimer = 0;
    }
  }

  Future<void> _handleCheckInOut() async {
    if (_dashboardData == null) return;

    // Check if already checked out for the day
    if (_dashboardData!.checkinTime != null &&
        _dashboardData!.checkoutTime != null) {
      _showNotification(
        'You have already checked out for today. Attendance for the day is complete.',
        isError: false,
      );
      return;
    }

    setState(() {
      _checkInOutLoading = true;
    });

    try {
      final isCheckedIn = _dashboardData!.isCheckedIn;
      final response = isCheckedIn
          ? await EmployeeService.checkOut()
          : await EmployeeService.checkIn();

      if (mounted) {
        setState(() {
          _checkInOutLoading = false;
        });

        if (response.success) {
          _showNotification(
            response.message ?? 'Operation successful',
            isError: false,
          );
          await _fetchDashboardData();
        } else {
          _showNotification(
            response.message ?? 'Operation failed',
            isError: true,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _checkInOutLoading = false;
        });
        _showNotification('Network error occurred', isError: true);
      }
    }
  }

  void _showNotification(String message, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text(
          'Employee Dashboard',
          style: TextStyle(
            color: Color(0xFF111827),
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF111827)),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 8.0),
            child: NotificationButton(),
          ),
        ],
      ),
      body: _isLoading && _dashboardData == null
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4F46E5)),
              ),
            )
          : _dashboardData == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Color(0xFF9CA3AF),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Failed to load dashboard',
                        style: TextStyle(
                          fontSize: 18,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchDashboardData,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4F46E5),
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  color: const Color(0xFF4F46E5),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        DashboardHeader(
                          dashboardData: _dashboardData!,
                          localTimer: _localTimer,
                          breakTimer: _breakTimer,
                          onRefresh: _fetchDashboardData,
                          onCheckInOut: _handleCheckInOut,
                          isLoading: _checkInOutLoading,
                        ),
                        const SizedBox(height: 24),

                        // Break Controls (if checked in)
                        if (_dashboardData!.isCheckedIn)
                          Card(
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                              side: const BorderSide(
                                color: Color(0xFFE5E7EB),
                              ),
                            ),
                            color: Colors.white,
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: BreakControls(
                                dashboardData: _dashboardData!,
                                isLoading: _checkInOutLoading,
                                onBreakAction: _fetchDashboardData,
                                onStatusChange: (status) async {
                                  await EmployeeService.updateEmployeeStatus(status);
                                  // Optionally refresh dashboard after status update
                                },
                              ),
                            ),
                          ),
                        if (_dashboardData!.isCheckedIn) const SizedBox(height: 24),

                        // Main Content Grid - Responsive layout
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final isWide = constraints.maxWidth > 768;
                            if (isWide) {
                              // Desktop/Tablet layout
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Left Column - Today's Status
                                  Expanded(
                                    flex: 2,
                                    child: TodayStatusCard(
                                      dashboardData: _dashboardData!,
                                    ),
                                  ),
                                  const SizedBox(width: 24),

                                  // Right Column
                                  Expanded(
                                    flex: 1,
                                    child: Column(
                                      children: [
                                        // Performance Card
                                        PerformanceCard(
                                          dashboardData: _dashboardData!,
                                        ),
                                        // Payroll Card (if available)
                                        if (_dashboardData!.latestPayroll != null) ...[
                                          const SizedBox(height: 24),
                                          PayrollCard(
                                            payrollData: _dashboardData!.latestPayroll!,
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            } else {
                              // Mobile layout
                              return Column(
                                children: [
                                  // Today's Status
                                  TodayStatusCard(
                                    dashboardData: _dashboardData!,
                                  ),
                                  const SizedBox(height: 24),

                                  // Performance Card
                                  PerformanceCard(
                                    dashboardData: _dashboardData!,
                                  ),
                                  // Payroll Card (if available)
                                  if (_dashboardData!.latestPayroll != null) ...[
                                    const SizedBox(height: 24),
                                    PayrollCard(
                                      payrollData: _dashboardData!.latestPayroll!,
                                    ),
                                  ],
                                ],
                              );
                            }
                          },
                        ),
                        if (_dashboardData!.recentBreaks != null &&
                            _dashboardData!.recentBreaks!.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          // Recent Breaks
                          RecentBreaksCard(
                            recentBreaks: _dashboardData!.recentBreaks!,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
    );
  }
}

