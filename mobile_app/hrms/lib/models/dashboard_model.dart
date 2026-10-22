import 'break_model.dart';
import 'overtime_model.dart';
import 'payroll_model.dart';

/// What kind of day today is for the employee.
class DayInfo {
  final String type; // holiday | weekly_off | leave | half_day_leave | working
  final String label;
  final String detail;

  const DayInfo({required this.type, required this.label, required this.detail});

  factory DayInfo.fromJson(Map<String, dynamic> j) => DayInfo(
        type: j['type'] ?? 'working',
        label: j['label'] ?? 'Working day',
        detail: j['detail'] ?? '',
      );
}

/// Today's progress towards the shift's half day / full day hours.
class DayProgress {
  final String state; // not_started | in_progress | half_day | full_day | off_day
  final int workedSeconds;
  final int halfDaySeconds;
  final int fullDaySeconds;
  final bool running;
  final DateTime fetchedAt;

  DayProgress({
    required this.state,
    required this.workedSeconds,
    required this.halfDaySeconds,
    required this.fullDaySeconds,
    required this.running,
    DateTime? fetchedAt,
  }) : fetchedAt = fetchedAt ?? DateTime.now();

  factory DayProgress.fromJson(Map<String, dynamic> j) => DayProgress(
        state: j['state'] ?? 'not_started',
        workedSeconds: (j['worked_seconds'] ?? 0).toInt(),
        halfDaySeconds: (j['half_day_seconds'] ?? 4 * 3600).toInt(),
        fullDaySeconds: (j['full_day_seconds'] ?? 8 * 3600).toInt(),
        running: j['running'] ?? false,
      );

  /// Worked seconds including time elapsed since the data was fetched while the clock is running.
  int liveSeconds() =>
      workedSeconds + (running ? DateTime.now().difference(fetchedAt).inSeconds : 0);
}

class DashboardData {
  final String? employeeName;
  final String? employeePhoto;
  final String? checkinTime;
  final String? checkoutTime;
  final bool isLate;
  final String totalWorked;
  final String effectiveTime;
  final int totalBreakMinutes;
  final String shiftName;
  final String shiftTiming;
  final String serverTime;
  final ActiveBreakData? activeBreak;
  final List<BreakData>? recentBreaks;
  final OvertimeData? overtime;
  final PayrollData? latestPayroll;
  final String? birthdayMessage;
  final String? totalWorkDurationWeek;
  final String? todayWorkDuration;
  final int attendanceScore;
  final DayProgress? dayProgress;
  final DayInfo? dayInfo;

  DashboardData({
    this.employeeName,
    this.employeePhoto,
    this.checkinTime,
    this.checkoutTime,
    required this.isLate,
    required this.totalWorked,
    required this.effectiveTime,
    required this.totalBreakMinutes,
    required this.shiftName,
    required this.shiftTiming,
    required this.serverTime,
    this.activeBreak,
    this.recentBreaks,
    this.overtime,
    this.latestPayroll,
    this.birthdayMessage,
    this.totalWorkDurationWeek,
    this.todayWorkDuration,
    required this.attendanceScore,
    this.dayProgress,
    this.dayInfo,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    return DashboardData(
      employeeName: json['employee_name'],
      employeePhoto: json['employee_photo'],
      checkinTime: json['checkin_time'],
      checkoutTime: json['checkout_time'],
      isLate: json['is_late'] ?? false,
      totalWorked: json['total_worked'] ?? '0h 0m',
      effectiveTime: json['effective_time'] ?? '0h 0m',
      totalBreakMinutes: json['total_break_minutes'] ?? 0,
      shiftName: json['shift_name'] ?? 'Not assigned',
      shiftTiming: json['shift_timing'] ?? '--:--',
      serverTime: json['server_time'] ?? '',
      activeBreak: json['active_break'] != null
          ? ActiveBreakData.fromJson(json['active_break'])
          : null,
      recentBreaks: json['recent_breaks'] != null
          ? (json['recent_breaks'] as List)
                .map((item) => BreakData.fromJson(item))
                .toList()
          : null,
      overtime: json['overtime'] != null
          ? OvertimeData.fromJson(json['overtime'])
          : null,
      latestPayroll: json['latest_payroll'] != null
          ? PayrollData.fromJson(json['latest_payroll'])
          : null,
      birthdayMessage: json['birthday_message'],
      totalWorkDurationWeek: json['total_work_duration_week'],
      todayWorkDuration: json['today_work_duration'],
      attendanceScore: json['attendance_score'] ?? 0,
      dayProgress: json['day_progress'] is Map<String, dynamic>
          ? DayProgress.fromJson(json['day_progress'] as Map<String, dynamic>)
          : null,
      dayInfo: json['day_info'] is Map<String, dynamic>
          ? DayInfo.fromJson(json['day_info'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'employee_name': employeeName,
      'employee_photo': employeePhoto,
      'checkin_time': checkinTime,
      'checkout_time': checkoutTime,
      'is_late': isLate,
      'total_worked': totalWorked,
      'effective_time': effectiveTime,
      'total_break_minutes': totalBreakMinutes,
      'shift_name': shiftName,
      'shift_timing': shiftTiming,
      'server_time': serverTime,
      'active_break': activeBreak?.toJson(),
      'recent_breaks': recentBreaks?.map((b) => b.toJson()).toList(),
      'overtime': overtime?.toJson(),
      'latest_payroll': latestPayroll?.toJson(),
      'birthday_message': birthdayMessage,
      'total_work_duration_week': totalWorkDurationWeek,
      'today_work_duration': todayWorkDuration,
      'attendance_score': attendanceScore,
    };
  }

  bool get isCheckedIn => checkinTime != null && checkoutTime == null;
  bool get hasActiveBreak => activeBreak != null;
}
