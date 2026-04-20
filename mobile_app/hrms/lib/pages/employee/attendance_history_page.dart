import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/attendance_history_model.dart';
import '../../services/employee_service.dart';

class AttendanceHistoryPage extends StatefulWidget {
  const AttendanceHistoryPage({super.key});

  @override
  State<AttendanceHistoryPage> createState() => _AttendanceHistoryPageState();
}

class _AttendanceHistoryPageState extends State<AttendanceHistoryPage> {
  AttendanceHistoryData? _attendanceData;
  bool _isLoading = true;
  String? _error;
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  bool _isCalendarView = false;

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
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (response.success && response.data != null) {
            _attendanceData = response.data;
            _selectedMonth = response.data!.selectedMonth;
            _selectedYear = response.data!.selectedYear;
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

  void _navigateMonth(int direction) {
    setState(() {
      if (direction > 0) {
        // Next month
        if (_selectedMonth == 12) {
          _selectedMonth = 1;
          _selectedYear++;
        } else {
          _selectedMonth++;
        }
      } else {
        // Previous month
        if (_selectedMonth == 1) {
          _selectedMonth = 12;
          _selectedYear--;
        } else {
          _selectedMonth--;
        }
      }
    });
    _fetchAttendanceHistory();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return const Color(0xFF10B981);
      case 'leave':
        return const Color(0xFFF59E0B);
      case 'half_day':
        return const Color(0xFF8B5CF6);
      case 'absent':
        return const Color(0xFFEF4444);
      case 'weekend':
        return const Color(0xFF6B7280);
      default:
        return const Color(0xFF6B7280);
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return const Color(0xFFD1FAE5);
      case 'leave':
        return const Color(0xFFFEF3C7);
      case 'half_day':
        return const Color(0xFFE9D5FF);
      case 'absent':
        return const Color(0xFFFEE2E2);
      case 'weekend':
        return const Color(0xFFF3F4F6);
      default:
        return const Color(0xFFF3F4F6);
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return Icons.check_circle;
      case 'leave':
        return Icons.beach_access;
      case 'half_day':
        return Icons.access_time;
      case 'absent':
        return Icons.cancel;
      case 'weekend':
        return Icons.weekend;
      default:
        return Icons.help_outline;
    }
  }

  String _formatStatus(String status) {
    if (status.isEmpty) return '—';
    return status
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isEmpty
            ? ''
            : word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final recordDate = DateTime(date.year, date.month, date.day);

      if (recordDate == today) {
        return 'Today';
      } else if (recordDate == today.subtract(const Duration(days: 1))) {
        return 'Yesterday';
      } else {
        return DateFormat('MMM dd').format(date);
      }
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : _attendanceData == null
                  ? _buildEmptyState()
                  : _buildContent(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              color: Colors.red.shade400,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFEF4444),
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _fetchAttendanceHistory,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            const Text(
              'No attendance data available',
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your attendance records will appear here',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF9CA3AF),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _fetchAttendanceHistory,
      color: const Color(0xFF4F46E5),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 16),
            _buildMonthYearSelector(),
            const SizedBox(height: 16),
            _buildSummaryCards(),
            const SizedBox(height: 24),
            _buildViewToggle(),
            const SizedBox(height: 16),
            _isCalendarView ? _buildCalendarView() : _buildRecordsList(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Attendance History',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _attendanceData!.selectedMonthName.isNotEmpty
                    ? '${_attendanceData!.selectedMonthName} $_selectedYear'
                    : DateFormat('MMMM yyyy').format(DateTime(_selectedYear, _selectedMonth)),
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF6B7280),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMonthYearSelector() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => _navigateMonth(-1),
                icon: const Icon(Icons.chevron_left),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFF3F4F6),
                  foregroundColor: const Color(0xFF111827),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Month',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButton<int>(
                        value: _selectedMonth,
                        isExpanded: true,
                        underline: const SizedBox(),
                        items: _attendanceData!.months.map((month) {
                          return DropdownMenuItem<int>(
                            value: month.value,
                            child: Text(month.name),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              _selectedMonth = value;
                            });
                            _fetchAttendanceHistory();
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Year',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButton<int>(
                        value: _selectedYear,
                        isExpanded: true,
                        underline: const SizedBox(),
                        items: _attendanceData!.years.map((year) {
                          return DropdownMenuItem<int>(
                            value: year,
                            child: Text(year.toString()),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              _selectedYear = value;
                            });
                            _fetchAttendanceHistory();
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: () => _navigateMonth(1),
                icon: const Icon(Icons.chevron_right),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFF3F4F6),
                  foregroundColor: const Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () {
              final now = DateTime.now();
              setState(() {
                _selectedMonth = now.month;
                _selectedYear = now.year;
              });
              _fetchAttendanceHistory();
            },
            icon: const Icon(Icons.today, size: 18),
            label: const Text('Go to Current Month'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final summary = _attendanceData!.summary;
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.8,
      children: [
        _buildSummaryCard(
          'Present',
          summary.present,
          const Color(0xFF10B981),
          const Color(0xFFD1FAE5),
          Icons.check_circle,
        ),
        _buildSummaryCard(
          'Absent',
          summary.absent,
          const Color(0xFFEF4444),
          const Color(0xFFFEE2E2),
          Icons.cancel,
        ),
        _buildSummaryCard(
          'Leave',
          summary.leave,
          const Color(0xFFF59E0B),
          const Color(0xFFFEF3C7),
          Icons.beach_access,
        ),
        _buildSummaryCard(
          'Half Day',
          summary.halfDay,
          const Color(0xFF8B5CF6),
          const Color(0xFFE9D5FF),
          Icons.access_time,
        ),
        _buildSummaryCard(
          'Late',
          summary.late,
          const Color(0xFFEC4899),
          const Color(0xFFFCE7F3),
          Icons.schedule,
        ),
        _buildSummaryCard(
          'Working Days',
          summary.workingDays,
          const Color(0xFF2563EB),
          const Color(0xFFDBEAFE),
          Icons.calendar_today,
        ),
      ],
    );
  }

