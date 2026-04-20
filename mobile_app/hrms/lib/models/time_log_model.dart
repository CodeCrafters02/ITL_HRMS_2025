class Project {
  final int id;
  final String name;

  Project({required this.id, required this.name});

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(id: json['id'] ?? 0, name: json['name'] ?? '');
  }
}

class TimeEntry {
  final int id;
  final String date;
  final int projectId;
  final String projectName;
  final String jobName;
  final String description;
  final int minutes;
  final String createdAt;

  TimeEntry({
    required this.id,
    required this.date,
    required this.projectId,
    required this.projectName,
    required this.jobName,
    required this.description,
    required this.minutes,
    required this.createdAt,
  });

  factory TimeEntry.fromJson(Map<String, dynamic> json) {
    return TimeEntry(
      id: json['id'] ?? 0,
      date: json['date']?.toString() ?? '',
      projectId: json['project'] ?? 0,
      projectName: json['project_name'] ?? '',
      jobName: json['job_name'] ?? '',
      description: json['description'] ?? '',
      minutes: json['minutes'] ?? 0,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}

