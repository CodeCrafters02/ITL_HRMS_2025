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
    String? s(dynamic v) => v?.toString();
    return EmployeeProfile(
      employeeId: json['employee_id']?.toString(),
      firstName: s(json['first_name']),
      middleName: s(json['middle_name']),
      lastName: s(json['last_name']),
      gender: s(json['gender']),
      email: s(json['email']),
      dateOfBirth: s(json['date_of_birth']),
      mobile: s(json['mobile']),
      departmentName: s(json['department_name']),
      department: s(json['department']),
      designationName: s(json['designation_name']),
      designation: s(json['designation']),
      photo: s(json['photo']),
      temporaryAddress: s(json['temporary_address']),
      permanentAddress: s(json['permanent_address']),
      aadharNo: s(json['aadhar_no']),
      aadharCard: s(json['aadhar_card']),
      panNo: s(json['pan_no']),
      panCard: s(json['pan_card']),
      guardianName: s(json['guardian_name']),
      guardianMobile: s(json['guardian_mobile']),
      category: s(json['category']),
      dateOfJoining: s(json['date_of_joining']),
      ctc: s(json['ctc']),
      grossSalary: s(json['gross_salary']),
      epfStatus: s(json['epf_status']),
      uan: s(json['uan']),
      sourceOfEmployment: s(json['source_of_employment']),
      paymentMethod: s(json['payment_method']),
      accountNo: s(json['account_no']),
      ifscCode: s(json['ifsc_code']),
      bankName: s(json['bank_name']),
      esicStatus: s(json['esic_status']),
      esicNo: s(json['esic_no']),
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
  final String? photo;
  final List<HierarchyEmployee>? reportees;

  HierarchyEmployee({
    this.id,
    required this.name,
    required this.level,
    required this.designation,
    this.photo,
    this.reportees,
  });

  factory HierarchyEmployee.fromJson(Map<String, dynamic> json) {
    String s(dynamic v) => v == null ? '' : v.toString();
    return HierarchyEmployee(
      id: json['id'],
      name: s(json['name']),
      level: s(json['level']),
      designation: s(json['designation']),
      photo: json['photo']?.toString(),
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
    String s(dynamic v) => v == null ? '' : v.toString();
    return HigherAuthority(
      employeeName: json['employee_name']?.toString(),
      level: s(json['level']),
      designation: s(json['designation']),
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

// Organization Hierarchy Models (for full company tree)
class OrganizationNode {
  final int id;
  final String name;
  final String designation;
  final String? photo;
  final String? status;
  final String? employeeId;
  final String? department;
  final String? email;
  final String? mobile;
  final List<OrganizationNode>? children;

  OrganizationNode({
    required this.id,
    required this.name,
    required this.designation,
    this.photo,
    this.status,
    this.employeeId,
    this.department,
    this.email,
    this.mobile,
    this.children,
  });

  factory OrganizationNode.fromJson(Map<String, dynamic> json) {
    return OrganizationNode(
      id: json['id'] ?? 0,
      name: json['name']?.toString() ?? '',
      designation: json['designation']?.toString() ?? '',
      photo: json['photo']?.toString(),
      status: json['status']?.toString(),
      employeeId: json['employee_id']?.toString(),
      department: json['department']?.toString(),
      email: json['email']?.toString(),
      mobile: json['mobile']?.toString(),
      children: json['children'] != null
          ? (json['children'] as List)
              .map((item) => OrganizationNode.fromJson(item))
              .toList()
          : null,
    );
  }

  bool get isOnline => status == 'online';
  bool get isAway => status == 'away';
  bool get isDnd => status == 'dnd';
  bool get isOffline => status == null || status == 'offline';
}

class OrganizationHierarchy {
  final List<OrganizationNode> roots;

  OrganizationHierarchy({required this.roots});

  factory OrganizationHierarchy.fromJson(List<dynamic> json) {
    return OrganizationHierarchy(
      roots: json.map((item) => OrganizationNode.fromJson(item)).toList(),
    );
  }
}

// Personal Reporting Line Model (for individual reporting chain)
class PersonalReportingLine {
  final List<OrganizationNode> chain;

  PersonalReportingLine({required this.chain});

  factory PersonalReportingLine.fromJson(List<dynamic> json) {
    return PersonalReportingLine(
      chain: json.map((item) => OrganizationNode.fromJson(item)).toList(),
    );
  }
}

