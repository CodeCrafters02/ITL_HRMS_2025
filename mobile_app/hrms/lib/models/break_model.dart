class BreakData {
  final String type;
  final String? breakChoice;
  final int? breakConfigId;
  final String startTime;
  final String? endTime;
  final int? durationMinutes;

  BreakData({
    required this.type,
    this.breakChoice,
    this.breakConfigId,
    required this.startTime,
    this.endTime,
    this.durationMinutes,
  });

  factory BreakData.fromJson(Map<String, dynamic> json) {
    return BreakData(
      type: json['type'] ?? '',
      breakChoice: json['break_choice'],
      breakConfigId: json['break_config_id'],
      startTime: json['start_time'] ?? '',
      endTime: json['end_time'],
      durationMinutes: json['duration_minutes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'break_choice': breakChoice,
      'break_config_id': breakConfigId,
      'start_time': startTime,
      'end_time': endTime,
      'duration_minutes': durationMinutes,
    };
  }
}

class ActiveBreakData {
  final String type;
  final String? breakChoice;
  final int? breakConfigId;
  final String startTime;
  final int? durationMinutes;

  ActiveBreakData({
    required this.type,
    this.breakChoice,
    this.breakConfigId,
    required this.startTime,
    this.durationMinutes,
  });

  factory ActiveBreakData.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      throw ArgumentError('ActiveBreakData cannot be null');
    }
    return ActiveBreakData(
      type: json['type'] ?? '',
      breakChoice: json['break_choice'],
      breakConfigId: json['break_config_id'],
      startTime: json['start_time'] ?? '',
      durationMinutes: json['duration_minutes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'break_choice': breakChoice,
      'break_config_id': breakConfigId,
      'start_time': startTime,
      'duration_minutes': durationMinutes,
    };
  }
}
