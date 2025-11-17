class ApiConfig {
  // Base URL - Change this to your backend server URL
  // static const String baseUrl = 'https://apihrms.innovyxtechlabs.com';
  static const String baseUrl = 'http://192.168.0.3:8000';

  // Alternative for local development:
  // static const String baseUrl = 'http://localhost:8000';
  // For Android emulator use: 'http://10.0.2.2:8000'

  // API Endpoints
  static const String loginEndpoint = '/app/login/';
  static const String registerEndpoint = '/app/master-register/';
  static const String tokenRefreshEndpoint = '/api/token/refresh/';

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

  // Full URLs
  static String get loginUrl => '$baseUrl$loginEndpoint';
  static String get registerUrl => '$baseUrl$registerEndpoint';
  static String get tokenRefreshUrl => '$baseUrl$tokenRefreshEndpoint';
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
      '$baseUrl${taskAssignmentStatusEndpoint}$assignmentId/status/';
  static String attendanceHistoryUrl(int month, int year) =>
      '$baseUrl${attendanceHistoryEndpoint}?month=$month&year=$year';
  static String get leavesListUrl => '$baseUrl$leavesListEndpoint';
  static String get employeeLeaveCreateUrl =>
      '$baseUrl$employeeLeaveCreateEndpoint';
  static String get empLeavesUrl => '$baseUrl$empLeavesEndpoint';
  static String cancelLeaveUrl(int leaveId) =>
      '$baseUrl/employee/emp-leaves/$leaveId/cancel/';
  static String get allNotificationsUrl => '$baseUrl$allNotificationsEndpoint';
  static String employeeCalendarUrl(int year, int month, int day) =>
      '$baseUrl${employeeCalendarEndpoint}?year=$year&month=$month&day=$day';
  static String get employeeCalendarBaseUrl => '$baseUrl$employeeCalendarEndpoint';
  static String employeeCalendarEventUrl(int eventId) =>
      '$baseUrl${employeeCalendarEndpoint}$eventId/';

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
