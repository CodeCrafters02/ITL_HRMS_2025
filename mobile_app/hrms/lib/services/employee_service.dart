import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../config/api_config.dart';
import '../models/dashboard_model.dart';
import '../models/break_config_model.dart';
import '../models/task_model.dart';
import '../models/attendance_history_model.dart';
import '../models/leave_model.dart';
import '../models/notification_model.dart';
import '../models/calendar_model.dart';
import '../models/company_policy_model.dart';
import '../models/reportee_model.dart';
import '../models/leave_request_model.dart';
import '../models/employee_reference_model.dart';
import '../services/storage_service.dart';
import 'dart:io';

class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  ApiResponse({required this.success, this.message, this.data});
}

class EmployeeService {
  // Get dashboard data
  static Future<ApiResponse<DashboardData>> getDashboardData() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.employeeDashboardUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['dashboard_data'] != null) {
          final dashboardData = DashboardData.fromJson(data['dashboard_data']);
          return ApiResponse(
            success: true,
            message: 'Dashboard data loaded successfully',
            data: dashboardData,
          );
        } else {
          return ApiResponse(
            success: false,
            message: 'Invalid dashboard data format',
          );
        }
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load dashboard data',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Check-in
  static Future<ApiResponse<Map<String, dynamic>>> checkIn() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.employeeCheckInUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: data['message'] ?? 'Checked in successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Check-in failed',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Check-out
  static Future<ApiResponse<Map<String, dynamic>>> checkOut() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.employeeCheckOutUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: data['message'] ?? 'Checked out successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Check-out failed',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Start break
  static Future<ApiResponse<Map<String, dynamic>>> startBreak(
    int breakConfigId,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.employeeBreakUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({'break_config_id': breakConfigId, 'action': 'start'}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: data['message'] ?? 'Break started successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to start break',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // End break
  static Future<ApiResponse<Map<String, dynamic>>> endBreak(
    int breakConfigId,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.employeeBreakUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({'break_config_id': breakConfigId, 'action': 'end'}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: data['message'] ?? 'Break ended successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to end break',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Update employee status
  static Future<ApiResponse<Map<String, dynamic>>> updateEmployeeStatus(
    String status,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      // First, get employee ID
      final employeeIdResponse = await http.get(
        Uri.parse(ApiConfig.employeeIdUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (employeeIdResponse.statusCode != 200) {
        return ApiResponse(
          success: false,
          message: 'Failed to get employee ID',
        );
      }

      final employeeIdData = jsonDecode(employeeIdResponse.body);
      final employeeId = employeeIdData['employee_id'] ?? employeeIdData['id'];

      if (employeeId == null) {
        return ApiResponse(success: false, message: 'Employee ID not found');
      }

      // Get all employee statuses to find the current one
      final statusListResponse = await http.get(
        Uri.parse(ApiConfig.employeeStatusUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (statusListResponse.statusCode != 200) {
        return ApiResponse(
          success: false,
          message: 'Failed to get employee status list',
        );
      }

      final statusList = jsonDecode(statusListResponse.body);
      final employeeStatus = statusList.firstWhere(
        (item) => item['id'].toString() == employeeId.toString(),
        orElse: () => null,
      );

      if (employeeStatus == null) {
        return ApiResponse(
          success: false,
          message: 'Employee status not found',
        );
      }

      // Update the status
      final updateResponse = await http.patch(
        Uri.parse(
          '${ApiConfig.baseUrl}/app/employeestatus/${employeeStatus['id']}/',
        ),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({'status': status}),
      );

      if (updateResponse.statusCode == 200) {
        final data = jsonDecode(updateResponse.body);
        return ApiResponse(
          success: true,
          message: 'Status updated successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(updateResponse.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to update status',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Get break configurations
  static Future<ApiResponse<List<BreakConfig>>> getBreakConfigs() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.employeeBreakUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final breakConfigs = data
            .map((item) => BreakConfig.fromJson(item))
            .where((config) => config.enabled)
            .toList();
        return ApiResponse(
          success: true,
          message: 'Break configs loaded successfully',
          data: breakConfigs,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load break configs',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Check if user is a reporting manager
  static Future<bool> isReportingManager() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return false;

      // Get employee ID first
      final employeeIdResponse = await http.get(
        Uri.parse(ApiConfig.employeeIdUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (employeeIdResponse.statusCode != 200) return false;

      final employeeIdData = jsonDecode(employeeIdResponse.body);
      final employeeId = employeeIdData['employee_id'] ?? employeeIdData['id'];

      if (employeeId == null) return false;

      // Get reporting managers list
      final response = await http.get(
        Uri.parse(ApiConfig.reportingManagersUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final managers = data is List
            ? data
            : (data['reporting_managers'] ?? []);

        // Check if current employee ID is in the managers list
        final isManager = managers.any(
          (mgr) =>
              (mgr['id']?.toString() ?? mgr['id']?.toString()) ==
              employeeId.toString(),
        );

        return isManager;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Get company info
  static Future<ApiResponse<Map<String, dynamic>>> getCompanyInfo() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.companyInfoUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: 'Company info loaded successfully',
          data: {
            'company_logo_url': data['company_logo_url'],
            'company_name': data['company_name'],
          },
        );
      } else {
        return ApiResponse(
          success: false,
          message: 'Failed to load company info',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Get my tasks
  static Future<ApiResponse<List<Task>>> getMyTasks() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.myTasksUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final tasks = data.map((item) => Task.fromJson(item)).toList();
        return ApiResponse(
          success: true,
          message: 'Tasks loaded successfully',
          data: tasks,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load tasks',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Update assignment status
  static Future<ApiResponse<Map<String, dynamic>>> updateAssignmentStatus(
    int assignmentId,
    String status,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.patch(
        Uri.parse(ApiConfig.taskAssignmentStatusUrl(assignmentId)),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({'status': status}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Handle empty response or parse JSON
        if (response.body.isEmpty) {
          return ApiResponse(
            success: true,
            message: 'Status updated successfully',
            data: {'detail': 'Assignment status updated.'},
          );
        }

        try {
          final data = jsonDecode(response.body);
          return ApiResponse(
            success: true,
            message: data['detail'] ?? 'Status updated successfully',
            data: data,
          );
        } catch (e) {
          // If JSON parsing fails but status is 200, consider it success
          return ApiResponse(
            success: true,
            message: 'Status updated successfully',
            data: {'detail': response.body},
          );
        }
      } else {
        // Handle error response
        String errorMessage = 'Failed to update status';
        try {
          if (response.body.isNotEmpty) {
            final error = jsonDecode(response.body);
            errorMessage = error['detail'] ?? error['message'] ?? errorMessage;
          }
        } catch (e) {
          // If error response is not JSON, use status code message
          if (response.statusCode == 403) {
            errorMessage = 'Permission denied';
          } else if (response.statusCode == 404) {
            errorMessage = 'Assignment not found';
          } else if (response.statusCode == 400) {
            errorMessage = 'Invalid request';
          } else {
            errorMessage = 'Failed to update status (${response.statusCode})';
          }
        }

        return ApiResponse(success: false, message: errorMessage);
      }
    } catch (e) {
      // Handle network errors and other exceptions
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get attendance history
  static Future<ApiResponse<AttendanceHistoryData>> getAttendanceHistory({
    int? month,
    int? year,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final now = DateTime.now();
      final selectedMonth = month ?? now.month;
      final selectedYear = year ?? now.year;

      final response = await http.get(
        Uri.parse(ApiConfig.attendanceHistoryUrl(selectedMonth, selectedYear)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final attendanceHistory = AttendanceHistoryData.fromJson(data);
        return ApiResponse(
          success: true,
          message: 'Attendance history loaded successfully',
          data: attendanceHistory,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load attendance history',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Get leave types
  static Future<ApiResponse<List<LeaveType>>> getLeaveTypes() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.leavesListUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final leaveTypes = data
            .map((item) => LeaveType.fromJson(item))
            .toList();
        return ApiResponse(
          success: true,
          message: 'Leave types loaded successfully',
          data: leaveTypes,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load leave types',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Get applied leaves
  static Future<ApiResponse<List<AppliedLeave>>> getAppliedLeaves() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.employeeLeaveCreateUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final appliedLeaves = data
            .map((item) => AppliedLeave.fromJson(item))
            .toList();
        return ApiResponse(
          success: true,
          message: 'Applied leaves loaded successfully',
          data: appliedLeaves,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to load applied leaves',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Create leave application
  static Future<ApiResponse<Map<String, dynamic>>> createLeave({
    required int leaveType,
    required String fromDate,
    required String toDate,
    required String reason,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.employeeLeaveCreateUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({
          'leave_type': leaveType,
          'from_date': fromDate,
          'to_date': toDate,
          'reason': reason,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        try {
          final data = jsonDecode(response.body);
          return ApiResponse(
            success: true,
            message:
                data['detail'] ?? 'Leave application submitted successfully',
            data: data,
          );
        } catch (e) {
          return ApiResponse(
            success: true,
            message: 'Leave application submitted successfully',
            data: {},
          );
        }
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to submit leave application',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Cancel leave
  static Future<ApiResponse<Map<String, dynamic>>> cancelLeave(
    int leaveId,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.cancelLeaveUrl(leaveId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        try {
          final data = jsonDecode(response.body);
          return ApiResponse(
            success: true,
            message: data['detail'] ?? 'Leave cancelled successfully',
            data: data,
          );
        } catch (e) {
          return ApiResponse(
            success: true,
            message: 'Leave cancelled successfully',
            data: {},
          );
        }
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to cancel leave',
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
      );
    }
  }

  // Get all notifications
  static Future<ApiResponse<List<NotificationModel>>>
  getAllNotifications() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.allNotificationsUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final notifications = data
            .map((item) => NotificationModel.fromJson(item))
            .toList();
        return ApiResponse(success: true, data: notifications);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch notifications',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get calendar data
  static Future<ApiResponse<CalendarData>> getCalendarData({
    int? year,
    int? month,
    int? day,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final now = DateTime.now();
      final url = ApiConfig.employeeCalendarUrl(
        year ?? now.year,
        month ?? now.month,
        day ?? now.day,
      );

      final response = await http.get(
        Uri.parse(url),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final calendarData = CalendarData.fromJson(data);
        return ApiResponse(success: true, data: calendarData);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch calendar data',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Create personal calendar event
  static Future<ApiResponse<Map<String, dynamic>>> createCalendarEvent({
    required String name,
    required DateTime date,
    String? description,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.employeeCalendarBaseUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({
          'name': name,
          'date': DateFormat('yyyy-MM-dd').format(date),
          'description': description ?? '',
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: 'Event created successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to create event',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Update personal calendar event
  static Future<ApiResponse<Map<String, dynamic>>> updateCalendarEvent({
    required int eventId,
    required String name,
    required DateTime date,
    String? description,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.put(
        Uri.parse(ApiConfig.employeeCalendarEventUrl(eventId)),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({
          'name': name,
          'date': DateFormat('yyyy-MM-dd').format(date),
          'description': description ?? '',
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse(
          success: true,
          message: 'Event updated successfully',
          data: data,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to update event',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Delete personal calendar event
  static Future<ApiResponse<void>> deleteCalendarEvent(int eventId) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.employeeCalendarEventUrl(eventId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse(
          success: true,
          message: 'Event deleted successfully',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to delete event',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get company policies
  static Future<ApiResponse<List<CompanyPolicy>>> getCompanyPolicies() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.employeeCompanyPoliciesUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final policies = (data as List<dynamic>)
            .map((json) => CompanyPolicy.fromJson(json))
            .toList();
        return ApiResponse(success: true, data: policies);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch company policies',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get reportees
  static Future<ApiResponse<List<Reportee>>> getReportees(
    int employeeId,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.reporteesUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({'employee_id': employeeId}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final reportees = (data as List<dynamic>)
            .map((json) => Reportee.fromJson(json))
            .toList();
        return ApiResponse(success: true, data: reportees);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message:
              error['error'] ?? error['detail'] ?? 'Failed to fetch reportees',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get all tasks (for manager)
  static Future<ApiResponse<List<Task>>> getAllTasks() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.tasksUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final tasks = (data as List<dynamic>)
            .map((json) => Task.fromJson(json))
            .toList();
        return ApiResponse(success: true, data: tasks);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch tasks',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get task details
  static Future<ApiResponse<Task>> getTaskDetails(int taskId) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.taskUrl(taskId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final task = Task.fromJson(data);
        return ApiResponse(success: true, data: task);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch task details',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Delete task
  static Future<ApiResponse<void>> deleteTask(int taskId) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.taskUrl(taskId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse(success: true, message: 'Task deleted successfully');
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to delete task',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Create task
  static Future<ApiResponse<Task>> createTask({
    required String title,
    required String description,
    required String deadline,
    required String priority,
    required String status,
    List<Map<String, dynamic>>? subtasks,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final body = {
        'title': title,
        'description': description,
        'deadline': deadline,
        'priority': priority,
        'status': status,
        if (subtasks != null && subtasks.isNotEmpty) 'subtasks': subtasks,
      };

      final response = await http.post(
        Uri.parse(ApiConfig.tasksUrl),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode(body),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final task = Task.fromJson(data);
        return ApiResponse(
          success: true,
          message: 'Task created successfully',
          data: task,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message:
              error['detail'] ?? error['message'] ?? 'Failed to create task',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Update task
  static Future<ApiResponse<Task>> updateTask({
    required int taskId,
    String? title,
    String? description,
    String? deadline,
    String? priority,
    String? status,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final body = <String, dynamic>{};
      if (title != null) body['title'] = title;
      if (description != null) body['description'] = description;
      if (deadline != null) body['deadline'] = deadline;
      if (priority != null) body['priority'] = priority;
      if (status != null) body['status'] = status;

      final response = await http.patch(
        Uri.parse(ApiConfig.taskUrl(taskId)),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final task = Task.fromJson(data);
        return ApiResponse(
          success: true,
          message: 'Task updated successfully',
          data: task,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message:
              error['detail'] ?? error['message'] ?? 'Failed to update task',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Assign task to employees
  static Future<ApiResponse<void>> assignTask({
    required int taskId,
    required String owner,
    required List<int> employees,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.taskAssignUrl(taskId)),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode({'owner': owner, 'employees': employees}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return ApiResponse(
          success: true,
          message: 'Task assigned successfully',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to assign task',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get leave requests (for manager)
  static Future<ApiResponse<List<LeaveRequest>>> getLeaveRequests() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.leaveRequestsUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final requests = (data as List<dynamic>)
            .map((json) => LeaveRequest.fromJson(json))
            .toList();
        return ApiResponse(success: true, data: requests);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch leave requests',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Approve leave request
  static Future<ApiResponse<void>> approveLeave(int leaveId) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.approveLeaveUrl(leaveId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        return ApiResponse(
          success: true,
          message: 'Leave approved successfully',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to approve leave',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Reject leave request
  static Future<ApiResponse<void>> rejectLeave(int leaveId) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.post(
        Uri.parse(ApiConfig.rejectLeaveUrl(leaveId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        return ApiResponse(
          success: true,
          message: 'Leave rejected successfully',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to reject leave',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Get employee references
  static Future<ApiResponse<List<EmployeeReference>>>
  getEmployeeReferences() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.get(
        Uri.parse(ApiConfig.employeeReferenceUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final references = (data as List<dynamic>)
            .map((json) => EmployeeReference.fromJson(json))
            .toList();
        return ApiResponse(success: true, data: references);
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to fetch references',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Create employee reference
  static Future<ApiResponse<EmployeeReference>> createEmployeeReference({
    required String name,
    required String designation,
    required String contactNumber,
    required String email,
    File? resume,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.employeeReferenceUrl),
      );

      request.headers.addAll({
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });

      request.fields['name'] = name;
      request.fields['designation'] = designation;
      request.fields['contact_number'] = contactNumber;
      request.fields['email'] = email;

      if (resume != null) {
        final file = await http.MultipartFile.fromPath('resume', resume.path);
        request.files.add(file);
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final reference = EmployeeReference.fromJson(data);
        return ApiResponse(
          success: true,
          message: 'Reference created successfully',
          data: reference,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message:
              error['detail'] ??
              error['message'] ??
              'Failed to create reference',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Update employee reference
  static Future<ApiResponse<EmployeeReference>> updateEmployeeReference({
    required int referenceId,
    String? name,
    String? designation,
    String? contactNumber,
    String? email,
    File? resume,
  }) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final request = http.MultipartRequest(
        'PATCH',
        Uri.parse(ApiConfig.employeeReferenceDetailUrl(referenceId)),
      );

      request.headers.addAll({
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });

      if (name != null) request.fields['name'] = name;
      if (designation != null) request.fields['designation'] = designation;
      if (contactNumber != null)
        request.fields['contact_number'] = contactNumber;
      if (email != null) request.fields['email'] = email;

      if (resume != null) {
        final file = await http.MultipartFile.fromPath('resume', resume.path);
        request.files.add(file);
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final reference = EmployeeReference.fromJson(data);
        return ApiResponse(
          success: true,
          message: 'Reference updated successfully',
          data: reference,
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message:
              error['detail'] ??
              error['message'] ??
              'Failed to update reference',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }

  // Delete employee reference
  static Future<ApiResponse<void>> deleteEmployeeReference(
    int referenceId,
  ) async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) {
        return ApiResponse(success: false, message: 'No access token found');
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.employeeReferenceDetailUrl(referenceId)),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse(
          success: true,
          message: 'Reference deleted successfully',
        );
      } else {
        final error = jsonDecode(response.body);
        return ApiResponse(
          success: false,
          message: error['detail'] ?? 'Failed to delete reference',
        );
      }
    } catch (e) {
      String errorMsg = 'Network error occurred';
      if (e.toString().contains('FormatException')) {
        errorMsg = 'Invalid response from server. Please try again.';
      } else if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        errorMsg = 'Connection error. Please check your internet connection.';
      } else {
        errorMsg = 'Error: ${e.toString()}';
      }

      return ApiResponse(success: false, message: errorMsg);
    }
  }
}
