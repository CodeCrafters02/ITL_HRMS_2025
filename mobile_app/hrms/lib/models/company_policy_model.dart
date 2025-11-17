class CompanyPolicy {
  final int id;
  final String name;
  final String? documentUrl;

  CompanyPolicy({
    required this.id,
    required this.name,
    this.documentUrl,
  });

  factory CompanyPolicy.fromJson(Map<String, dynamic> json) {
    return CompanyPolicy(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      documentUrl: json['document'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'document': documentUrl,
    };
  }
}

