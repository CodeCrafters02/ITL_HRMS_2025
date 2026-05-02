import 'package:flutter/material.dart';

/// Asset request types
enum AssetRequestType { core, supply }

extension AssetRequestTypeExtension on AssetRequestType {
  String get displayName {
    switch (this) {
      case AssetRequestType.core:
        return 'Core Asset';
      case AssetRequestType.supply:
        return 'Supply Item';
    }
  }

  String get apiValue {
    switch (this) {
      case AssetRequestType.core:
        return 'core';
      case AssetRequestType.supply:
        return 'supply';
    }
  }
}

/// Asset request status
enum AssetRequestStatus {
  pending,
  approved,
  rejected,
  fulfilled,
  cancelled,
}

extension AssetRequestStatusExtension on AssetRequestStatus {
  String get displayName {
    switch (this) {
      case AssetRequestStatus.pending:
        return 'Pending';
      case AssetRequestStatus.approved:
        return 'Approved';
      case AssetRequestStatus.rejected:
        return 'Rejected';
      case AssetRequestStatus.fulfilled:
        return 'Fulfilled';
      case AssetRequestStatus.cancelled:
        return 'Cancelled';
    }
  }

  Color get color {
    switch (this) {
      case AssetRequestStatus.pending:
        return const Color(0xFFF59E0B); // Amber
      case AssetRequestStatus.approved:
        return const Color(0xFF10B981); // Green
      case AssetRequestStatus.rejected:
        return const Color(0xFFEF4444); // Red
      case AssetRequestStatus.fulfilled:
        return const Color(0xFF3B82F6); // Blue
      case AssetRequestStatus.cancelled:
        return const Color(0xFF6B7280); // Gray
    }
  }
}

/// Asset request model
class AssetRequest {
  final int id;
  final String requestNumber;
  final AssetRequestType requestType;
  final AssetRequestStatus status;
  final String? remarks;
  final int? relatedFixedId;
  final int? relatedSupplyId;
  final int requestedQuantity;
  final String? requestedItemName;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? image;
  final List<AssetRequestBatch>? batches;

  AssetRequest({
    required this.id,
    required this.requestNumber,
    required this.requestType,
    required this.status,
    this.remarks,
    this.relatedFixedId,
    this.relatedSupplyId,
    required this.requestedQuantity,
    this.requestedItemName,
    required this.createdAt,
    this.updatedAt,
    this.image,
    this.batches,
  });

