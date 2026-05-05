class Announcement {
  final int id;
  final String title;
  final String body;
  final String? imageUrl;
  final String createdAt;
  final String? notificationId;
  final bool isDismissible;

  Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.imageUrl,
    this.notificationId,
    this.isDismissible = false,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      imageUrl: json['image_url'],
      createdAt: json['created_at']?.toString() ?? '',
    );
  }

  factory Announcement.fromNotification(Map<String, dynamic> json) {
    return Announcement(
      id: 0,
      title: json['title'] ?? '',
      body: json['description'] ?? '',
      imageUrl: json['image_url'],
      createdAt: json['date']?.toString() ?? '',
      notificationId: json['id']?.toString(),
      isDismissible: true,
    );
  }
}

