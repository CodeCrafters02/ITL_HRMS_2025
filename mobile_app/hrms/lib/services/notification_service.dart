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
  static int payslipsCount = 0;
  static int assetRequestsCount = 0;
  static int loanApplicationsCount = 0;
  static int wfhRequestsCount = 0;
  static int reimbursementsCount = 0;

  // Badge values (unread counts)
  static int notificationsBadge = 0;
  static int myTasksBadge = 0;
  static int learningCornerBadge = 0;
  static int calendarBadge = 0;
  static int leaveApplicationBadge = 0;
  static int leaveRequestBadge = 0;
  static int payslipsBadge = 0;
  static int assetRequestsBadge = 0;
  static int loanApplicationsBadge = 0;
  static int wfhRequestsBadge = 0;
  static int reimbursementsBadge = 0;

  // Start polling for badge updates
  static void startPolling() {
    _pollingTimer?.cancel();
    // Reduced from 1 minute to 5 minutes to reduce battery and data usage
    _pollingTimer = Timer.periodic(const Duration(minutes: 5), (_) {
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

  // Public method for on-demand refresh (e.g. dashboard page)
  static Future<void> refreshBadges() => _fetchAllBadges();

  // Fetch all badge counts (made public for FCM service)
  static Future<void> _fetchAllBadges() async {
    await Future.wait([
      _fetchNotificationsCount(),
      _fetchMyTasksCount(),
      _fetchLearningCornerCount(),
      _fetchCalendarCount(),
      _fetchLeaveApplicationCount(),
      _fetchLeaveRequestCount(),
      _fetchPayslipsCount(),
      _fetchAssetRequestsCount(),
      _fetchLoanApplicationsCount(),
      _fetchWFHRequestsCount(),
      _fetchReimbursementsCount(),
    ]);
  }

  // Fetch notifications count
  static Future<void> _fetchNotificationsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      // Use all-notifications endpoint to get total count
      final response = await http.get(
        Uri.parse(ApiConfig.allNotificationsUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        notificationsCount = count;

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
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.tasksEndpoint}'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        myTasksCount = count;

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
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.learningCornerEndpoint}'),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
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
        Uri.parse(ApiConfig.employeeCalendarBaseUrl),
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

  // Fetch leave application count (pending only)
  static Future<void> _fetchLeaveApplicationCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.empLeavesEndpoint}')
          .replace(queryParameters: {'status': 'Pending'});
      final response = await http.get(uri, headers: ApiConfig.getAuthHeaders(token));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        leaveApplicationCount = count;
        leaveApplicationBadge = count;
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
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.leaveRequestsEndpoint}'),
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

  // Fetch payslips count
  static Future<void> _fetchPayslipsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse(ApiConfig.payslipsUrl()),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        payslipsCount = count;

        final lastSeen = await _getLastSeen('payslips_last_seen');
        payslipsBadge = payslipsCount > lastSeen ? payslipsCount - lastSeen : 0;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch asset requests count (pending only)
  static Future<void> _fetchAssetRequestsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;

      final uri = Uri.parse(ApiConfig.assetRequestsUrl)
          .replace(queryParameters: {'approval_status': 'pending'});
      final response = await http.get(uri, headers: ApiConfig.getAuthHeaders(token));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        assetRequestsCount = count;
        assetRequestsBadge = count;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch loan applications count (own pending only)
  static Future<void> _fetchLoanApplicationsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.loanApplicationsEndpoint}')
          .replace(queryParameters: {'mine': 'true', 'status': 'PENDING'});
      final response = await http.get(uri, headers: ApiConfig.getAuthHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        loanApplicationsCount = count;
        loanApplicationsBadge = count;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch WFH requests count (own pending only)
  static Future<void> _fetchWFHRequestsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.wfhRequestsEndpoint}')
          .replace(queryParameters: {'mine': 'true', 'status': 'pending'});
      final response = await http.get(uri, headers: ApiConfig.getAuthHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        wfhRequestsCount = count;
        wfhRequestsBadge = count;
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Fetch reimbursements count (own pending only)
  static Future<void> _fetchReimbursementsCount() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return;
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.reimbursementRequestsEndpoint}')
          .replace(queryParameters: {'mine': 'true', 'status': 'pending'});
      final response = await http.get(uri, headers: ApiConfig.getAuthHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        int count = 0;
        if (data is List) {
          count = data.length;
        } else if (data is Map) {
          count = (data['count'] ?? data['results']?.length ?? 0) as int;
        }
        reimbursementsCount = count;
        reimbursementsBadge = count;
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
      case 'payslips':
        key = 'payslips_last_seen';
        count = payslipsCount;
        break;
      case 'asset_requests':
        key = 'asset_requests_last_seen';
        count = assetRequestsCount;
        break;
      case 'loan_applications':
        key = 'loan_applications_last_seen';
        count = loanApplicationsCount;
        break;
      case 'wfh_requests':
        key = 'wfh_requests_last_seen';
        count = wfhRequestsCount;
        break;
      case 'reimbursements':
        key = 'reimbursements_last_seen';
        count = reimbursementsCount;
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
      case 'payslips':
        payslipsBadge = 0;
        break;
      case 'asset_requests':
        assetRequestsBadge = 0;
        break;
      case 'loan_applications':
        loanApplicationsBadge = 0;
        break;
      case 'wfh_requests':
        wfhRequestsBadge = 0;
        break;
      case 'reimbursements':
        reimbursementsBadge = 0;
        break;
    }
  }
}