  factory AssetRequest.fromJson(Map<String, dynamic> json) {
    AssetRequestType parseType(String? type) {
      switch (type?.toLowerCase()) {
        case 'supply':
          return AssetRequestType.supply;
        case 'core':
        default:
          return AssetRequestType.core;
      }
    }

    AssetRequestStatus parseStatus(dynamic status) {
      final statusStr = status?.toString().toLowerCase().trim();
      switch (statusStr) {
        case 'approved':
        case 'accept':
        case 'accepted':
        case 'authorize':
        case 'authorized':
          return AssetRequestStatus.approved;
        case 'rejected':
        case 'reject':
        case 'declined':
        case 'denied':
          return AssetRequestStatus.rejected;
        case 'fulfilled':
        case 'complete':
        case 'completed':
        case 'issued':
        case 'delivered':
          return AssetRequestStatus.fulfilled;
        case 'cancelled':
        case 'canceled':
        case 'cancel':
          return AssetRequestStatus.cancelled;
        case 'pending':
        case 'submitted':
        case 'new':
        case 'open':
        default:
          return AssetRequestStatus.pending;
      }
    }

    return AssetRequest(
      id: json['id'] ?? 0,
      requestNumber: json['request_number'] ?? '',
      requestType: parseType(json['request_type']),
      status: parseStatus(json['status'] ?? json['request_status'] ?? json['approval_status'] ?? json['state']),
      remarks: json['remarks'],
      relatedFixedId: json['related_fixed_id'],
      relatedSupplyId: json['related_supply_id'],
      requestedQuantity: json['requested_quantity'] ?? 1,
      requestedItemName: json['requested_item_name'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
      image: json['image'],
      batches: (json['batches'] as List<dynamic>?)
          ?.map((e) => AssetRequestBatch.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'request_number': requestNumber,
      'request_type': requestType.apiValue,
      'status': status.name,
      'remarks': remarks,
      'related_fixed_id': relatedFixedId,
      'related_supply_id': relatedSupplyId,
      'requested_quantity': requestedQuantity,
      'requested_item_name': requestedItemName,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'image': image,
    };
  }

  /// Get formatted date
  String get formattedDate {
    return '${createdAt.day.toString().padLeft(2, '0')}/${createdAt.month.toString().padLeft(2, '0')}/${createdAt.year}';
  }
}

/// Asset request batch (for tracking fulfillment)
class AssetRequestBatch {
  final int id;
  final String batchNumber;
  final int quantity;
  final String? serialNumber;
  final DateTime? issuedAt;
  final DateTime? returnedAt;

  AssetRequestBatch({
    required this.id,
    required this.batchNumber,
    required this.quantity,
    this.serialNumber,
    this.issuedAt,
    this.returnedAt,
  });

  factory AssetRequestBatch.fromJson(Map<String, dynamic> json) {
    return AssetRequestBatch(
      id: json['id'] ?? 0,
      batchNumber: json['batch_number'] ?? '',
      quantity: json['quantity'] ?? 0,
      serialNumber: json['serial_number'],
      issuedAt: json['issued_at'] != null
          ? DateTime.tryParse(json['issued_at'])
          : null,
      returnedAt: json['returned_at'] != null
          ? DateTime.tryParse(json['returned_at'])
          : null,
    );
  }
}

/// Supply item model
class SupplyItem {
  final int id;
  final String itemName;
  final String? category;
  final String? description;
  final int availableQuantity;
  final int maxPerOrder;
  final String? image;
  final double? price;

  SupplyItem({
    required this.id,
    required this.itemName,
    this.category,
    this.description,
    required this.availableQuantity,
    required this.maxPerOrder,
    this.image,
    this.price,
  });

  factory SupplyItem.fromJson(Map<String, dynamic> json) {
    return SupplyItem(
      id: json['id'] ?? 0,
      itemName: json['item_name'] ?? '',
      category: json['category'],
      description: json['description'],
      availableQuantity: json['available_quantity'] ?? 0,
      maxPerOrder: json['max_per_order'] ?? 1,
      image: json['image'],
      price: json['price'] != null ? (json['price'] as num).toDouble() : null,
    );
  }
}

/// My asset (assigned to employee)
class MyAsset {
  final int id;
  final String assetName;
  final String? assetCode;
  final String? category;
  final String? serialNumber;
  final DateTime? assignedAt;
  final String? status;
  final String? image;
  final String? remarks;

  MyAsset({
    required this.id,
    required this.assetName,
    this.assetCode,
    this.category,
    this.serialNumber,
    this.assignedAt,
    this.status,
    this.image,
    this.remarks,
  });

  factory MyAsset.fromJson(Map<String, dynamic> json) {
    return MyAsset(
      id: json['id'] ?? 0,
      assetName: json['asset_name'] ?? '',
      assetCode: json['asset_code'],
      category: json['category'],
      serialNumber: json['serial_number'],
      assignedAt: json['assigned_at'] != null
          ? DateTime.tryParse(json['assigned_at'])
          : null,
      status: json['status'],
      image: json['image'],
      remarks: json['remarks'],
    );
  }

  /// Get formatted assignment date
  String? get formattedAssignedDate {
    if (assignedAt == null) return null;
    return '${assignedAt!.day.toString().padLeft(2, '0')}/${assignedAt!.month.toString().padLeft(2, '0')}/${assignedAt!.year}';
  }
}

/// Cart item for supply ordering
class SupplyCartItem {
  final SupplyItem item;
  int quantity;

  SupplyCartItem({
    required this.item,
    this.quantity = 1,
  });

  double get totalPrice => (item.price ?? 0) * quantity;
}
