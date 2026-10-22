class LeaveType {
  final int id;
  final String leaveName;
  final int count;
  final bool isPaid;
  final double usedCount;
  final double remainingCount;
  final String accrual;
  final double carriedIn;
  final double? periodTotal;
  final String periodLabel;

  LeaveType({
    required this.id,
    required this.leaveName,
    required this.count,
    required this.isPaid,
    required this.usedCount,
    required this.remainingCount,
    this.accrual = 'yearly',
    this.carriedIn = 0,
    this.periodTotal,
    this.periodLabel = '',
  });

  factory LeaveType.fromJson(Map<String, dynamic> json) {
    return LeaveType(
      id: json['id'] ?? 0,
      leaveName: json['leave_name'] ?? '',
      count: json['count'] ?? 0,
      isPaid: json['is_paid'] ?? false,
      usedCount: (json['used_count'] ?? 0).toDouble(),
      remainingCount: (json['remaining_count'] ?? 0).toDouble(),
      accrual: json['accrual'] ?? 'yearly',
      carriedIn: (json['carried_in'] ?? 0).toDouble(),
      periodTotal: json['period_total'] == null ? null : (json['period_total'] as num).toDouble(),
      periodLabel: json['period_label'] ?? '',
    );
  }
}

class AppliedLeave {
  final int id;
  final int leaveType;
  final String? leaveTypeName;
  final String reason;
  final String fromDate;
  final String toDate;
  final String status;
  final String createdAt;
  final String? leaveDuration;
  final String? rejectionReason;

  AppliedLeave({
    required this.id,
    required this.leaveType,
    this.leaveTypeName,
    required this.reason,
    required this.fromDate,
    required this.toDate,
    required this.status,
    required this.createdAt,
    this.leaveDuration,
    this.rejectionReason,
  });

  factory AppliedLeave.fromJson(Map<String, dynamic> json) {
    return AppliedLeave(
      id: json['id'] ?? 0,
      leaveType: json['leave_type'] ?? 0,
      leaveTypeName: json['leave_type_name'],
      reason: json['reason'] ?? '',
      fromDate: json['from_date'] ?? '',
      toDate: json['to_date'] ?? '',
      status: json['status'] ?? 'Pending',
      createdAt: json['created_at'] ?? '',
      leaveDuration: json['leave_duration'],
      rejectionReason: json['rejection_reason'],
    );
  }
}


