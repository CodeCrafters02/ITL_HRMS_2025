class ChatUser {
  final int id;
  final String username;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? role; // present in /chat/users/ picker results

  const ChatUser({
    required this.id,
    required this.username,
    required this.email,
    this.firstName,
    this.lastName,
    this.role,
  });

  String get displayName {
    final full = '${firstName ?? ''} ${lastName ?? ''}'.trim();
    if (full.isNotEmpty) return full;
    if (username.trim().isNotEmpty) return username.trim();
    return email.trim();
  }

  factory ChatUser.fromJson(Map<String, dynamic> json) {
    return ChatUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      username: (json['username'] as String?) ?? '',
      email: (json['email'] as String?) ?? '',
      firstName: (json['first_name'] as String?)?.trim().isEmpty == true
          ? null
          : (json['first_name'] as String?)?.trim(),
      lastName: (json['last_name'] as String?)?.trim().isEmpty == true
          ? null
          : (json['last_name'] as String?)?.trim(),
      role: (json['role'] as String?)?.trim().isEmpty == true
          ? null
          : (json['role'] as String?)?.trim(),
    );
  }
}

