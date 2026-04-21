import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/dashboard_model.dart';
import '../../models/calendar_model.dart';
import '../../models/task_model.dart';
import '../../models/leave_model.dart';
import '../../models/announcement_model.dart';
import '../../theme/app_stitch_theme.dart';
import '../../services/employee_service.dart';
import '../../widgets/glass_card.dart';
import 'widgets/timer_widget.dart';
import 'widgets/time_log_bottom_sheet.dart';

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

  bool _isLoadingOverview = true;
  List<Announcement> _announcements = const [];
  List<CalendarEvent> _events = const [];
  int _myTasksCount = 0;
  int _holidaysCount = 0;
  int _leavesCount = 0;
  int _calendarCount = 0;

  int _tabIndex = 0; // 0=Events, 1=Announcements
  final PageController _announcementPager = PageController();

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _breakTimerRef?.cancel();
    _announcementPager.dispose();
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
          _fetchOverviewData();
        } else {
          // Check if session expired
          if (response.message?.contains('Session expired') == true ||
              response.message?.contains('login again') == true) {
            // Navigate to login
            if (mounted) {
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/login',
                (route) => false,
              );
            }
        } else {
          _showNotification(
            response.message ?? 'Failed to load dashboard',
            isError: true,
          );
          }
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

  Future<void> _fetchOverviewData() async {
    setState(() {
      _isLoadingOverview = true;
    });
    try {
      final now = DateTime.now();
      final results = await Future.wait([
        EmployeeService.getAnnouncements(limit: 3),
        EmployeeService.getMyTasks(),
        EmployeeService.getAppliedLeaves(),
        EmployeeService.getCalendarData(year: now.year, month: now.month, day: now.day),
      ]);

      final a = results[0] as ApiResponse<List<Announcement>>;
      final t = results[1] as ApiResponse<List<Task>>;
      final l = results[2] as ApiResponse<List<AppliedLeave>>;
      final c = results[3] as ApiResponse<CalendarData>;

      final upcomingEvents = <CalendarEvent>[];
      final upcomingHolidays = <CalendarEvent>[];
      if (c.success && c.data != null) {
        for (final week in c.data!.weeks) {
          for (final day in week) {
            final dt = day.date;
            if (dt == null) continue;
            if (dt.isBefore(DateTime(now.year, now.month, now.day))) continue;

            upcomingEvents.addAll(day.allEvents);
            upcomingHolidays.addAll(day.adminEvents);
          }
        }
        upcomingEvents.sort((x, y) => x.date.compareTo(y.date));
        upcomingHolidays.sort((x, y) => x.date.compareTo(y.date));
      }

      if (mounted) {
        setState(() {
          _announcements = a.data ?? const [];
          _myTasksCount = t.data?.length ?? 0;
          _leavesCount = l.data?.length ?? 0;
          _calendarCount = upcomingEvents.length;
          _holidaysCount = upcomingHolidays.length;
          _events = upcomingEvents.take(3).toList();
          _isLoadingOverview = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingOverview = false;
        });
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
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF059669),
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _dashboardData == null) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppStitchTheme.primary),
        ),
      );
    }

    if (_dashboardData == null) {
      return Center(
        child: GlassCard(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: AppStitchTheme.lightOnSurfaceMuted,
              ),
              const SizedBox(height: 12),
              Text(
                'Failed to load dashboard',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppStitchTheme.lightOnSurface,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: _fetchDashboardData,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final d = _dashboardData!;
    final isCheckedIn = d.isCheckedIn;
    final hasActiveBreak = d.hasActiveBreak;
    final seconds = hasActiveBreak ? _breakTimer : _localTimer;

    return LayoutBuilder(
      builder: (context, constraints) {
        return Stack(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                children: [
                  _GreetingHeader(name: d.employeeName ?? 'Employee'),
                  const SizedBox(height: 10),
                  _ReadyForDayStrip(
                    isCheckedIn: isCheckedIn,
                    hasActiveBreak: hasActiveBreak,
                    seconds: seconds,
                    isLoading: _checkInOutLoading,
                    onRefresh: _fetchDashboardData,
                    onCheckInOut: _handleCheckInOut,
                  ),
                  const SizedBox(height: 12),
                  _KpiGrid(
                    isLoading: _isLoadingOverview,
                    leavesCount: _leavesCount,
                    holidaysCount: _holidaysCount,
                    myTasksCount: _myTasksCount,
                    calendarCount: _calendarCount,
                    onTapLeaves: () => Navigator.pushNamed(context, '/employee/leave-application'),
                    onTapHolidays: () => Navigator.pushNamed(context, '/employee/personal-calendar'),
                    onTapTasks: () => Navigator.pushNamed(context, '/employee/my-tasks'),
                    onTapCalendar: () => Navigator.pushNamed(context, '/employee/personal-calendar'),
                  ),
                  const SizedBox(height: 12),
                  _RoundedTabs(
                    index: _tabIndex,
                    onChanged: (i) => setState(() => _tabIndex = i),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      child: _tabIndex == 0
                          ? _EventsList(
                              key: const ValueKey('evt'),
                              isLoading: _isLoadingOverview,
                              events: _events,
                              onViewAll: () => Navigator.pushNamed(
                                context,
                                '/employee/personal-calendar',
                              ),
                            )
                          : _AnnouncementsCarousel(
                              key: const ValueKey('ann'),
                              isLoading: _isLoadingOverview,
                              items: _announcements,
                              controller: _announcementPager,
                            )
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              right: 16,
              bottom: 20,
              child: _FloatingQuickAction(
                label: 'Log time',
                onTap: () {
                  showTimeLogBottomSheet(context);
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _GreetingHeader extends StatelessWidget {
  const _GreetingHeader({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good Morning'
        : hour < 17
            ? 'Good Afternoon'
            : 'Good Evening';
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, ${name.split(' ').first}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                '$greeting ☀',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppStitchTheme.lightOnSurface,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ReadyForDayStrip extends StatelessWidget {
  const _ReadyForDayStrip({
    required this.isCheckedIn,
    required this.hasActiveBreak,
    required this.seconds,
    required this.isLoading,
    required this.onRefresh,
    required this.onCheckInOut,
  });

  final bool isCheckedIn;
  final bool hasActiveBreak;
  final int seconds;
  final bool isLoading;
  final VoidCallback onRefresh;
  final VoidCallback onCheckInOut;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        children: [
          const Icon(Icons.access_time, size: 18, color: AppStitchTheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ready for the day?',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  isCheckedIn
                      ? (hasActiveBreak ? 'On break' : 'Working')
                      : 'Tap check-in to start',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
          TimerWidget(
            seconds: seconds,
            textStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                  color: AppStitchTheme.lightOnSurface,
                ),
          ),
          const SizedBox(width: 10),
          IconButton(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh_rounded),
            color: AppStitchTheme.lightOnSurfaceMuted,
          ),
          const SizedBox(width: 4),
          ElevatedButton(
            onPressed: isLoading ? null : onCheckInOut,
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  isCheckedIn ? const Color(0xFFEF4444) : const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
              elevation: 0,
            ),
            child: isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(isCheckedIn ? 'Check out' : 'Check in'),
          ),
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({
    required this.isLoading,
    required this.leavesCount,
    required this.holidaysCount,
    required this.myTasksCount,
    required this.calendarCount,
    required this.onTapLeaves,
    required this.onTapHolidays,
    required this.onTapTasks,
    required this.onTapCalendar,
  });

  final bool isLoading;
  final int leavesCount;
  final int holidaysCount;
  final int myTasksCount;
  final int calendarCount;
  final VoidCallback onTapLeaves;
  final VoidCallback onTapHolidays;
  final VoidCallback onTapTasks;
  final VoidCallback onTapCalendar;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            children: [
              _KpiPill(
                icon: Icons.beach_access_outlined,
                title: 'Leaves',
                value: isLoading ? '—' : '$leavesCount',
                onTap: onTapLeaves,
              ),
              const SizedBox(height: 10),
              _KpiPill(
                icon: Icons.task_alt_rounded,
                title: 'My tasks',
                value: isLoading ? '—' : '$myTasksCount',
                onTap: onTapTasks,
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            children: [
              _KpiPill(
                icon: Icons.celebration_outlined,
                title: 'Holidays',
                value: isLoading ? '—' : '$holidaysCount',
                onTap: onTapHolidays,
              ),
              const SizedBox(height: 10),
              _KpiPill(
                icon: Icons.event_available_outlined,
                title: 'Calendar',
                value: isLoading ? '—' : '$calendarCount',
                onTap: onTapCalendar,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _KpiPill extends StatelessWidget {
  const _KpiPill({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        borderRadius: 22,
        child: Row(
          children: [
            Icon(icon, color: AppStitchTheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurface,
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoundedTabs extends StatelessWidget {
  const _RoundedTabs({required this.index, required this.onChanged});
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 22,
      padding: const EdgeInsets.all(6),
      child: Row(
        children: [
          Expanded(
            child: _TabChip(
              label: 'Events',
              active: index == 0,
              onTap: () => onChanged(0),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _TabChip(
              label: 'Announcements',
              active: index == 1,
              onTap: () => onChanged(1),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.active,
    required this.onTap,
  });
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color:
              active ? AppStitchTheme.primary.withValues(alpha: 0.12) : Colors.transparent,
        ),
        child: Center(
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: active
                      ? AppStitchTheme.primary
                      : AppStitchTheme.lightOnSurfaceMuted,
                ),
          ),
        ),
      ),
    );
  }
}

class _AnnouncementsCarousel extends StatelessWidget {
  const _AnnouncementsCarousel({
    super.key,
    required this.isLoading,
    required this.items,
    required this.controller,
  });
  final bool isLoading;
  final List<Announcement> items;
  final PageController controller;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (items.isEmpty) {
      return Center(
        child: Text(
          'No announcements',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.lightOnSurfaceMuted,
                fontWeight: FontWeight.w700,
              ),
        ),
      );
    }
    return Column(
      children: [
        Expanded(
          child: PageView.builder(
            controller: controller,
            itemCount: items.length,
            itemBuilder: (context, index) {
              final a = items[index];
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        a.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: AppStitchTheme.lightOnSurface,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Text(
                          a.body.isEmpty ? '—' : a.body,
                          maxLines: 6,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppStitchTheme.lightOnSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(items.length, (i) {
            return AnimatedBuilder(
              animation: controller,
              builder: (context, child) {
                final page = controller.hasClients ? (controller.page ?? 0) : 0.0;
                final active = (page - i).abs() < 0.5;
                return Container(
                  width: active ? 16 : 7,
                  height: 7,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(99),
                    color: active
                        ? AppStitchTheme.primary.withValues(alpha: 0.85)
                        : AppStitchTheme.lightOutline.withValues(alpha: 0.6),
                  ),
                );
              },
            );
          }),
        ),
      ],
    );
  }
}

class _EventsList extends StatelessWidget {
  const _EventsList({
    super.key,
    required this.isLoading,
    required this.events,
    required this.onViewAll,
  });
  final bool isLoading;
  final List<CalendarEvent> events;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Events',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
              ),
              TextButton(onPressed: onViewAll, child: const Text('View all')),
            ],
          ),
          const SizedBox(height: 8),
          if (events.isEmpty)
            Expanded(
              child: Center(
                child: Text(
                  'No events today',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemCount: events.length,
                separatorBuilder: (context, index) => Divider(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.4),
                ),
                itemBuilder: (context, i) {
                  final e = events[i];
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      e.type == 'personal' ? Icons.person : Icons.business,
                      color: AppStitchTheme.primary,
                    ),
                    title: Text(
                      e.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                    ),
                    subtitle: Text(
                      e.date.toIso8601String().split('T').first,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _FloatingQuickAction extends StatelessWidget {
  const _FloatingQuickAction({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            color: AppStitchTheme.primary.withValues(alpha: 0.92),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.18),
                blurRadius: 16,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.timer_outlined, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


