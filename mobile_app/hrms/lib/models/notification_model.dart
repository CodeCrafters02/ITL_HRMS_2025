class NotificationModel {
  final String id;
  final String title;
  final String description;
  final DateTime date;
  final String type;
  final bool? read;
  final String? imageUrl;

  NotificationModel({
    required this.id,
    required this.title,
    required this.description,
    required this.date,
    required this.type,
    this.read,
    this.imageUrl,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      date: _parseDate(json['date']),
      type: json['type'] ?? 'notification',
      read: json['read'],
      imageUrl: json['image_url'],
    );
  }

  static DateTime _parseDate(dynamic dateValue) {
    if (dateValue == null) return DateTime.now();

    try {
      if (dateValue is String) {
        // Try parsing ISO format
        return DateTime.parse(dateValue);
      }
      return DateTime.now();
    } catch (e) {
      return DateTime.now();
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'date': date.toIso8601String(),
      'type': type,
      'read': read,
      'image_url': imageUrl,
    };
  }

  bool get isReminder {
    final titleLower = title.toLowerCase();
    final descLower = description.toLowerCase();
    return titleLower.contains('reminder') ||
        titleLower.contains('deadline') ||
        titleLower.contains('due') ||
        titleLower.contains('expire') ||
        descLower.contains('reminder');
  }
}
