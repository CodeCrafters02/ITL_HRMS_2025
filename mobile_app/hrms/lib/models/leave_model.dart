class LeaveType {
  final int id;
  final String leaveName;
  final int count;
  final bool isPaid;
  final int usedCount;
  final int remainingCount;

  LeaveType({
    required this.id,
    required this.leaveName,
    required this.count,
    required this.isPaid,
    required this.usedCount,
    required this.remainingCount,
  });

  factory LeaveType.fromJson(Map<String, dynamic> json) {
    return LeaveType(
      id: json['id'] ?? 0,
      leaveName: json['leave_name'] ?? '',
      count: json['count'] ?? 0,
      isPaid: json['is_paid'] ?? false,
      usedCount: json['used_count'] ?? 0,
      remainingCount: json['remaining_count'] ?? 0,
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

  AppliedLeave({
    required this.id,
    required this.leaveType,
    this.leaveTypeName,
    required this.reason,
    required this.fromDate,
    required this.toDate,
    required this.status,
    required this.createdAt,
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
    );
  }
}


