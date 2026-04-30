import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/calendar_model.dart';
import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class HolidaysListPage extends StatefulWidget {
  const HolidaysListPage({super.key});

  @override
  State<HolidaysListPage> createState() => _HolidaysListPageState();
}

class _HolidaysListPageState extends State<HolidaysListPage> {
  List<CalendarEvent> _holidays = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchHolidays();
  }

  Future<void> _fetchHolidays() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await EmployeeService.getCalendarEvents();

      if (response.success && response.data != null) {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);

        // Filter to only upcoming holidays (date >= today)
        final upcomingHolidays = response.data!
            .where((event) => !event.date.isBefore(today))
            .toList();

        upcomingHolidays.sort((x, y) => x.date.compareTo(y.date));

        setState(() {
          _holidays = upcomingHolidays;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.message ?? 'Failed to load holidays';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  String _getDaysUntil(DateTime eventDate) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(eventDate.year, eventDate.month, eventDate.day);

    final diff = target.difference(today).inDays;

    if (diff == 0) return 'TODAY';
    if (diff == 1) return 'TOMORROW';
    return 'IN $diff DAYS';
  }

  String _formatDate(DateTime date) {
    return DateFormat('EEE, MMM d').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                _buildHeader(),
                const SizedBox(height: 16),
                Expanded(child: _buildBody()),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_rounded),
            color: AppStitchTheme.lightOnSurface,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Upcoming Holidays',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_holidays.length} upcoming',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppStitchTheme.kpiHolidays.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.celebration_outlined,
              color: AppStitchTheme.kpiHolidays,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: GlassCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: AppStitchTheme.lightOnSurfaceMuted,
              ),
              const SizedBox(height: 12),
              Text(
                _error!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _fetchHolidays,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_holidays.isEmpty) {
      return Center(
        child: GlassCard(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.celebration_outlined,
                size: 48,
                color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.5),
              ),
              const SizedBox(height: 12),
              Text(
                'No upcoming holidays',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      itemCount: _holidays.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final holiday = _holidays[index];
        return _buildHolidayCard(holiday);
      },
    );
  }

  Widget _buildHolidayCard(CalendarEvent holiday) {
    final daysUntil = _getDaysUntil(holiday.date);
    final formattedDate = _formatDate(holiday.date);

    return GlassCard(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFFB74D),
                  Color(0xFFF57C00),
                ],
              ),
            ),
            child: const Icon(
              Icons.wb_sunny_rounded,
              color: Colors.white,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  holiday.title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      formattedDate,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppStitchTheme.lightSurface.withValues(
                          alpha: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        daysUntil,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppStitchTheme.lightOnSurfaceMuted,
                              fontSize: 10,
                            ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
