class PresenceSummary {
  final bool lockedCheckin;
  final bool lockedCheckout;
  final String? availability;
  final String? currentSince;
  final bool hasAttendance;
  final int overtimeSeconds;
  final PresenceShift? shift;
  final String? punchIn;
  final String? punchOut;
  final bool punchLive;
  final String? workingLabel;
  final int? workingSeconds;
  final String? overtimeLabel;
  final String? shiftWorkingLabel;
  final int? shiftWorkingSeconds;
  final List<PresenceSegment> timeline;
  final List<PresenceStatusRow> statuses;
  final List<PresenceSession> sessions;
  final DateTime fetchedAt;

  PresenceSummary({
    required this.lockedCheckin,
    required this.lockedCheckout,
    this.availability,
    this.currentSince,
    this.hasAttendance = false,
    this.overtimeSeconds = 0,
    this.shift,
    this.punchIn,
    this.punchOut,
    required this.punchLive,
    this.workingLabel,
    this.workingSeconds,
    this.overtimeLabel,
    this.shiftWorkingLabel,
    this.shiftWorkingSeconds,
    required this.timeline,
    required this.statuses,
    required this.sessions,
    DateTime? fetchedAt,
  }) : fetchedAt = fetchedAt ?? DateTime.now();

  bool get hasData => timeline.isNotEmpty || statuses.isNotEmpty || sessions.isNotEmpty;
  bool get isVisible => availability != null || hasAttendance || timeline.isNotEmpty;
  int? get liveShiftSeconds {
    final sh = shift;
    if (sh == null || !sh.assigned || sh.workingSeconds == null) return null;
    int toMin(String? v) {
      final p = (v ?? '0:0').split(':');
      return (int.tryParse(p[0]) ?? 0) * 60 + (int.tryParse(p.length > 1 ? p[1] : '0') ?? 0);
    }
    final n = DateTime.now();
    final cur = n.hour * 60 + n.minute, st = toMin(sh.start), en = toMin(sh.end);
    final inShift = st <= en ? (cur >= st && cur < en) : (cur >= st || cur < en);
    return sh.workingSeconds! + (punchLive && inShift ? n.difference(fetchedAt).inSeconds : 0);
  }

  static String hms(int t) {
    String p2(int n) => n.toString().padLeft(2, '0');
    return '${p2(t ~/ 3600)}:${p2((t % 3600) ~/ 60)}:${p2(t % 60)}';
  }

  bool get locked => lockedCheckin || lockedCheckout;

  int? get liveWorkingSeconds {
    if (workingSeconds == null) return null;
    return workingSeconds! + (punchLive ? DateTime.now().difference(fetchedAt).inSeconds : 0);
  }

  factory PresenceSummary.fromJson(Map<String, dynamic> j) {
    final locked = (j['locked'] as Map?) ?? const {};
    final punch = (j['punch'] as Map?) ?? const {};
    final working = j['working'] as Map?;
    final shiftWorking = ((j['shift'] as Map?)?['working']) as Map?;
    List<T> list<T>(String k, T Function(Map<String, dynamic>) f) =>
        ((j[k] as List?) ?? const []).map((e) => f(Map<String, dynamic>.from(e as Map))).toList();
    return PresenceSummary(
      lockedCheckin: locked['checkin'] == true,
      lockedCheckout: locked['checkout'] == true,
      availability: (j['current'] as Map?)?['availability']?.toString(),
      currentSince: (j['current'] as Map?)?['since']?.toString(),
      hasAttendance: j['attendance'] != null,
      overtimeSeconds: ((j['overtime'] as Map?)?['seconds'] as num?)?.toInt() ?? 0,
      shift: j['shift'] is Map ? PresenceShift.fromJson(Map<String, dynamic>.from(j['shift'] as Map)) : null,
      punchIn: punch['in']?.toString(),
      punchOut: punch['out']?.toString(),
      punchLive: punch['live'] == true,
      workingLabel: working?['label']?.toString(),
      workingSeconds: (working?['seconds'] as num?)?.toInt(),
      overtimeLabel: (j['overtime'] as Map?)?['label']?.toString(),
      shiftWorkingLabel: shiftWorking?['label']?.toString(),
      shiftWorkingSeconds: (shiftWorking?['seconds'] as num?)?.toInt(),
      timeline: list('timeline', PresenceSegment.fromJson),
      statuses: list('statuses', PresenceStatusRow.fromJson),
      sessions: list('sessions', PresenceSession.fromJson),
    );
  }
}

class PresenceSegment {
  final String status, start, end, label;
  PresenceSegment(this.status, this.start, this.end, this.label);
  factory PresenceSegment.fromJson(Map<String, dynamic> j) => PresenceSegment(
        j['status']?.toString() ?? '',
        j['start']?.toString() ?? '',
        j['end']?.toString() ?? '',
        j['label']?.toString() ?? '',
      );
}

class PresenceStatusRow {
  final String status, label;
  PresenceStatusRow(this.status, this.label);
  factory PresenceStatusRow.fromJson(Map<String, dynamic> j) =>
      PresenceStatusRow(j['status']?.toString() ?? '', j['label']?.toString() ?? '');
}

class PresenceSession {
  final String start, end;
  PresenceSession(this.start, this.end);
  factory PresenceSession.fromJson(Map<String, dynamic> j) =>
      PresenceSession(j['start']?.toString() ?? '', j['end']?.toString() ?? '');
}

class PresenceShift {
  final bool assigned;
  final String? type, start, end, workingLabel, outsideLabel, fullDayLabel;
  final int? workingSeconds;
  final int? fullDaySeconds;
  PresenceShift({this.fullDaySeconds, required this.assigned, this.workingSeconds, this.type, this.start, this.end, this.workingLabel, this.outsideLabel, this.fullDayLabel});
  factory PresenceShift.fromJson(Map<String, dynamic> j) => PresenceShift(
        assigned: j['assigned'] == true,
        type: j['type']?.toString(),
        start: j['start']?.toString(),
        end: j['end']?.toString(),
        workingLabel: (j['working'] as Map?)?['label']?.toString(),
        workingSeconds: ((j['working'] as Map?)?['seconds'] as num?)?.toInt(),
        outsideLabel: (j['outside'] as Map?)?['label']?.toString(),
        fullDaySeconds: ((j['full_day'] as Map?)?['seconds'] as num?)?.toInt(),
        fullDayLabel: (j['full_day'] as Map?)?['label']?.toString(),
      );
}
