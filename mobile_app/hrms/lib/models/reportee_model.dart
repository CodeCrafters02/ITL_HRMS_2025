class Reportee {
  final int id;
  final String employeeId;
  final String fullName;
  final String? status;
  final String? departmentName;
  final String? designationName;

  Reportee({
    required this.id,
    required this.employeeId,
    required this.fullName,
    this.status,
    this.departmentName,
    this.designationName,
  });

  factory Reportee.fromJson(Map<String, dynamic> json) {
    return Reportee(
      id: json['id'] ?? 0,
      employeeId: json['employee_id'] ?? '',
      fullName: json['full_name'] ?? '',
      status: json['status'],
      departmentName: json['department_name'],
      designationName: json['designation_name'],
    );
  }
}

