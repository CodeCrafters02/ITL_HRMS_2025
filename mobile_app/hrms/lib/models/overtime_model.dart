class OvertimeData {
  final int hours;
  final int minutes;
  final double total;

  OvertimeData({
    required this.hours,
    required this.minutes,
    required this.total,
  });

  factory OvertimeData.fromJson(Map<String, dynamic> json) {
    return OvertimeData(
      hours: json['hours'] ?? 0,
      minutes: json['minutes'] ?? 0,
      total: (json['total'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'hours': hours, 'minutes': minutes, 'total': total};
  }

  String get formatted => '${hours}h ${minutes}m';
}
