import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../services/storage_service.dart';

class NotificationService {
  static Timer? _pollingTimer;

  // Badge counts
  static int notificationsCount = 0;
  static int myTasksCount = 0;
  static int learningCornerCount = 0;
  static int calendarCount = 0;
  static int leaveApplicationCount = 0;
  static int leaveRequestCount = 0;

  // Badge values (unread counts)
  static int notificationsBadge = 0;
  static int myTasksBadge = 0;
  static int learningCornerBadge = 0;
  static int calendarBadge = 0;
  static int leaveApplicationBadge = 0;
  static int leaveRequestBadge = 0;

  // Start polling for badge updates
  static void startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      _fetchAllBadges();
    });
    // Fetch immediately
    _fetchAllBadges();
  }

  // Stop polling
  static void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  // Fetch all badge counts (made public for FCM service)
  static Future<void> _fetchAllBadges() async {
    await Future.wait([
      _fetchNotificationsCount(),
      _fetchMyTasksCount(),
      _fetchLearningCornerCount(),
      _fetchCalendarCount(),
      _fetchLeaveApplicationCount(),
      _fetchLeaveRequestCount(),
    ]);
  }

  // Fetch notifications count
  static Future<void> _fetchNotificationsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      // Use all-notifications endpoint to get total count
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/employee/all-notifications/'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data is List ? data.length : (data['count'] ?? 0);
        notificationsCount = count as int;

        final lastSeen = await _getLastSeen('notifications_last_seen');
        notificationsBadge = notificationsCount > lastSeen
            ? notificationsCount - lastSeen
            : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch my tasks count
  static Future<void> _fetchMyTasksCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/employee/my-tasks/'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data is List ? data.length : (data['count'] ?? 0);
        myTasksCount = count as int;

        final lastSeen = await _getLastSeen('my_tasks_last_seen');
        myTasksBadge = myTasksCount > lastSeen ? myTasksCount - lastSeen : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch learning corner count
  static Future<void> _fetchLearningCornerCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/employee/emp-learning-corner/'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data is List ? data.length : 0;
        learningCornerCount = count;

        final lastSeen = await _getLastSeen('learning_corner_last_seen');
        learningCornerBadge = learningCornerCount > lastSeen
            ? learningCornerCount - lastSeen
            : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch calendar count
  static Future<void> _fetchCalendarCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/employee/employee-calendar/'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data is List ? data.length : 0;
        calendarCount = count;

        final lastSeen = await _getLastSeen('calendar_last_seen');
        calendarBadge = calendarCount > lastSeen ? calendarCount - lastSeen : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch leave application count
  static Future<void> _fetchLeaveApplicationCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/employee/emp-leaves/'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data is List ? data.length : 0;
        leaveApplicationCount = count;

        final lastSeen = await _getLastSeen('leave_application_last_seen');
        leaveApplicationBadge = leaveApplicationCount > lastSeen
            ? leaveApplicationCount - lastSeen
            : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch leave request count (for managers)
  static Future<void> _fetchLeaveRequestCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/employee/emp-leaves/'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data is List ? data.length : 0;
        leaveRequestCount = count;

        final lastSeen = await _getLastSeen('leave_request_last_seen');
        leaveRequestBadge = leaveRequestCount > lastSeen
            ? leaveRequestCount - lastSeen
            : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Get last seen count from SharedPreferences
  static Future<int> _getLastSeen(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(key) ?? 0;
  }

  // Update last seen count
  static Future<void> updateLastSeen(String itemName) async {
    final prefs = await SharedPreferences.getInstance();
    String key;
    int count;

    switch (itemName) {
      case 'notifications':
        key = 'notifications_last_seen';
        count = notificationsCount;
        break;
      case 'my_tasks':
        key = 'my_tasks_last_seen';
        count = myTasksCount;
        break;
      case 'learning_corner':
        key = 'learning_corner_last_seen';
        count = learningCornerCount;
        break;
      case 'calendar':
        key = 'calendar_last_seen';
        count = calendarCount;
        break;
      case 'leave_application':
        key = 'leave_application_last_seen';
        count = leaveApplicationCount;
        break;
      case 'leave_request':
        key = 'leave_request_last_seen';
        count = leaveRequestCount;
        break;
      default:
        return;
    }

    await prefs.setInt(key, count);

    // Update badge
    switch (itemName) {
      case 'notifications':
        notificationsBadge = 0;
        break;
      case 'my_tasks':
        myTasksBadge = 0;
        break;
      case 'learning_corner':
        learningCornerBadge = 0;
        break;
      case 'calendar':
        calendarBadge = 0;
        break;
      case 'leave_application':
        leaveApplicationBadge = 0;
        break;
      case 'leave_request':
        leaveRequestBadge = 0;
        break;
    }
  }
}
