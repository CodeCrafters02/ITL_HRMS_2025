class LeaveRequest {
  final int id;
  final int employee;
  final String employeeName;
  final int? leaveType;
  final String? leaveTypeName;
  final String reason;
  final String fromDate;
  final String toDate;
  final String status; // Pending, Approved, Rejected, Cancelled
  final String createdAt;

  LeaveRequest({
    required this.id,
    required this.employee,
    required this.employeeName,
    this.leaveType,
    this.leaveTypeName,
    required this.reason,
    required this.fromDate,
    required this.toDate,
    required this.status,
    required this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] ?? 0,
      employee: json['employee'] ?? 0,
      employeeName: json['employee_name'] ?? json['employee__full_name'] ?? '',
      leaveType: json['leave_type'],
      leaveTypeName: json['leave_type_name'] ?? json['leave_type__leave_name'],
      reason: json['reason'] ?? '',
      fromDate: json['from_date'] ?? '',
      toDate: json['to_date'] ?? '',
      status: json['status'] ?? 'Pending',
      createdAt: json['created_at'] ?? '',
    );
  }
}

