class Reportee {
  final int id;
  final String employeeId;
  final String fullName;
  final String? status;
  final String? departmentName;
  final String? designationName;
  final String? photo;
  final bool isCheckedIn;

  Reportee({
    required this.id,
    required this.employeeId,
    required this.fullName,
    this.status,
    this.departmentName,
    this.designationName,
    this.photo,
    this.isCheckedIn = false,
  });

  factory Reportee.fromJson(Map<String, dynamic> json) {
    return Reportee(
      id: json['id'] ?? 0,
      employeeId: json['employee_id']?.toString() ?? '',
      fullName: json['full_name']?.toString() ?? '',
      status: json['status']?.toString(),
      departmentName: json['department_name']?.toString(),
      designationName: json['designation_name']?.toString(),
      photo: json['photo']?.toString(),
      isCheckedIn: json['is_checked_in'] == true,
    );
  }

  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '';
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}
