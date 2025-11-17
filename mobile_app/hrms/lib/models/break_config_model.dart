class BreakConfig {
  final int id;
  final String breakChoice;
  final int? durationMinutes;
  final bool enabled;

  BreakConfig({
    required this.id,
    required this.breakChoice,
    this.durationMinutes,
    required this.enabled,
  });

  factory BreakConfig.fromJson(Map<String, dynamic> json) {
    return BreakConfig(
      id: json['id'] ?? 0,
      breakChoice: json['break_choice'] ?? '',
      durationMinutes: json['duration_minutes'],
      enabled: json['enabled'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'break_choice': breakChoice,
      'duration_minutes': durationMinutes,
      'enabled': enabled,
    };
  }

  String get displayName {
    switch (breakChoice) {
      case 'meal_break':
        return 'Meal Break';
      case 'short_break':
        return 'Short Break';
      case 'dont_disturb':
        return 'Do Not Disturb';
      default:
        return breakChoice.replaceAll('_', ' ').split(' ').map((word) {
          return word.isEmpty
              ? ''
              : word[0].toUpperCase() + word.substring(1).toLowerCase();
        }).join(' ');
    }
  }
}



