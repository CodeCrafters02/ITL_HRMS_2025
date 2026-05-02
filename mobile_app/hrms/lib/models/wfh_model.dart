enum WFHStatus { pending, approved, rejected }

extension WFHStatusExt on WFHStatus {
  String get apiValue {
    switch (this) {
      case WFHStatus.pending:
        return 'pending';
      case WFHStatus.approved:
        return 'approved';
      case WFHStatus.rejected:
        return 'rejected';
    }
  }

  String get displayName {
    switch (this) {
      case WFHStatus.pending:
        return 'Pending';
      case WFHStatus.approved:
        return 'Approved';
      case WFHStatus.rejected:
        return 'Rejected';
    }
  }

  static WFHStatus fromApi(String value) {
    switch (value.toLowerCase()) {
      case 'approved':
        return WFHStatus.approved;
      case 'rejected':
        return WFHStatus.rejected;
      default:
        return WFHStatus.pending;
    }
  }
}

enum WFHRequestType { wfh, wfo }

extension WFHRequestTypeExt on WFHRequestType {
  String get apiValue => this == WFHRequestType.wfh ? 'wfh' : 'wfo';
  String get displayName => this == WFHRequestType.wfh ? 'Work From Home' : 'Work From Office';

  static WFHRequestType fromApi(String value) =>
      value.toLowerCase() == 'wfo' ? WFHRequestType.wfo : WFHRequestType.wfh;
}

class WFHRequest {
  final int id;
  final WFHRequestType requestType;
  final String reason;
  final DateTime? fromDate;
  final DateTime? toDate;
  final WFHStatus status;
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  WFHRequest({
    required this.id,
    required this.requestType,
    required this.reason,
    this.fromDate,
    this.toDate,
    required this.status,
    this.rejectionReason,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WFHRequest.fromJson(Map<String, dynamic> json) {
    return WFHRequest(
      id: json['id'] ?? 0,
      requestType: WFHRequestTypeExt.fromApi(json['request_type'] ?? 'wfh'),
      reason: json['reason'] ?? '',
      fromDate: json['from_date'] != null ? DateTime.tryParse(json['from_date']) : null,
      toDate: json['to_date'] != null ? DateTime.tryParse(json['to_date']) : null,
      status: WFHStatusExt.fromApi(json['status'] ?? 'pending'),
      rejectionReason: json['rejection_reason'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] ?? '') ?? DateTime.now(),
    );
  }

  int get durationDays {
    if (fromDate == null || toDate == null) return 1;
    return toDate!.difference(fromDate!).inDays + 1;
  }
}
