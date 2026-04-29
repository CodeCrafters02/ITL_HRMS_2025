class MonthlyAttendance {
  final String date;
  final String dayName;
  final String checkIn;
  final String checkOut;
  final String shift;
  final bool isWeekend;
  final String status;
  final bool isLate;
  final String? lateDuration;
  final String totalHours;
  final String overtimeHours;
  final String breakTime;

  MonthlyAttendance({
    required this.date,
    required this.dayName,
    required this.checkIn,
    required this.checkOut,
    required this.shift,
    required this.isWeekend,
    required this.status,
    required this.isLate,
    this.lateDuration,
    required this.totalHours,
    required this.overtimeHours,
    required this.breakTime,
  });

  factory MonthlyAttendance.fromJson(Map<String, dynamic> json) {
    return MonthlyAttendance(
      date: json['date'] ?? '',
      dayName: json['day_name'] ?? '',
      checkIn: json['check_in'] ?? '-',
      checkOut: json['check_out'] ?? '-',
      shift: json['shift'] ?? '-',
      isWeekend: json['is_weekend'] ?? false,
      status: json['status'] ?? 'absent',
      isLate: json['is_late'] ?? false,
      lateDuration: json['late_duration'],
      totalHours: json['total_hours']?.toString() ?? '-',
      overtimeHours: json['overtime_hours']?.toString() ?? '-',
      breakTime: json['break_time'] ?? '-',
    );
  }
}

class AttendanceSummary {
  final double present;
  final double absent;
  final int leave;
  final int halfDay;
  final int late;
  final int workingDays;

  AttendanceSummary({
    required this.present,
    required this.absent,
    required this.leave,
    required this.halfDay,
    required this.late,
    required this.workingDays,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) {
    return AttendanceSummary(
      present: (json['present'] as num?)?.toDouble() ?? 0.0,
      absent: (json['absent'] as num?)?.toDouble() ?? 0.0,
      leave: json['leave'] ?? 0,
      halfDay: json['half_day'] ?? 0,
      late: json['late'] ?? 0,
      workingDays: json['working_days'] ?? 0,
    );
  }
}

class MonthOption {
  final int value;
  final String name;

  MonthOption({
    required this.value,
    required this.name,
  });

  factory MonthOption.fromJson(Map<String, dynamic> json) {
    return MonthOption(
      value: json['value'] ?? 0,
      name: json['name'] ?? '',
    );
  }
}

class AttendanceHistoryData {
  final List<MonthlyAttendance> monthlyData;
  final AttendanceSummary summary;
  final List<MonthOption> months;
  final List<int> years;
  final int selectedMonth;
  final int selectedYear;
  final String selectedMonthName;

  AttendanceHistoryData({
    required this.monthlyData,
    required this.summary,
    required this.months,
    required this.years,
    required this.selectedMonth,
    required this.selectedYear,
    required this.selectedMonthName,
  });

  factory AttendanceHistoryData.fromJson(Map<String, dynamic> json) {
    return AttendanceHistoryData(
      monthlyData: (json['monthly_data'] as List?)
              ?.map((item) => MonthlyAttendance.fromJson(item))
              .toList() ??
          [],
      summary: AttendanceSummary.fromJson(json['summary'] ?? {}),
      months: (json['months'] as List?)
              ?.map((item) => MonthOption.fromJson(item))
              .toList() ??
          [],
      years: (json['years'] as List?)?.map((item) => (item as num).toInt()).toList() ?? [],
      selectedMonth: json['selected_month'] ?? DateTime.now().month,
      selectedYear: json['selected_year'] ?? DateTime.now().year,
      selectedMonthName: json['selected_month_name'] ?? '',
    );
  }
}


