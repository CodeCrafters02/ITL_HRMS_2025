class ReimbursementCategory {
  final int id;
  final String name;
  final String? description;

  ReimbursementCategory({
    required this.id,
    required this.name,
    this.description,
  });

  factory ReimbursementCategory.fromJson(Map<String, dynamic> json) {
    return ReimbursementCategory(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
    );
  }
}

enum ReimbursementStatus { pending, approved, rejected }

extension ReimbursementStatusExt on ReimbursementStatus {
  String get apiValue {
    switch (this) {
      case ReimbursementStatus.pending:
        return 'pending';
      case ReimbursementStatus.approved:
        return 'approved';
      case ReimbursementStatus.rejected:
        return 'rejected';
    }
  }

  String get displayName {
    switch (this) {
      case ReimbursementStatus.pending:
        return 'Pending';
      case ReimbursementStatus.approved:
        return 'Approved';
      case ReimbursementStatus.rejected:
        return 'Rejected';
    }
  }

  static ReimbursementStatus fromApi(String value) {
    switch (value.toLowerCase()) {
      case 'approved':
        return ReimbursementStatus.approved;
      case 'rejected':
        return ReimbursementStatus.rejected;
      default:
        return ReimbursementStatus.pending;
    }
  }
}

class ReimbursementRequest {
  final int id;
  final int? categoryId;
  final String? categoryName;
  final String? customCategory;
  final double amount;
  final String description;
  final String? billAttachment;
  final ReimbursementStatus status;
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  ReimbursementRequest({
    required this.id,
    this.categoryId,
    this.categoryName,
    this.customCategory,
    required this.amount,
    required this.description,
    this.billAttachment,
    required this.status,
    this.rejectionReason,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ReimbursementRequest.fromJson(Map<String, dynamic> json) {
    final cat = json['category'];
    return ReimbursementRequest(
      id: json['id'] ?? 0,
      categoryId: (cat is Map) ? (cat['id'] as int?) : (cat as int?),
      categoryName: (cat is Map) ? (cat['name'] as String?) : null,
      customCategory: json['custom_category'],
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0,
      description: json['description'] ?? '',
      billAttachment: json['bill_attachment'],
      status: ReimbursementStatusExt.fromApi(json['status'] ?? 'pending'),
      rejectionReason: json['rejection_reason'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] ?? '') ?? DateTime.now(),
    );
  }

  String get displayCategory => categoryName ?? customCategory ?? 'Other';
}
