class CalendarEvent {
  final String id;
  final String title;
  final DateTime date;
  final String? description;
  final String type; // 'personal' or 'admin'

  CalendarEvent({
    required this.id,
    required this.title,
    required this.date,
    this.description,
    required this.type,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json, String type) {
    // Handle both 'title' and 'name' fields from backend
    final title = json['title'] ?? json['name'] ?? '';
    final dateStr = json['date'];
    DateTime date;
    
    try {
      if (dateStr is String) {
        date = DateTime.parse(dateStr);
      } else {
        date = DateTime.now();
      }
    } catch (e) {
      date = DateTime.now();
    }
    
    return CalendarEvent(
      id: json['id']?.toString() ?? '',
      title: title,
      date: date,
      description: json['description'],
      type: type,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': title,
      'date': date.toIso8601String().split('T')[0], // YYYY-MM-DD format
      'description': description ?? '',
    };
  }
}

class CalendarDay {
  final int? day;
  final DateTime? date;
  final List<CalendarEvent> adminEvents;
  final List<CalendarEvent> personalEvents;
  final bool isToday;
  final bool isSelected;

  CalendarDay({
    this.day,
    this.date,
    required this.adminEvents,
    required this.personalEvents,
    required this.isToday,
    required this.isSelected,
  });

  factory CalendarDay.fromJson(Map<String, dynamic> json) {
    final dayNum = json['day'];
    final dateStr = json['date'];
    
    return CalendarDay(
      day: dayNum is int ? dayNum : (dayNum is String && dayNum.isNotEmpty ? int.tryParse(dayNum) : null),
      date: dateStr != null ? DateTime.tryParse(dateStr) : null,
      adminEvents: (json['admin_events'] as List<dynamic>?)
          ?.map((e) => CalendarEvent.fromJson(e, 'admin'))
          .toList() ?? [],
      personalEvents: (json['personal_events'] as List<dynamic>?)
          ?.map((e) => CalendarEvent.fromJson(e, 'personal'))
          .toList() ?? [],
      isToday: json['is_today'] ?? false,
      isSelected: json['is_selected'] ?? false,
    );
  }

  List<CalendarEvent> get allEvents => [...adminEvents, ...personalEvents];
}

class CalendarData {
  final DateTime currentDate;
  final List<List<CalendarDay>> weeks;
  final Map<String, int> prevMonth;
  final Map<String, int> nextMonth;

  CalendarData({
    required this.currentDate,
    required this.weeks,
    required this.prevMonth,
    required this.nextMonth,
  });

  factory CalendarData.fromJson(Map<String, dynamic> json) {
    return CalendarData(
      currentDate: DateTime.parse(json['current_date'] ?? DateTime.now().toIso8601String()),
      weeks: (json['weeks'] as List<dynamic>?)
          ?.map((week) => (week as List<dynamic>)
              .map((day) => CalendarDay.fromJson(day as Map<String, dynamic>))
              .toList())
          .toList() ?? [],
      prevMonth: Map<String, int>.from(json['prev_month'] ?? {}),
      nextMonth: Map<String, int>.from(json['next_month'] ?? {}),
    );
  }
}

