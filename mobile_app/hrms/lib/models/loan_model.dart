class LoanCategory {
  final int id;
  final String name;
  final String? description;
  final bool isActive;
  final int minTenureMonths;
  final int maxRepaymentMonths;
  final double maxLoanLimit;

  LoanCategory({
    required this.id,
    required this.name,
    this.description,
    required this.isActive,
    required this.minTenureMonths,
    required this.maxRepaymentMonths,
    required this.maxLoanLimit,
  });

  factory LoanCategory.fromJson(Map<String, dynamic> json) {
    return LoanCategory(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
      isActive: json['is_active'] ?? true,
      minTenureMonths: json['min_tenure_months'] ?? 0,
      maxRepaymentMonths: json['max_repayment_months'] ?? 12,
      maxLoanLimit: double.tryParse(json['max_loan_limit']?.toString() ?? '0') ?? 0,
    );
  }
}

class LoanInterestSlab {
  final int id;
  final double minAmount;
  final double maxAmount;
  final double interestRate;

  LoanInterestSlab({
    required this.id,
    required this.minAmount,
    required this.maxAmount,
    required this.interestRate,
  });

  factory LoanInterestSlab.fromJson(Map<String, dynamic> json) {
    return LoanInterestSlab(
      id: json['id'] ?? 0,
      minAmount: double.tryParse(json['min_amount']?.toString() ?? '0') ?? 0,
      maxAmount: double.tryParse(json['max_amount']?.toString() ?? '0') ?? 0,
      interestRate: double.tryParse(json['interest_rate']?.toString() ?? '0') ?? 0,
    );
  }
}

enum LoanStatus { pending, managerApproved, approved, rejected, cleared }

extension LoanStatusExt on LoanStatus {
  String get apiValue {
    switch (this) {
      case LoanStatus.pending:
        return 'PENDING';
      case LoanStatus.managerApproved:
        return 'MANAGER_APPROVED';
      case LoanStatus.approved:
        return 'APPROVED';
      case LoanStatus.rejected:
        return 'REJECTED';
      case LoanStatus.cleared:
        return 'CLEARED';
    }
  }

  String get displayName {
    switch (this) {
      case LoanStatus.pending:
        return 'Pending Manager Approval';
      case LoanStatus.managerApproved:
        return 'Pending Admin Approval';
      case LoanStatus.approved:
        return 'Approved';
      case LoanStatus.rejected:
        return 'Rejected';
      case LoanStatus.cleared:
        return 'Cleared';
    }
  }

  static LoanStatus fromApi(String value) {
    switch (value.toUpperCase()) {
      case 'MANAGER_APPROVED':
        return LoanStatus.managerApproved;
      case 'APPROVED':
        return LoanStatus.approved;
      case 'REJECTED':
        return LoanStatus.rejected;
      case 'CLEARED':
        return LoanStatus.cleared;
      default:
        return LoanStatus.pending;
    }
  }
}

class LoanApplication {
  final int id;
  final int categoryId;
  final String categoryName;
  final double requestedAmount;
  final int repaymentMonths;
  final double interestRate;
  final double emiAmount;
  final LoanStatus status;
  final String? reason;
  final String? adminRemarks;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? employeeName;
  final String? employeeId;

  LoanApplication({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.requestedAmount,
    required this.repaymentMonths,
    required this.interestRate,
    required this.emiAmount,
    required this.status,
    this.reason,
    this.adminRemarks,
    required this.createdAt,
    required this.updatedAt,
    this.employeeName,
    this.employeeId,
  });

  factory LoanApplication.fromJson(Map<String, dynamic> json) {
    final cat = json['category'];
    final empDetails = json['employee_details'] as Map<String, dynamic>?;
    return LoanApplication(
      id: json['id'] ?? 0,
      categoryId: (cat is Map) ? (cat['id'] ?? 0) : (json['category'] ?? 0),
      categoryName: (cat is Map) ? (cat['name'] ?? '') : '',
      requestedAmount: double.tryParse(json['requested_amount']?.toString() ?? '0') ?? 0,
      repaymentMonths: json['repayment_months'] ?? 0,
      interestRate: double.tryParse(json['interest_rate']?.toString() ?? '0') ?? 0,
      emiAmount: double.tryParse(json['emi_amount']?.toString() ?? '0') ?? 0,
      status: LoanStatusExt.fromApi(json['status'] ?? 'PENDING'),
      reason: json['reason'],
      adminRemarks: json['admin_remarks'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] ?? '') ?? DateTime.now(),
      employeeName: empDetails?['full_name'],
      employeeId: empDetails?['employee_id'],
    );
  }
}
