class Assignment {
  final int id;
  final int task;
  final int employee;
  final String role;
  final String status;
  final bool isSeen;
  final String employeeName;
  final String? avatarUrl;

  Assignment({
    required this.id,
    required this.task,
    required this.employee,
    required this.role,
    required this.status,
    required this.isSeen,
    required this.employeeName,
    this.avatarUrl,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      id: json['id'],
      task: json['task'],
      employee: json['employee'],
      role: json['role'] ?? '',
      status: json['status'] ?? 'todo',
      isSeen: json['is_seen'] ?? false,
      employeeName: json['employee_name'] ?? '',
      avatarUrl: json['avatar_url'],
    );
  }
}

class Subtask {
  final int id;
  final String title;
  final String description;
  final String deadline;
  final String priority;
  final String status;
  final List<Assignment> assignments;
  final int progress;

  Subtask({
    required this.id,
    required this.title,
    required this.description,
    required this.deadline,
    required this.priority,
    required this.status,
    required this.assignments,
    required this.progress,
  });

  factory Subtask.fromJson(Map<String, dynamic> json) {
    return Subtask(
      id: json['id'],
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      deadline: json['deadline'] ?? '',
      priority: json['priority'] ?? 'medium',
      status: json['status'] ?? 'todo',
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((a) => Assignment.fromJson(a))
              .toList() ??
          [],
      progress: json['progress'] ?? 0,
    );
  }
}

class Task {
  final int id;
  final String title;
  final String description;
  final List<String> contributors;
  final int createdBy;
  final String createdAt;
  final String deadline;
  final String priority;
  final String status;
  final List<Subtask> subtaskDetails;
  final List<Assignment> assignments;
  final int progress;

  Task({
    required this.id,
    required this.title,
    required this.description,
    required this.contributors,
    required this.createdBy,
    required this.createdAt,
    required this.deadline,
    required this.priority,
    required this.status,
    required this.subtaskDetails,
    required this.assignments,
    required this.progress,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'],
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      contributors: (json['contributors'] as List<dynamic>?)
              ?.map((c) => c.toString())
              .toList() ??
          [],
      createdBy: json['created_by'] ?? 0,
      createdAt: json['created_at'] ?? '',
      deadline: json['deadline'] ?? '',
      priority: json['priority'] ?? 'medium',
      status: json['status'] ?? 'todo',
      subtaskDetails: (json['subtask_details'] as List<dynamic>?)
              ?.map((s) => Subtask.fromJson(s))
              .toList() ??
          [],
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((a) => Assignment.fromJson(a))
              .toList() ??
          [],
      progress: json['progress'] ?? 0,
    );
  }
}

