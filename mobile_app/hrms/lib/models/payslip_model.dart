/// Payslip model for employee salary statements
class Payslip {
  final int id;
  final String payslipId;
  final int month;
  final int year;
  final String? file;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Payslip({
    required this.id,
    required this.payslipId,
    required this.month,
    required this.year,
    this.file,
    this.createdAt,
    this.updatedAt,
  });

  factory Payslip.fromJson(Map<String, dynamic> json) {
    return Payslip(
      id: json['id'] ?? 0,
      payslipId: json['payslip_id'] ?? '',
      month: json['month'] ?? 0,
      year: json['year'] ?? 0,
      file: json['file'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'payslip_id': payslipId,
      'month': month,
      'year': year,
      'file': file,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  /// Get month name
  String get monthName {
    const months = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return months[month];
  }

  /// Get short month name
  String get monthNameShort {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return months[month];
  }

  /// Get formatted period string
  String get formattedPeriod => '$monthName $year';

  /// Get file URL (handles both relative and absolute URLs)
  String? get fileUrl {
    if (file == null || file!.isEmpty) return null;
    if (file!.startsWith('http')) return file;
    // Assume relative path, prepend base URL
    return file;
  }
}

/// Response wrapper for payslip list
class PayslipListResponse {
  final int count;
  final String? next;
  final String? previous;
  final List<Payslip> results;

  PayslipListResponse({
    required this.count,
    this.next,
    this.previous,
    required this.results,
  });

  factory PayslipListResponse.fromJson(Map<String, dynamic> json) {
    return PayslipListResponse(
      count: json['count'] ?? 0,
      next: json['next'],
      previous: json['previous'],
      results: (json['results'] as List<dynamic>?)
              ?.map((e) => Payslip.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
