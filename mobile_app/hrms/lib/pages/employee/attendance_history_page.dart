import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/attendance_history_model.dart';
import '../../models/presence_model.dart';
import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/app_header.dart';

class AttendanceHistoryPage extends StatefulWidget {
  const AttendanceHistoryPage({super.key});

  @override
  State<AttendanceHistoryPage> createState() => _AttendanceHistoryPageState();
}

class _StatusStyle {
  const _StatusStyle(this.color, this.icon, this.label);
  final Color color;
  final IconData icon;
  final String label;
}

class _AttendanceHistoryPageState extends State<AttendanceHistoryPage> {
  AttendanceHistoryData? _attendanceData;
  bool _isLoading = true;
  String? _error;
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  bool _isCalendarView = false;
  String _filter = 'all';
  String? _selectedDateStr;

  static const _muted = AppStitchTheme.lightOnSurfaceMuted;
  static const _ink = AppStitchTheme.lightOnSurface;

  @override
  void initState() {
    super.initState();
    _fetchAttendanceHistory();
  }

  Future<void> _fetchAttendanceHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await EmployeeService.getAttendanceHistory(
        month: _selectedMonth,
        year: _selectedYear,
        pageSize: 100,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (response.success && response.data != null) {
            _attendanceData = response.data;
            _selectedMonth = response.data!.selectedMonth;
            _selectedYear = response.data!.selectedYear;
            _selectedDateStr = null;
          } else {
            _error = response.message ?? 'Failed to load attendance history';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'An error occurred: ${e.toString()}';
        });
      }
    }
  }

  void _goToMonth(int year, int month) {
    setState(() {
      _selectedYear = year;
      _selectedMonth = month;
    });
    _fetchAttendanceHistory();
  }

  void _navigateMonth(int direction) {
    final d = DateTime(_selectedYear, _selectedMonth + direction, 1);
    _goToMonth(d.year, d.month);
  }

  bool get _isCurrentMonth {
    final now = DateTime.now();
    return _selectedYear == now.year && _selectedMonth == now.month;
  }

  _StatusStyle _style(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return const _StatusStyle(Color(0xFF10B981), Icons.check_circle_rounded, 'Present');
      case 'leave':
        return const _StatusStyle(Color(0xFFF59E0B), Icons.beach_access_rounded, 'On leave');
      case 'half_day':
        return const _StatusStyle(Color(0xFF8B5CF6), Icons.timelapse_rounded, 'Half day');
      case 'absent':
        return const _StatusStyle(Color(0xFFEF4444), Icons.cancel_rounded, 'Absent');
      case 'holiday':
        return const _StatusStyle(Color(0xFF0EA5E9), Icons.celebration_rounded, 'Holiday');
      case 'weekend':
        return const _StatusStyle(Color(0xFF94A3B8), Icons.weekend_rounded, 'Weekend');
      default:
        return _StatusStyle(const Color(0xFF94A3B8), Icons.help_outline_rounded, _titleCase(status));
    }
  }

  String _titleCase(String status) {
    if (status.isEmpty) return '—';
    return status
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }

  DateTime _parse(String s) => DateTime.tryParse(s) ?? DateTime.now();

  bool _isToday(DateTime d) {
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month && d.day == n.day;
  }

  bool _isFuture(DateTime d) {
    final n = DateTime.now();
    return DateTime(d.year, d.month, d.day).isAfter(DateTime(n.year, n.month, n.day));
  }

  bool _isHoliday(MonthlyAttendance r) => (r.holidayName ?? '').isNotEmpty || r.status.toLowerCase() == 'holiday';

  bool _isOffDay(MonthlyAttendance r) {
    final s = r.status.toLowerCase();
    return r.isWeekend || s == 'weekend' || _isHoliday(r);
  }

  /// Visual style of a day: company holiday > weekend/weekly off > the attendance status.
  _StatusStyle _dayStyle(MonthlyAttendance r) {
    if (_isHoliday(r)) return _style('holiday');
    if (r.isWeekend || r.status.toLowerCase() == 'weekend') return _style('weekend');
    return _style(r.status);
  }

  String _clock(String v) => (v.isEmpty || v == '-') ? '—' : v;

  /// HH:mm for compact rows (drops seconds); other formats pass through.
  String _short(String v) {
    final m = RegExp(r'^(\d{1,2}:\d{2}):\d{2}(.*)$').firstMatch(v.trim());
    return m == null ? _clock(v) : '${m.group(1)}${m.group(2)}';
  }

  String _hours(String v) {
    final n = double.tryParse(v);
    return n == null ? v : '${n.toStringAsFixed(2)} h';
  }

  // ───────────────────────────── build ─────────────────────────────

  @override
  Widget build(BuildContext context) {
    final canPop = ModalRoute.of(context)?.canPop ?? false;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              children: [
                if (canPop)
                  AppHeader(
                    title: 'Attendance',
                    subtitle: DateFormat('MMMM yyyy').format(DateTime(_selectedYear, _selectedMonth)),
                    showBackButton: true,
                  ),
                if (canPop) const SizedBox(height: 12),
                Expanded(
                  child: _isLoading && _attendanceData == null
                      ? _buildSkeleton()
                      : _error != null && _attendanceData == null
                          ? _buildErrorState()
                          : _attendanceData == null
                              ? _buildEmptyState()
                              : _buildContent(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _fetchAttendanceHistory,
      color: AppStitchTheme.primary,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 28),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          _buildMonthBar(),
          const SizedBox(height: 14),
          AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: _isLoading ? 0.45 : 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHero(),
                const SizedBox(height: 12),
                _buildStatTiles(),
                const SizedBox(height: 20),
                _buildViewToggle(),
                const SizedBox(height: 14),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  child: KeyedSubtree(
                    key: ValueKey(_isCalendarView),
                    child: _isCalendarView ? _buildCalendarView() : _buildRecordsList(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────── month bar ───────────────────────────

  Widget _buildMonthBar() {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      borderRadius: 24,
      child: Row(
        children: [
          IconButton(
            tooltip: 'Previous month',
            onPressed: () => _navigateMonth(-1),
            icon: const Icon(Icons.chevron_left_rounded, size: 28),
            color: _ink,
          ),
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: _pickMonth,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          DateFormat('MMMM yyyy').format(DateTime(_selectedYear, _selectedMonth)),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _ink),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.expand_more_rounded, size: 20, color: _muted),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _isCurrentMonth ? 'This month' : 'Tap to jump to a month',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _muted),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (!_isCurrentMonth)
            TextButton(
              onPressed: () {
                final n = DateTime.now();
                _goToMonth(n.year, n.month);
              },
              style: TextButton.styleFrom(
                foregroundColor: AppStitchTheme.primary,
                minimumSize: const Size(48, 36),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: const Text('Today', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          IconButton(
            tooltip: 'Next month',
            onPressed: () => _navigateMonth(1),
            icon: const Icon(Icons.chevron_right_rounded, size: 28),
            color: _ink,
          ),
        ],
      ),
    );
  }

  Future<void> _pickMonth() async {
    final years = (_attendanceData?.years.isNotEmpty ?? false)
        ? ([..._attendanceData!.years]..sort())
        : [DateTime.now().year - 1, DateTime.now().year, DateTime.now().year + 1];
    int pickYear = _selectedYear;
    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          final yi = years.indexOf(pickYear);
          return Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _grabHandle(),
                  Row(
                    children: [
                      IconButton(
                        onPressed: yi > 0 ? () => setSheet(() => pickYear = years[yi - 1]) : null,
                        icon: const Icon(Icons.chevron_left_rounded),
                      ),
                      Expanded(
                        child: Center(
                          child: Text('$pickYear', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _ink)),
                        ),
                      ),
                      IconButton(
                        onPressed: yi >= 0 && yi < years.length - 1 ? () => setSheet(() => pickYear = years[yi + 1]) : null,
                        icon: const Icon(Icons.chevron_right_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  GridView.count(
                    crossAxisCount: 4,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.9,
                    children: List.generate(12, (i) {
                      final m = i + 1;
                      final selected = pickYear == _selectedYear && m == _selectedMonth;
                      return InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.pop(ctx, DateTime(pickYear, m)),
                        child: Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: selected ? AppStitchTheme.primary : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            DateFormat('MMM').format(DateTime(2000, m)),
                            style: TextStyle(fontWeight: FontWeight.w800, color: selected ? Colors.white : _ink),
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    if (picked != null) _goToMonth(picked.year, picked.month);
  }

  Widget _grabHandle() => Center(
        child: Container(
          width: 40,
          height: 4,
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(color: AppStitchTheme.lightOutline, borderRadius: BorderRadius.circular(2)),
        ),
      );

  // ───────────────────────────── summary ─────────────────────────────

  Widget _buildHero() {
    final s = _attendanceData!.summary;
    final rate = s.workingDays > 0 ? (s.present / s.workingDays).clamp(0.0, 1.0).toDouble() : 0.0;
    final presentLabel = s.present == s.present.truncateToDouble() ? s.present.toInt().toString() : s.present.toString();
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF4B2BEE), Color(0xFF7C5CFA), Color(0xFF4285F4)],
        ),
        boxShadow: [
          BoxShadow(color: AppStitchTheme.primary.withValues(alpha: 0.32), blurRadius: 24, offset: const Offset(0, 12)),
        ],
      ),
      child: Row(
        children: [
          SizedBox(
            width: 92,
            height: 92,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: rate),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, v, _) => CustomPaint(
                painter: _RingPainter(v),
                child: Center(
                  child: Text(
                    '${(v * 100).round()}%',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Attendance rate',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xCCFFFFFF)),
                ),
                const SizedBox(height: 4),
                Text(
                  s.workingDays > 0 ? '$presentLabel of ${s.workingDays} days' : 'No working days yet',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, height: 1.15),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (s.late > 0) _heroChip(Icons.schedule_rounded, '${s.late} late'),
                    if (s.absent > 0) _heroChip(Icons.cancel_rounded, '${_num(s.absent)} absent'),
                    if (s.late == 0 && s.absent == 0) _heroChip(Icons.emoji_events_rounded, 'Great record!'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroChip(IconData icon, String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.20), borderRadius: BorderRadius.circular(999)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: Colors.white),
            const SizedBox(width: 4),
            Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
          ],
        ),
      );

  String _num(num v) => v == v.truncateToDouble() ? v.toInt().toString() : v.toString();

  Widget _buildStatTiles() {
    final s = _attendanceData!.summary;
    final tiles = <List<Object>>[
      ['Present', s.present, _style('present')],
      ['Absent', s.absent, _style('absent')],
      ['Leave', s.leave, _style('leave')],
      ['Half day', s.halfDay, _style('half_day')],
      ['Late', s.late, const _StatusStyle(Color(0xFFEC4899), Icons.schedule_rounded, 'Late')],
      ['Working days', s.workingDays, const _StatusStyle(Color(0xFF2563EB), Icons.calendar_month_rounded, 'Working days')],
    ];
    return LayoutBuilder(
      builder: (context, c) {
        const gap = 10.0;
        final w = (c.maxWidth - gap * 2) / 3;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: tiles.map((t) {
            final st = t[2] as _StatusStyle;
            return SizedBox(
              width: w,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.82),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.7)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: st.color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(10)),
                      child: Icon(st.icon, size: 16, color: st.color),
                    ),
                    const SizedBox(height: 8),
                    Text(_num(t[1] as num), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: _ink, height: 1)),
                    const SizedBox(height: 3),
                    Text(t[0] as String, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: _muted)),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  // ───────────────────────────── toggle ─────────────────────────────

  Widget _buildViewToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.7)),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            alignment: _isCalendarView ? Alignment.centerRight : Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: 0.5,
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: AppStitchTheme.primary,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(color: AppStitchTheme.primary.withValues(alpha: 0.30), blurRadius: 10, offset: const Offset(0, 4))],
                ),
              ),
            ),
          ),
          Row(
            children: [
              _toggleItem('List', Icons.view_agenda_rounded, !_isCalendarView, () => setState(() => _isCalendarView = false)),
              _toggleItem('Calendar', Icons.calendar_month_rounded, _isCalendarView, () => setState(() => _isCalendarView = true)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _toggleItem(String label, IconData icon, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          height: 40,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: active ? Colors.white : _muted),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: active ? Colors.white : _muted)),
            ],
          ),
        ),
      ),
    );
  }

  // ───────────────────────────── calendar ─────────────────────────────

  Widget _buildCalendarView() {
    final data = _attendanceData!;
    final byDate = {for (final r in data.monthlyData) r.date: r};
    final first = DateTime(_selectedYear, _selectedMonth, 1);
    final daysInMonth = DateTime(_selectedYear, _selectedMonth + 1, 0).day;
    final lead = first.weekday % 7; // Sunday-first grid
    final rows = ((lead + daysInMonth) / 7).ceil();
    final selected = _selectedDateStr == null ? null : byDate[_selectedDateStr];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(10, 14, 10, 12),
          borderRadius: 26,
          child: Column(
            children: [
              Row(
                children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                    .map((d) => Expanded(
                          child: Center(
                            child: Text(d, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: _muted)),
                          ),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 8),
              for (var w = 0; w < rows; w++)
                Row(
                  children: List.generate(7, (c) {
                    final day = w * 7 + c - lead + 1;
                    if (day < 1 || day > daysInMonth) return const Expanded(child: SizedBox(height: 46));
                    final date = DateTime(_selectedYear, _selectedMonth, day);
                    final key = DateFormat('yyyy-MM-dd').format(date);
                    return Expanded(child: _calendarCell(day, date, byDate[key], key));
                  }),
                ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 12,
                runSpacing: 6,
                alignment: WrapAlignment.center,
                children: [
                  for (final s in ['present', 'half_day', 'leave', 'absent', 'holiday', 'weekend'])
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(width: 9, height: 9, decoration: BoxDecoration(color: _style(s).color, shape: BoxShape.circle)),
                      const SizedBox(width: 5),
                      Text(_style(s).label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _muted)),
                    ]),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (selected != null)
          _buildRecordCard(selected)
        else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Center(
              child: Text(
                data.monthlyData.isEmpty ? 'No attendance records for this month' : 'Tap a day to see its details',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _muted),
              ),
            ),
          ),
      ],
    );
  }

  Widget _calendarCell(int day, DateTime date, MonthlyAttendance? rec, String key) {
    final today = _isToday(date);
    final future = _isFuture(date);
    final holiday = rec != null && _isHoliday(rec);
    final weekend = rec != null && !holiday && _isOffDay(rec);
    final style = rec == null ? null : _dayStyle(rec);
    // Holidays and weekends are always marked (even in the future); attendance colours only for past/today.
    final filled = style != null && (holiday || weekend || !future);
    final isSel = _selectedDateStr == key;
    final worked = weekend && rec.checkIn != '-' && rec.checkIn.isNotEmpty;
    final numberColor = holiday
        ? style!.color
        : weekend
            ? const Color(0xFF64748B)
            : future
                ? _muted.withValues(alpha: 0.55)
                : (filled ? style.color : _ink);
    return GestureDetector(
      onTap: rec == null ? null : () => setState(() => _selectedDateStr = isSel ? null : key),
      child: Container(
        height: 42,
        margin: const EdgeInsets.all(2.5),
        decoration: BoxDecoration(
          color: filled ? style.color.withValues(alpha: isSel ? 0.32 : (weekend ? 0.18 : 0.16)) : (isSel ? AppStitchTheme.primary.withValues(alpha: 0.10) : Colors.transparent),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: today ? AppStitchTheme.primary : (isSel ? AppStitchTheme.primary.withValues(alpha: 0.6) : Colors.transparent),
            width: today ? 2 : 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '$day',
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: today || filled ? FontWeight.w900 : FontWeight.w600,
                color: numberColor,
              ),
            ),
            const SizedBox(height: 3),
            // holiday: blue dot; weekend: grey dot (green when worked); working day: attendance dot
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: filled ? (worked ? _style('present').color : style.color) : Colors.transparent,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ───────────────────────────── list ─────────────────────────────

  bool _matchesFilter(MonthlyAttendance r) {
    switch (_filter) {
      case 'present':
        return r.status.toLowerCase() == 'present';
      case 'absent':
        return r.status.toLowerCase() == 'absent';
      case 'leave':
        return r.status.toLowerCase() == 'leave';
      case 'half_day':
        return r.status.toLowerCase() == 'half_day';
      case 'late':
        return r.isLate;
      default:
        return true;
    }
  }

  Widget _buildFilterChips() {
    const filters = [
      ['all', 'All'],
      ['present', 'Present'],
      ['absent', 'Absent'],
      ['leave', 'Leave'],
      ['half_day', 'Half day'],
      ['late', 'Late'],
    ];
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final f = filters[i];
          final active = _filter == f[0];
          return ChoiceChip(
            label: Text(f[1]),
            selected: active,
            onSelected: (_) => setState(() => _filter = f[0]),
            showCheckmark: false,
            labelStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: active ? Colors.white : _ink),
            selectedColor: AppStitchTheme.primary,
            backgroundColor: Colors.white.withValues(alpha: 0.8),
            side: BorderSide(color: active ? AppStitchTheme.primary : AppStitchTheme.lightOutline.withValues(alpha: 0.7)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          );
        },
      ),
    );
  }

  Widget _buildRecordsList() {
    final all = [..._attendanceData!.monthlyData]..sort((a, b) => b.date.compareTo(a.date));
    if (all.isEmpty) return _emptyMonthCard();
    final shown = all.where(_matchesFilter).toList();

    final children = <Widget>[_buildFilterChips(), const SizedBox(height: 14)];
    if (shown.isEmpty) {
      children.add(_emptyMonthCard(message: 'No records match this filter'));
    } else {
      String? lastWeek;
      for (final r in shown) {
        final d = _parse(r.date);
        final monday = DateTime(d.year, d.month, d.day).subtract(Duration(days: d.weekday - 1));
        final wk = DateFormat('yyyy-MM-dd').format(monday);
        if (wk != lastWeek) {
          lastWeek = wk;
          final sunday = monday.add(const Duration(days: 6));
          children.add(Padding(
            padding: const EdgeInsets.fromLTRB(4, 6, 4, 8),
            child: Text(
              '${DateFormat('d MMM').format(monday)} – ${DateFormat('d MMM').format(sunday)}',
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: _muted, letterSpacing: 0.3),
            ),
          ));
        }
        children.add(_buildRecordCard(r));
      }
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: children);
  }

  Widget _emptyMonthCard({String message = 'No attendance records for this month'}) {
    return GlassCard(
      padding: const EdgeInsets.all(22),
      borderRadius: 24,
      child: Column(
        children: [
          Icon(Icons.event_busy_rounded, size: 36, color: _muted.withValues(alpha: 0.6)),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _muted)),
        ],
      ),
    );
  }

  Widget _buildRecordCard(MonthlyAttendance r) {
    final date = _parse(r.date);
    final today = _isToday(date);
    final future = _isFuture(date);
    final off = _isOffDay(r);
    final holiday = _isHoliday(r);
    final st = _dayStyle(r);
    final accent = future && !off ? const Color(0xFF94A3B8) : st.color;
    final hasTimes = r.checkIn != '-' || r.checkOut != '-';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Opacity(
        opacity: future || (off && !hasTimes) ? 0.72 : 1,
        child: Material(
          color: Colors.white.withValues(alpha: 0.86),
          borderRadius: BorderRadius.circular(22),
          child: InkWell(
            borderRadius: BorderRadius.circular(22),
            onTap: () => _showRecordDetails(r),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: today ? AppStitchTheme.primary.withValues(alpha: 0.7) : AppStitchTheme.lightOutline.withValues(alpha: 0.7), width: today ? 1.6 : 1),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 52,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.13), borderRadius: BorderRadius.circular(16)),
                    child: Column(
                      children: [
                        Text(DateFormat('EEE').format(date).toUpperCase(), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: accent, letterSpacing: 0.6)),
                        const SizedBox(height: 2),
                        Text('${date.day}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: accent, height: 1.05)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _pill(holiday && (r.holidayName ?? '').isNotEmpty ? 'Holiday · ${r.holidayName}' : (future && !off ? 'Upcoming' : st.label), future && !off ? const Color(0xFF94A3B8) : st.color, icon: future && !off ? null : st.icon),
                            if (today) _pill('Today', AppStitchTheme.primary, solid: true),
                            if (r.isLate && !future) _pill(r.lateDuration != null && r.lateDuration!.isNotEmpty ? 'Late ${r.lateDuration}' : 'Late', const Color(0xFFEC4899)),
                          ],
                        ),
                        if (hasTimes) ...[
                          const SizedBox(height: 8),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.login_rounded, size: 15, color: r.isLate ? const Color(0xFFEC4899) : const Color(0xFF10B981)),
                                const SizedBox(width: 4),
                                Text(_short(r.checkIn), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _ink)),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 6),
                                  child: Icon(Icons.arrow_right_alt_rounded, size: 18, color: _muted),
                                ),
                                const Icon(Icons.logout_rounded, size: 15, color: Color(0xFFEF4444)),
                                const SizedBox(width: 4),
                                Text(_short(r.checkOut), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _ink)),
                              ],
                            ),
                          ),
                          if (r.totalHours != '-' && r.totalHours.isNotEmpty && !future) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.timer_outlined, size: 14, color: _muted),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text('${_hours(r.totalHours)} worked', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _muted)),
                                ),
                              ],
                            ),
                          ],
                        ] else if (!future && !off && r.status.toLowerCase() == 'absent') ...[
                          const SizedBox(height: 6),
                          const Text('No punch recorded', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _muted)),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.chevron_right_rounded, color: _muted, size: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _pill(String text, Color color, {IconData? icon, bool solid = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: solid ? color : color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 13, color: color), const SizedBox(width: 4)],
          Text(text, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: solid ? Colors.white : color)),
        ],
      ),
    );
  }

  // ───────────────────────────── details ─────────────────────────────

  void _showRecordDetails(MonthlyAttendance r) {
    final date = _parse(r.date);
    final off = _isOffDay(r);
    final st = _dayStyle(r);
    final overtime = r.overtimeHours != '-' && r.overtimeHours != '0' && r.overtimeHours.isNotEmpty;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.72,
        minChildSize: 0.45,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scroll) => Container(
          decoration: const BoxDecoration(
            color: Color(0xFFF8FAFC),
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
            children: [
              _grabHandle(),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: st.color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(16)),
                    child: Icon(st.icon, color: st.color, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(DateFormat('EEEE').format(date), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _ink)),
                        const SizedBox(height: 2),
                        Text(DateFormat('d MMMM yyyy').format(date), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: _muted)),
                      ],
                    ),
                  ),
                  _pill(_isFuture(date) && !off ? 'Upcoming' : st.label, st.color, icon: st.icon),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(child: _bigStat('Check in', _clock(r.checkIn), Icons.login_rounded, r.isLate ? const Color(0xFFEC4899) : const Color(0xFF10B981))),
                  const SizedBox(width: 10),
                  Expanded(child: _bigStat('Check out', _clock(r.checkOut), Icons.logout_rounded, const Color(0xFFEF4444))),
                  const SizedBox(width: 10),
                  Expanded(child: _bigStat('Worked', _clock(r.totalHours), Icons.timer_rounded, AppStitchTheme.primary)),
                ],
              ),
              const SizedBox(height: 12),
              if (r.isLate && r.lateDuration != null && r.lateDuration!.isNotEmpty)
                _noteBanner(Icons.warning_amber_rounded, 'You were late by ${r.lateDuration}', const Color(0xFFEC4899)),
              if (overtime) _noteBanner(Icons.bolt_rounded, 'Overtime: ${r.overtimeHours}', const Color(0xFF8B5CF6)),
              const SizedBox(height: 4),
              _infoRow(Icons.schedule_rounded, 'Shift', _clock(r.shift)),
              if (_isHoliday(r) && (r.holidayName ?? '').isNotEmpty) _infoRow(Icons.celebration_rounded, 'Holiday', r.holidayName!),
              if (r.requiredFullHours != null && !off)
                _infoRow(
                  Icons.rule_rounded,
                  'Required that day',
                  'Present ≥ ${_num(r.requiredFullHours!)}h · Half ≥ ${_num(r.requiredHalfHours ?? 0)}h',
                ),
              if (r.breakTime != '-' && r.breakTime.isNotEmpty) _infoRow(Icons.coffee_rounded, 'Break time', r.breakTime),
              _infoRow(
                r.source == 'teams' ? Icons.groups_rounded : (r.source == 'admin' ? Icons.admin_panel_settings_rounded : Icons.touch_app_rounded),
                'Recorded via',
                r.source == 'teams'
                    ? 'Microsoft Teams status'
                    : r.source == 'admin'
                        ? 'Edited by admin'
                        : 'Manual punch',
              ),
              if (!r.isWeekend && r.checkIn != '-')
                FutureBuilder<PresenceSummary?>(
                  future: EmployeeService.getPresenceSummary(date: r.date),
                  builder: (context, snap) {
                    if (snap.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.only(top: 16),
                        child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4))),
                      );
                    }
                    final p = snap.data;
                    if (p == null || !p.hasData) return const SizedBox.shrink();
                    return _buildTeamsActivity(p);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bigStat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _ink)),
          ),
          const SizedBox(height: 3),
          Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: _muted)),
        ],
      ),
    );
  }

  Widget _noteBanner(IconData icon, String text, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Icon(icon, size: 19, color: color),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: color))),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 19, color: _muted),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: _muted)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _ink)),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamsActivity(PresenceSummary p) {
    const muted = TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _muted);
    const bold = TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: _ink);
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.groups_rounded, size: 18, color: AppStitchTheme.primary),
              SizedBox(width: 8),
              Text('Microsoft Teams activity', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: _ink)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (final e in [
                ['Working', p.workingLabel ?? '0h 00m'],
                ['Overtime', p.overtimeLabel ?? '0h 00m'],
                ['Punch', '${p.punchIn ?? '--:--'} / ${p.punchLive ? 'Live' : (p.punchOut ?? '--:--')}'],
              ])
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [Text(e[0], style: muted), const SizedBox(height: 2), Text(e[1], style: bold)],
                  ),
                ),
            ],
          ),
          if (p.statuses.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text('Status totals', style: muted),
            for (final s in p.statuses)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(children: [Expanded(child: Text(s.status, style: bold)), Text(s.label, style: muted)]),
              ),
          ],
          if (p.timeline.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text('Timeline', style: muted),
            for (final x in p.timeline)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(children: [
                  Expanded(child: Text(x.status, style: bold)),
                  Text('${x.start} – ${x.end} · ${x.label}', style: muted),
                ]),
              ),
          ],
          if (p.sessions.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text('Sessions', style: muted),
            for (final x in p.sessions)
              Padding(padding: const EdgeInsets.only(top: 6), child: Text('${x.start} – ${x.end}', style: bold)),
          ],
        ],
      ),
    );
  }

  // ───────────────────── loading / error / empty ─────────────────────

  Widget _buildSkeleton() {
    Widget box(double h, {double? w, double r = 22}) => TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.45, end: 0.9),
          duration: const Duration(milliseconds: 900),
          curve: Curves.easeInOut,
          builder: (context, v, _) => Container(
            height: h,
            width: w,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: v * 0.8), borderRadius: BorderRadius.circular(r)),
          ),
          onEnd: () {},
        );
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      children: [
        box(64, r: 24),
        const SizedBox(height: 14),
        box(128, r: 28),
        const SizedBox(height: 12),
        Row(children: [Expanded(child: box(92)), const SizedBox(width: 10), Expanded(child: box(92)), const SizedBox(width: 10), Expanded(child: box(92))]),
        const SizedBox(height: 12),
        for (var i = 0; i < 4; i++) ...[box(84), const SizedBox(height: 10)],
      ],
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFFEF4444).withValues(alpha: 0.10)),
              child: const Icon(Icons.wifi_off_rounded, color: Color(0xFFEF4444), size: 28),
            ),
            const SizedBox(height: 14),
            const Text('Couldn’t load attendance', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _ink)),
            const SizedBox(height: 6),
            Text(_error ?? '', textAlign: TextAlign.center, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: _muted)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _fetchAttendanceHistory,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try again'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppStitchTheme.primary.withValues(alpha: 0.10)),
              child: const Icon(Icons.calendar_today_rounded, color: AppStitchTheme.primary, size: 28),
            ),
            const SizedBox(height: 14),
            const Text('No attendance data', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _ink)),
            const SizedBox(height: 6),
            const Text('Your records will appear here once available.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: _muted)),
          ],
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.progress);
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 9.0;
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = Colors.white.withValues(alpha: 0.25);
    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = Colors.white;
    canvas.drawArc(rect, 0, math.pi * 2, false, track);
    if (progress > 0) canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * progress, false, arc);
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) => old.progress != progress;
}
