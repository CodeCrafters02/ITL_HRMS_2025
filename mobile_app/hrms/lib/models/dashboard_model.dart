import 'break_model.dart';
import 'overtime_model.dart';
import 'payroll_model.dart';

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
