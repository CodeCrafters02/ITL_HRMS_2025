import 'dart:convert';

class OfficeLocation {
  final int id;
  final String name;
  final String? address;

  OfficeLocation({
    required this.id,
    required this.name,
    this.address,
  });

  factory OfficeLocation.fromJson(Map<String, dynamic> json) => OfficeLocation(
        id: (json['id'] as num).toInt(),
        name: (json['name'] ?? '').toString(),
        address: json['address']?.toString(),
      );
}

class OfficeFloor {
  final int id;
  final String name;
  final int floorNumber;
  final Map<String, dynamic> layoutData;

  OfficeFloor({
    required this.id,
    required this.name,
    required this.floorNumber,
    required this.layoutData,
  });

  List<LayoutElement> get elements =>
      LayoutElement.parseElements(layoutData['elements']);

  factory OfficeFloor.fromJson(Map<String, dynamic> json) => OfficeFloor(
        id: (json['id'] as num).toInt(),
        name: (json['name'] ?? '').toString(),
        floorNumber: (json['floor_number'] as num?)?.toInt() ?? 0,
        layoutData: (json['layout_data'] is Map<String, dynamic>)
            ? (json['layout_data'] as Map<String, dynamic>)
            : <String, dynamic>{},
      );
}

class OfficeSeat {
  final int id;
  final String seatNumber;

  OfficeSeat({
    required this.id,
    required this.seatNumber,
  });

  factory OfficeSeat.fromJson(Map<String, dynamic> json) => OfficeSeat(
        id: (json['id'] as num).toInt(),
        seatNumber: (json['seat_number'] ?? '').toString(),
      );
}

class EmployeeDetails {
  final int id;
  final String name;
  final String employeeId;

  EmployeeDetails({
    required this.id,
    required this.name,
    required this.employeeId,
  });

  factory EmployeeDetails.fromJson(Map<String, dynamic> json) => EmployeeDetails(
        id: (json['id'] as num?)?.toInt() ?? 0,
        name: (json['name'] ?? '').toString(),
        employeeId: (json['employee_id'] ?? '').toString(),
      );
}

class SeatDetails {
  final String seatNumber;
  final String section;
  final String floor;
  final int? floorId;

  SeatDetails({
    required this.seatNumber,
    required this.section,
    required this.floor,
    this.floorId,
  });

  factory SeatDetails.fromJson(Map<String, dynamic> json) => SeatDetails(
        seatNumber: (json['seat_number'] ?? '').toString(),
        section: (json['section'] ?? '').toString(),
        floor: (json['floor'] ?? '').toString(),
        floorId: (json['floor_id'] as num?)?.toInt(),
      );
}

class SeatBooking {
  final int id;
  final String bookingType;
  final String status;
  final String startDate;
  final String? endDate;
  final String? startTime;
  final String? endTime;
  final bool isMine;
  final EmployeeDetails employeeDetails;
  final SeatDetails seatDetails;

  SeatBooking({
    required this.id,
    required this.bookingType,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.startTime,
    required this.endTime,
    required this.isMine,
    required this.employeeDetails,
    required this.seatDetails,
  });

  factory SeatBooking.fromJson(Map<String, dynamic> json) => SeatBooking(
        id: (json['id'] as num).toInt(),
        bookingType: (json['booking_type'] ?? '').toString(),
        status: (json['status'] ?? '').toString(),
        startDate: (json['start_date'] ?? '').toString(),
        endDate: json['end_date']?.toString(),
        startTime: json['start_time']?.toString(),
        endTime: json['end_time']?.toString(),
        isMine: (json['is_mine'] as bool?) ?? false,
        employeeDetails: EmployeeDetails.fromJson(
          (json['employee_details'] as Map?)?.cast<String, dynamic>() ??
              const <String, dynamic>{},
        ),
        seatDetails: SeatDetails.fromJson(
          (json['seat_details'] as Map?)?.cast<String, dynamic>() ??
              const <String, dynamic>{},
        ),
      );
}

class LayoutElement {
  final String id;
  final String type;
  final String name;
  final double x;
  final double y;
  final double width;
  final double height;
  final double rotation;
  final String? color;

  LayoutElement({
    required this.id,
    required this.type,
    required this.name,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.rotation,
    required this.color,
  });

  bool get isSeat => type == 'seat';

  static double _d(dynamic v, double fallback) {
    if (v is num) return v.toDouble();
    return fallback;
  }

  factory LayoutElement.fromJson(Map<String, dynamic> json) => LayoutElement(
        id: (json['id'] ?? '').toString(),
        type: (json['type'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        x: _d(json['x'], 0),
        y: _d(json['y'], 0),
        width: _d(json['width'], 0),
        height: _d(json['height'], 0),
        rotation: _d(json['rotation'], 0),
        color: json['color']?.toString(),
      );

  static List<LayoutElement> parseElements(dynamic raw) {
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((m) => LayoutElement.fromJson(m.cast<String, dynamic>()))
          .toList();
    }
    if (raw is String && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        return parseElements(decoded);
      } catch (_) {
        return <LayoutElement>[];
      }
    }
    return <LayoutElement>[];
  }
}

