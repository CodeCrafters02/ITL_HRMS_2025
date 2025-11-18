class EmployeeProfile {
  final String? employeeId;
  final String? firstName;
  final String? middleName;
  final String? lastName;
  final String? gender;
  final String? email;
  final String? dateOfBirth;
  final String? mobile;
  final String? departmentName;
  final String? department;
  final String? designationName;
  final String? designation;
  final String? photo;
  final String? temporaryAddress;
  final String? permanentAddress;
  final String? aadharNo;
  final String? aadharCard;
  final String? panNo;
  final String? panCard;
  final String? guardianName;
  final String? guardianMobile;
  final String? category;
  final String? dateOfJoining;
  final String? ctc;
  final String? grossSalary;
  final String? epfStatus;
  final String? uan;
  final String? sourceOfEmployment;
  final String? paymentMethod;
  final String? accountNo;
  final String? ifscCode;
  final String? bankName;
  final String? esicStatus;
  final String? esicNo;

  EmployeeProfile({
    this.employeeId,
    this.firstName,
    this.middleName,
    this.lastName,
    this.gender,
    this.email,
    this.dateOfBirth,
    this.mobile,
    this.departmentName,
    this.department,
    this.designationName,
    this.designation,
    this.photo,
    this.temporaryAddress,
    this.permanentAddress,
    this.aadharNo,
    this.aadharCard,
    this.panNo,
    this.panCard,
    this.guardianName,
    this.guardianMobile,
    this.category,
    this.dateOfJoining,
    this.ctc,
    this.grossSalary,
    this.epfStatus,
    this.uan,
    this.sourceOfEmployment,
    this.paymentMethod,
    this.accountNo,
    this.ifscCode,
    this.bankName,
    this.esicStatus,
    this.esicNo,
  });

  factory EmployeeProfile.fromJson(Map<String, dynamic> json) {
    return EmployeeProfile(
      employeeId: json['employee_id']?.toString(),
      firstName: json['first_name'],
      middleName: json['middle_name'],
      lastName: json['last_name'],
      gender: json['gender'],
      email: json['email'],
      dateOfBirth: json['date_of_birth'],
      mobile: json['mobile'],
      departmentName: json['department_name'],
      department: json['department'],
      designationName: json['designation_name'],
      designation: json['designation'],
      photo: json['photo'],
      temporaryAddress: json['temporary_address'],
      permanentAddress: json['permanent_address'],
      aadharNo: json['aadhar_no'],
      aadharCard: json['aadhar_card'],
      panNo: json['pan_no'],
      panCard: json['pan_card'],
      guardianName: json['guardian_name'],
      guardianMobile: json['guardian_mobile'],
      category: json['category'],
      dateOfJoining: json['date_of_joining'],
      ctc: json['ctc'],
      grossSalary: json['gross_salary'],
      epfStatus: json['epf_status'],
      uan: json['uan'],
      sourceOfEmployment: json['source_of_employment'],
      paymentMethod: json['payment_method'],
      accountNo: json['account_no'],
      ifscCode: json['ifsc_code'],
      bankName: json['bank_name'],
      esicStatus: json['esic_status'],
      esicNo: json['esic_no'],
    );
  }

  String get fullName {
    final parts = [firstName, middleName, lastName]
        .where((part) => part != null && part.isNotEmpty)
        .toList();
    return parts.isEmpty ? '-' : parts.join(' ');
  }

  String get displayDesignation {
    return designationName ?? designation ?? '-';
  }

  String get displayDepartment {
    return departmentName ?? department ?? '-';
  }

  String get initials {
    final first = firstName?.isNotEmpty == true ? firstName![0] : '';
    final last = lastName?.isNotEmpty == true ? lastName![0] : '';
    return (first + last).toUpperCase();
  }
}

class HierarchyEmployee {
  final int? id;
  final String name;
  final String level;
  final String designation;
  final List<HierarchyEmployee>? reportees;

  HierarchyEmployee({
    this.id,
    required this.name,
    required this.level,
    required this.designation,
    this.reportees,
  });

  factory HierarchyEmployee.fromJson(Map<String, dynamic> json) {
    return HierarchyEmployee(
      id: json['id'],
      name: json['name'] ?? '',
      level: json['level'] ?? '',
      designation: json['designation'] ?? '',
      reportees: json['reportees'] != null
          ? (json['reportees'] as List)
              .map((item) => HierarchyEmployee.fromJson(item))
              .toList()
          : null,
    );
  }
}

class HigherAuthority {
  final String? employeeName;
  final String level;
  final String designation;
  final int? employeeCount;

  HigherAuthority({
    this.employeeName,
    required this.level,
    required this.designation,
    this.employeeCount,
  });

  factory HigherAuthority.fromJson(Map<String, dynamic> json) {
    return HigherAuthority(
      employeeName: json['employee_name'],
      level: json['level'] ?? '',
      designation: json['designation'] ?? '',
      employeeCount: json['employee_count'],
    );
  }
}

class EmployeeHierarchy {
  final HierarchyEmployee employee;
  final HierarchyEmployee? reportingManager;
  final HigherAuthority? higherAuthority;
  final List<HierarchyEmployee>? reportees;

  EmployeeHierarchy({
    required this.employee,
    this.reportingManager,
    this.higherAuthority,
    this.reportees,
  });

  factory EmployeeHierarchy.fromJson(Map<String, dynamic> json) {
    return EmployeeHierarchy(
      employee: HierarchyEmployee.fromJson(json['employee'] ?? {}),
      reportingManager: json['reporting_manager'] != null
          ? HierarchyEmployee.fromJson(json['reporting_manager'])
          : null,
      higherAuthority: json['higher_authority'] != null
          ? HigherAuthority.fromJson(json['higher_authority'])
          : null,
      reportees: json['reportees'] != null
          ? (json['reportees'] as List)
              .map((item) => HierarchyEmployee.fromJson(item))
              .toList()
          : null,
    );
  }
}

