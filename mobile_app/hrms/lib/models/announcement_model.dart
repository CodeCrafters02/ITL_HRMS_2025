class Announcement {
  final int id;
  final String title;
  final String body;
  final String? imageUrl;
  final String createdAt;

  Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.imageUrl,
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
}

