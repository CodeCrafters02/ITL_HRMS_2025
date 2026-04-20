class GoogleCalendarEvent {
  final String id;
  final String title;
  final String? description;
  final DateTime start;
  final DateTime end;
  final bool allDay;
  final String? htmlLink;
  final String? hangoutLink;
  final Map<String, String> privateProps;

  GoogleCalendarEvent({
    required this.id,
    required this.title,
    required this.start,
    required this.end,
    required this.allDay,
    this.description,
    this.htmlLink,
    this.hangoutLink,
    this.privateProps = const {},
  });

  static DateTime _parseDateTimeOrDate(Map<String, dynamic>? v) {
    if (v == null) return DateTime.now();
    final dt = v['dateTime'] as String?;
    final d = v['date'] as String?;
    if (dt != null && dt.isNotEmpty) return DateTime.parse(dt);
    if (d != null && d.isNotEmpty) return DateTime.parse('${d}T00:00:00');
    return DateTime.now();
  }

  factory GoogleCalendarEvent.fromJson(Map<String, dynamic> json) {
    final start = _parseDateTimeOrDate(json['start'] as Map<String, dynamic>?);
    final end = _parseDateTimeOrDate(json['end'] as Map<String, dynamic>?);
    final allDay =
        (json['start'] as Map<String, dynamic>?)?['date'] != null &&
            (json['start'] as Map<String, dynamic>?)?['dateTime'] == null;
    final private = (json['extendedProperties'] as Map<String, dynamic>?)?['private']
        as Map<String, dynamic>?;
    final privateProps = <String, String>{};
    if (private != null) {
      for (final e in private.entries) {
        final k = e.key.toString();
        final v = e.value?.toString();
        if (v != null) privateProps[k] = v;
      }
    }
    return GoogleCalendarEvent(
      id: (json['id'] ?? '').toString(),
      title: (json['summary'] ?? '(No title)').toString(),
      description: json['description']?.toString(),
      start: start,
      end: end,
      allDay: allDay,
      htmlLink: json['htmlLink']?.toString(),
      hangoutLink: json['hangoutLink']?.toString(),
      privateProps: privateProps,
    );
  }
}

