class ApiConfig {
  /// Base URL for the backend API.
  ///
  /// Override at build time:
  /// `--dart-define=API_BASE_URL=https://apihrms.innovyxtechlabs.com`
  ///
  /// Keep a sensible dev default for local/LAN testing.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.1.3:8000',
  );

  /// Login footer "Contact IT Support" mailto. Override at build:
  /// `--dart-define=IT_SUPPORT_EMAIL=help@company.com`
  static const String itSupportEmail = String.fromEnvironment(
    'IT_SUPPORT_EMAIL',
    defaultValue: 'it-support@company.local',
  );

  static Uri get itSupportMailtoUri => Uri(
        scheme: 'mailto',
        path: itSupportEmail,
        queryParameters: const {'subject': 'HRMS access help'},
      );

  // Alternative for local development:
  // static const String baseUrl = 'http://localhost:8000';
  // For Android emulator use: 'http://10.0.2.2:8000'

  // API Endpoints
  static const String loginEndpoint = '/app/login/';
  static const String googleLoginEndpoint = '/app/google-login/';
  static const String registerEndpoint = '/app/master-register/';
  static const String tokenRefreshEndpoint = '/api/token/refresh/';
  static const String changePasswordEndpoint = '/app/change-password/';

  // Chat Endpoints (REST + WebSocket)
  static const String chatConversationsEndpoint = '/app/chat-conversations/';
  static const String chatConversationsDmEndpoint = '/app/chat-conversations/dm/';
  static const String chatMessagesEndpoint = '/app/chat-messages/';
  static const String chatUsersEndpoint = '/app/chat/users/';

  // Employee Endpoints
  static const String employeeDashboardEndpoint = '/employee/dashboard/';
  static const String employeeCheckInEndpoint = '/employee/checkin/';
  static const String employeeCheckOutEndpoint = '/employee/checkout/';
  static const String employeeBreakEndpoint = '/employee/employee-breaks/';
  static const String employeeStatusEndpoint = '/app/employeestatus/';
  static const String employeeIdEndpoint = '/employee/employee-id/';
  static const String reportingManagersEndpoint =
      '/employee/reporting-managers/';
  static const String companyInfoEndpoint = '/employee/company-info/';
  static const String myTasksEndpoint = '/employee/my-tasks/';
  static const String taskAssignmentStatusEndpoint =
      '/employee/tasks-assignment/';
  static const String attendanceHistoryEndpoint =
      '/employee/attendance-history/';
  static const String leavesListEndpoint = '/employee/leaves-list/';
  static const String employeeLeaveCreateEndpoint =
      '/employee/employee-leave-create/';
  static const String empLeavesEndpoint = '/employee/emp-leaves/';
  static const String allNotificationsEndpoint = '/employee/all-notifications/';
  static const String employeeCalendarEndpoint = '/employee/employee-calendar/';
  static const String employeeCompanyPoliciesEndpoint =
      '/employee/employee-companypolicies/';
  static const String reporteesEndpoint = '/app/getreportees/';
  static const String tasksEndpoint = '/employee/tasks/';
  static const String taskAssignEndpoint = '/employee/task-assign/';
  static const String leaveRequestsEndpoint = '/employee/emp-leaves/';
  static const String employeeReferenceEndpoint =
      '/employee/employeereference/';
  static const String employeeProfileEndpoint = '/employee/employee-profile/';
  static const String employeeHierarchyEndpoint =
      '/employee/employee-hierarchy/';
  static const String deviceTokenEndpoint = '/notifications/devices/';
  static const String learningCornerEndpoint = '/employee/emp-learning-corner/';
  static const String announcementsEndpoint = '/employee/announcements/';
  static const String timeLogMetaEndpoint = '/employee/time-log/meta/';
  static const String timeLogEndpoint = '/employee/time-log/';

  // Office / Seat Booking Endpoints
  static const String officeLocationsEndpoint = '/app/office-locations/';
  static const String officeFloorsEndpoint = '/app/office-floors/';
  static const String officeSeatsEndpoint = '/app/office-seats/';
  static const String seatBookingsEndpoint = '/app/seat-bookings/';
  
  // Conference Room Endpoints
  static const String conferenceRoomConfigEndpoint = '/app/conference-room-config/';
  static const String conferenceRoomsEndpoint = '/app/conference-rooms/';
  static const String conferenceRoomBookingsEndpoint = '/app/conference-room-bookings/';

  // Full URLs
  static String get loginUrl => '$baseUrl$loginEndpoint';
  static String get googleLoginUrl => '$baseUrl$googleLoginEndpoint';
  static String get registerUrl => '$baseUrl$registerEndpoint';
  static String get tokenRefreshUrl => '$baseUrl$tokenRefreshEndpoint';
  static String get changePasswordUrl => '$baseUrl$changePasswordEndpoint';

  // Chat URLs
  static String get chatConversationsUrl => '$baseUrl$chatConversationsEndpoint';
  static String get chatConversationsDmUrl => '$baseUrl$chatConversationsDmEndpoint';
  static String get chatMessagesUrl => '$baseUrl$chatMessagesEndpoint';
  static String get chatUsersUrl => '$baseUrl$chatUsersEndpoint';

  /// WebSocket URL for chat. Backend expects query param: `?token=<access_token>`.
  /// Backend route: `/ws/chat/` (see Django Channels routing).
  static Uri chatWsUri({required String token}) {
    final base = Uri.parse(baseUrl);
    final wsScheme = base.scheme == 'https' ? 'wss' : 'ws';
    // Ensure we always hit `/ws/chat/` at the backend root (not under /app).
    return Uri(
      scheme: wsScheme,
      host: base.host,
      port: base.hasPort ? base.port : null,
      path: '/ws/chat/',
      queryParameters: {'token': token},
    );
  }
  static String get employeeDashboardUrl =>
      '$baseUrl$employeeDashboardEndpoint';
  static String get employeeCheckInUrl => '$baseUrl$employeeCheckInEndpoint';
  static String get employeeCheckOutUrl => '$baseUrl$employeeCheckOutEndpoint';
  static String get employeeBreakUrl => '$baseUrl$employeeBreakEndpoint';
  static String get employeeStatusUrl => '$baseUrl$employeeStatusEndpoint';
  static String get employeeIdUrl => '$baseUrl$employeeIdEndpoint';
  static String get reportingManagersUrl =>
      '$baseUrl$reportingManagersEndpoint';
  static String get companyInfoUrl => '$baseUrl$companyInfoEndpoint';
  static String get myTasksUrl => '$baseUrl$myTasksEndpoint';
  static String taskAssignmentStatusUrl(int assignmentId) =>
      '$baseUrl$taskAssignmentStatusEndpoint$assignmentId/status/';
  static String attendanceHistoryUrl(int month, int year) =>
      '$baseUrl$attendanceHistoryEndpoint?month=$month&year=$year';
  static String get leavesListUrl => '$baseUrl$leavesListEndpoint';
  static String get employeeLeaveCreateUrl =>
      '$baseUrl$employeeLeaveCreateEndpoint';
  static String get empLeavesUrl => '$baseUrl$empLeavesEndpoint';
  static String cancelLeaveUrl(int leaveId) =>
      '$baseUrl/employee/emp-leaves/$leaveId/cancel/';
  static String get allNotificationsUrl => '$baseUrl$allNotificationsEndpoint';
  static String employeeCalendarUrl(int year, int month, int day) =>
      '$baseUrl$employeeCalendarEndpoint?year=$year&month=$month&day=$day';
  static String get employeeCalendarBaseUrl =>
      '$baseUrl$employeeCalendarEndpoint';
  static String employeeCalendarEventUrl(int eventId) =>
      '$baseUrl$employeeCalendarEndpoint$eventId/';
  static String get employeeCompanyPoliciesUrl =>
      '$baseUrl$employeeCompanyPoliciesEndpoint';
  static String get reporteesUrl => '$baseUrl$reporteesEndpoint';
  static String get tasksUrl => '$baseUrl$tasksEndpoint';
  static String taskUrl(int taskId) => '$baseUrl$tasksEndpoint$taskId/';
  static String taskAssignUrl(int taskId) =>
      '$baseUrl$taskAssignEndpoint$taskId/';
  static String get leaveRequestsUrl => '$baseUrl$leaveRequestsEndpoint';
  static String approveLeaveUrl(int leaveId) =>
      '$baseUrl$leaveRequestsEndpoint$leaveId/approve/';
  static String rejectLeaveUrl(int leaveId) =>
      '$baseUrl$leaveRequestsEndpoint$leaveId/reject/';
  static String get employeeReferenceUrl =>
      '$baseUrl$employeeReferenceEndpoint';
  static String employeeReferenceDetailUrl(int referenceId) =>
      '$baseUrl$employeeReferenceEndpoint$referenceId/';
  static String get employeeProfileUrl => '$baseUrl$employeeProfileEndpoint';
  static String get employeeHierarchyUrl =>
      '$baseUrl$employeeHierarchyEndpoint';
  static String get deviceTokenUrl => '$baseUrl$deviceTokenEndpoint';
  static String get learningCornerUrl => '$baseUrl$learningCornerEndpoint';
  static String get announcementsUrl => '$baseUrl$announcementsEndpoint';
  static String get timeLogMetaUrl => '$baseUrl$timeLogMetaEndpoint';
  static String get timeLogUrl => '$baseUrl$timeLogEndpoint';

  // Office / Seat Booking URLs
  static String get officeLocationsUrl => '$baseUrl$officeLocationsEndpoint';
  static String officeFloorsUrl({required int locationId}) =>
      '$baseUrl$officeFloorsEndpoint?location=$locationId';
  static String officeSeatsUrl({required int floorId}) =>
      '$baseUrl$officeSeatsEndpoint?floor=$floorId';

  /// Seat bookings query helper.
  ///
  /// Backend supports filters:
  /// - `date=YYYY-MM-DD`
  /// - `floor=<id>`
  /// - `start_time=HH:MM` and `end_time=HH:MM`
  /// - `seat_number=<label>`
  /// - `status=<pending|approved|rejected|cancelled>`
  /// - `history=true`
  static String seatBookingsUrl({
    String? date,
    int? floorId,
    String? startTime,
    String? endTime,
    String? seatNumber,
    String? status,
    bool? history,
  }) {
    final qp = <String, String>{};
    if (date != null && date.isNotEmpty) qp['date'] = date;
    if (floorId != null) qp['floor'] = floorId.toString();
    if (startTime != null && startTime.isNotEmpty) qp['start_time'] = startTime;
    if (endTime != null && endTime.isNotEmpty) qp['end_time'] = endTime;
    if (seatNumber != null && seatNumber.isNotEmpty) qp['seat_number'] = seatNumber;
    if (status != null && status.isNotEmpty) qp['status'] = status;
    if (history != null) qp['history'] = history ? 'true' : 'false';

    final base = Uri.parse('$baseUrl$seatBookingsEndpoint');
    final uri = base.replace(queryParameters: qp.isEmpty ? null : qp);
    return uri.toString();
  }

  static String get seatBookingCreateUrl => '$baseUrl$seatBookingsEndpoint';
  static String seatBookingCancelUrl(int bookingId) =>
      '$baseUrl$seatBookingsEndpoint$bookingId/cancel/';

  // Conference Room URLs
  static String get conferenceRoomConfigUrl => '$baseUrl$conferenceRoomConfigEndpoint';
  static String conferenceRoomsUrl({required int floorId}) =>
      '$baseUrl$conferenceRoomsEndpoint?floor=$floorId';
  static String conferenceRoomBookingsUrl({
    String? date,
    int? floorId,
  }) {
    final qp = <String, String>{};
    if (date != null && date.isNotEmpty) qp['date'] = date;
    if (floorId != null) qp['floor'] = floorId.toString();
    final base = Uri.parse('$baseUrl$conferenceRoomBookingsEndpoint');
    return base.replace(queryParameters: qp.isEmpty ? null : qp).toString();
  }
  static String get conferenceRoomBookingCreateUrl => '$baseUrl$conferenceRoomBookingsEndpoint';
  static String conferenceRoomBookingCancelUrl(int bookingId) =>
      '$baseUrl$conferenceRoomBookingsEndpoint$bookingId/cancel/';

  // API Headers
  static Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  static Map<String, String> getAuthHeaders(String token) => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer $token',
  };
}
