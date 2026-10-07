class OutlookCalendarEvent {
  final String id;
  final String title;
  final String? description;
  final DateTime start;
  final DateTime end;
  final bool allDay;
  final String? webLink;
  final String? meetingLink;

  OutlookCalendarEvent({
    required this.id,
    required this.title,
    required this.start,
    required this.end,
    required this.allDay,
    this.description,
    this.webLink,
    this.meetingLink,
  });

  factory OutlookCalendarEvent.fromJson(Map<String, dynamic> j) {
    final allDay = j['all_day'] == true;
    DateTime p(Object? v) => DateTime.tryParse('$v') ?? DateTime.now();
    return OutlookCalendarEvent(
      id: '${j['id'] ?? ''}',
      title: '${j['title'] ?? '(No title)'}',
      description: j['description']?.toString(),
      start: allDay ? p('${j['start']}T00:00:00') : p(j['start']).toLocal(),
      end: allDay ? p('${j['end']}T00:00:00') : p(j['end']).toLocal(),
      allDay: allDay,
      webLink: j['web_link']?.toString(),
      meetingLink: j['online_meeting_url']?.toString(),
    );
  }
}
