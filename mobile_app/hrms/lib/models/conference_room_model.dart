class ConferenceRoom {
  final int id;
  final String layoutElementId;
  final int? capacity;
  final String name;

  ConferenceRoom({
    required this.id,
    required this.layoutElementId,
    this.capacity,
    required this.name,
  });

  factory ConferenceRoom.fromJson(Map<String, dynamic> json) => ConferenceRoom(
        id: (json['id'] as num).toInt(),
        layoutElementId: (json['layout_element_id'] ?? '').toString(),
        capacity: (json['capacity'] as num?)?.toInt(),
        name: (json['name'] ?? '').toString(),
      );
}

class ConferenceRoomDetails {
  final String layoutElementId;
  final String name;

  ConferenceRoomDetails({
    required this.layoutElementId,
    required this.name,
  });

  factory ConferenceRoomDetails.fromJson(Map<String, dynamic> json) => ConferenceRoomDetails(
        layoutElementId: (json['layout_element_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
      );
}

class ConferenceBooking {
  final int id;
  final String date;
  final String startTime;
  final String endTime;
  final String purpose;
  final String status;
  final int employee;
  final ConferenceRoomDetails roomDetails;

  ConferenceBooking({
    required this.id,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.purpose,
    required this.status,
    required this.employee,
    required this.roomDetails,
  });

  factory ConferenceBooking.fromJson(Map<String, dynamic> json) => ConferenceBooking(
        id: (json['id'] as num).toInt(),
        date: (json['date'] ?? '').toString(),
        startTime: (json['start_time'] ?? '').toString(),
        endTime: (json['end_time'] ?? '').toString(),
        purpose: (json['purpose'] ?? '').toString(),
        status: (json['status'] ?? '').toString(),
        employee: (json['employee'] as num?)?.toInt() ?? 0,
        roomDetails: ConferenceRoomDetails.fromJson(
          (json['room_details'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{},
        ),
      );
}

class ConferenceConfig {
  final int approvalLimitMinutes;

  ConferenceConfig({
    required this.approvalLimitMinutes,
  });

  factory ConferenceConfig.fromJson(Map<String, dynamic> json) => ConferenceConfig(
        approvalLimitMinutes: (json['approval_limit_minutes'] as num?)?.toInt() ?? 120,
      );
}
