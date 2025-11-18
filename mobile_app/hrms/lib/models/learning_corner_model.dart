class LearningCornerItem {
  final int id;
  final String title;
  final String? description;
  final String? image;
  final String? video;
  final String? document;

  LearningCornerItem({
    required this.id,
    required this.title,
    this.description,
    this.image,
    this.video,
    this.document,
  });

  factory LearningCornerItem.fromJson(Map<String, dynamic> json) {
    return LearningCornerItem(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'],
      image: json['image'],
      video: json['video'],
      document: json['document'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'image': image,
      'video': video,
      'document': document,
    };
  }
}
