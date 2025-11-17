class UserModel {
  final String username;
  final String email;
  final String role;
  final String? accessToken;
  final String? refreshToken;

  UserModel({
    required this.username,
    required this.email,
    required this.role,
    this.accessToken,
    this.refreshToken,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      accessToken: json['access'],
      refreshToken: json['refresh'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'email': email,
      'role': role,
      'access': accessToken,
      'refresh': refreshToken,
    };
  }
}

class LoginResponse {
  final String accessToken;
  final String refreshToken;
  final String role;

  LoginResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.role,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['access'] ?? '',
      refreshToken: json['refresh'] ?? '',
      role: json['role'] ?? '',
    );
  }
}

class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  ApiResponse({required this.success, this.message, this.data});
}
