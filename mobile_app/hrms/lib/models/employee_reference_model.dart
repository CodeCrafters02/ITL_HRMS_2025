class EmployeeReference {
  final int id;
  final int employee;
  final String? employeeName;
  final String name;
  final String designation;
  final String contactNumber;
  final String email;
  final String? resume; // URL to uploaded file
  final String status; // "Pending", "Approved", "Rejected"
  final String? adminComment;
  final String submittedAt;
  final String updatedAt;

  EmployeeReference({
    required this.id,
    required this.employee,
    this.employeeName,
    required this.name,
    required this.designation,
    required this.contactNumber,
    required this.email,
    this.resume,
    required this.status,
    this.adminComment,
    required this.submittedAt,
    required this.updatedAt,
  });

  factory EmployeeReference.fromJson(Map<String, dynamic> json) {
    return EmployeeReference(
      id: json['id'],
      employee: json['employee'],
      employeeName: json['employee_name'],
      name: json['name'] ?? '',
      designation: json['designation'] ?? '',
      contactNumber: json['contact_number'] ?? '',
      email: json['email'] ?? '',
      resume: json['resume'],
      status: json['status'] ?? 'Pending',
      adminComment: json['admin_comment'],
      submittedAt: json['submitted_at'] ?? '',
      updatedAt: json['updated_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employee': employee,
      'employee_name': employeeName,
      'name': name,
      'designation': designation,
      'contact_number': contactNumber,
      'email': email,
      'resume': resume,
      'status': status,
      'admin_comment': adminComment,
      'submitted_at': submittedAt,
      'updated_at': updatedAt,
    };
  }
}