  Widget _buildSummaryCard(
    String label,
    int value,
    Color textColor,
    Color bgColor,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: textColor.withOpacity(0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: textColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: textColor, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value.toString(),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildViewToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildToggleButton('List', !_isCalendarView, () {
              setState(() {
                _isCalendarView = false;
              });
            }),
          ),
          Expanded(
            child: _buildToggleButton('Calendar', _isCalendarView, () {
              setState(() {
                _isCalendarView = true;
              });
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleButton(String label, bool isActive, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF4F46E5) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isActive ? Colors.white : const Color(0xFF6B7280),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarView() {
    if (_attendanceData!.monthlyData.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: const Center(
          child: Text(
            'No attendance records for this month',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF6B7280),
            ),
          ),
        ),
      );
    }

    // Group records by date for calendar view
    final recordsByDate = <String, MonthlyAttendance>{};
    for (var record in _attendanceData!.monthlyData) {
      recordsByDate[record.date] = record;
    }

    // Get first day of month and number of days
    final firstDay = DateTime(_selectedYear, _selectedMonth, 1);
    final lastDay = DateTime(_selectedYear, _selectedMonth + 1, 0);
    final daysInMonth = lastDay.day;
    final startWeekday = firstDay.weekday;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          // Weekday headers
          Row(
            children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                .map((day) => Expanded(
                      child: Center(
                        child: Text(
                          day,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),
          // Calendar grid
          ...List.generate((daysInMonth + startWeekday - 1) ~/ 7 + 1, (week) {
            return Row(
              children: List.generate(7, (day) {
                final dayIndex = week * 7 + day - startWeekday + 1;
                if (dayIndex < 1 || dayIndex > daysInMonth) {
                  return const Expanded(child: SizedBox());
                }

                final dateStr = DateFormat('yyyy-MM-dd')
                    .format(DateTime(_selectedYear, _selectedMonth, dayIndex));
                final record = recordsByDate[dateStr];
                final isToday = DateTime.now().year == _selectedYear &&
                    DateTime.now().month == _selectedMonth &&
                    DateTime.now().day == dayIndex;

                return Expanded(
                  child: GestureDetector(
                    onTap: record != null
                        ? () => _showRecordDetails(record)
                        : null,
                    child: Container(
                      margin: const EdgeInsets.all(2),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: record != null
                            ? _getStatusBgColor(record.status)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isToday
                              ? const Color(0xFF4F46E5)
                              : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            dayIndex.toString(),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                              color: isToday
                                  ? const Color(0xFF4F46E5)
                                  : const Color(0xFF111827),
                            ),
                          ),
                          if (record != null) ...[
                            const SizedBox(height: 4),
                            Icon(
                              _getStatusIcon(record.status),
                              size: 16,
                              color: _getStatusColor(record.status),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildRecordsList() {
    if (_attendanceData!.monthlyData.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: const Center(
          child: Text(
            'No attendance records for this month',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF6B7280),
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Daily Records',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 12),
        ..._attendanceData!.monthlyData.map((record) => _buildRecordCard(record)),
      ],
    );
  }

  Widget _buildRecordCard(MonthlyAttendance record) {
    final isFutureDate = DateTime.parse(record.date).isAfter(DateTime.now());
    final isWeekend = record.isWeekend;
    final date = DateTime.parse(record.date);
    final isToday = DateTime.now().year == date.year &&
        DateTime.now().month == date.month &&
        DateTime.now().day == date.day;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isWeekend ? const Color(0xFFF3F4F6) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isToday
              ? const Color(0xFF4F46E5)
              : const Color(0xFFE5E7EB),
          width: isToday ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showRecordDetails(record),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _getStatusBgColor(record.status),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getStatusIcon(record.status),
                        color: _getStatusColor(record.status),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                _formatDate(record.date),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF111827),
                                ),
                              ),
                              if (isToday) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF4F46E5),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Today',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            record.dayName,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    _buildStatusBadge(record.status, isFutureDate),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoChip(
                        Icons.login,
                        'Check In',
                        record.checkIn,
                        record.isLate && record.status == 'present',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildInfoChip(
                        Icons.logout,
                        'Check Out',
                        record.checkOut,
                        false,
                      ),
                    ),
                  ],
                ),
                if (record.isLate && record.lateDuration != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.access_time,
                          size: 16,
                          color: Color(0xFFEF4444),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Late: ${record.lateDuration}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, String value, bool isHighlighted) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isHighlighted
              ? const Color(0xFFEF4444)
              : const Color(0xFFE5E7EB),
          width: isHighlighted ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF6B7280)),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isHighlighted
                        ? const Color(0xFFEF4444)
                        : const Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status, bool isFutureDate) {
    if (isFutureDate) {
      return const Text(
        '—',
        style: TextStyle(
          fontSize: 14,
          color: Color(0xFF9CA3AF),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _getStatusBgColor(status),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _getStatusColor(status).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getStatusIcon(status),
            size: 14,
            color: _getStatusColor(status),
          ),
          const SizedBox(width: 4),
          Text(
            _formatStatus(status),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _getStatusColor(status),
            ),
          ),
        ],
      ),
    );
  }

  void _showRecordDetails(MonthlyAttendance record) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _getStatusBgColor(record.status),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _getStatusIcon(record.status),
                        color: _getStatusColor(record.status),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _formatDate(record.date),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF111827),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            record.dayName,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    _buildStatusBadge(record.status, false),
                  ],
                ),
                const SizedBox(height: 24),
                _buildDetailRow('Check In', record.checkIn, Icons.login),
                const SizedBox(height: 16),
                _buildDetailRow('Check Out', record.checkOut, Icons.logout),
                const SizedBox(height: 16),
                _buildDetailRow('Shift', record.shift, Icons.schedule),
                const SizedBox(height: 16),
                _buildDetailRow('Total Hours', record.totalHours, Icons.access_time),
                if (record.isLate && record.lateDuration != null) ...[
                  const SizedBox(height: 16),
                  _buildDetailRow('Late Duration', record.lateDuration!, Icons.warning),
                ],
                if (record.overtimeHours != '-' && record.overtimeHours != '0') ...[
                  const SizedBox(height: 16),
                  _buildDetailRow('Overtime', record.overtimeHours, Icons.timer),
                ],
                if (record.breakTime != '-') ...[
                  const SizedBox(height: 16),
                  _buildDetailRow('Break Time', record.breakTime, Icons.coffee),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF6B7280)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
