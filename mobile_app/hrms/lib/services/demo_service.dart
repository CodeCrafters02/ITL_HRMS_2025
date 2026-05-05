import 'dart:async';
import '../models/dashboard_model.dart';
import '../models/profile_model.dart';
import '../models/payroll_model.dart';
import '../models/break_model.dart';
import '../models/overtime_model.dart';
import '../models/user_model.dart';

/// Service that provides complete dummy data for demo mode.
/// This allows reviewers to test the app without real backend credentials.
class DemoService {
  // Demo credentials
  static const String demoUsername = 'demo';
  static const String demoPassword = 'demo123';

  /// Complete demo employee profile
  static EmployeeProfile getDemoProfile() {
    return EmployeeProfile(
      employeeId: 'EMP001',
      firstName: 'Alex',
      lastName: 'Demo',
      middleName: '',
      gender: 'male',
      email: 'demo@innovyx.com',
      dateOfBirth: '1990-05-15',
      mobile: '+91 98765 43210',
      departmentName: 'Engineering',
      department: 'Engineering',
      designationName: 'Senior Developer',
      designation: 'Senior Developer',
      photo: 'https://i.pravatar.cc/150?img=11',
      temporaryAddress: '123 Demo Street, Bangalore',
      permanentAddress: '456 Sample Road, Karnataka, India',
      aadharNo: '1234 5678 9012',
      aadharCard: null,
      panNo: 'ABCDE1234F',
      panCard: null,
      guardianName: 'John Demo',
      guardianMobile: '+91 98765 43211',
      category: 'General',
      dateOfJoining: '2022-01-10',
      ctc: '12,50,000',
      grossSalary: '1,04,000',
      epfStatus: 'yes',
      uan: '101234567890',
      sourceOfEmployment: 'Direct',
      paymentMethod: 'Bank Transfer',
      accountNo: '50100123456789',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      esicStatus: 'yes',
      esicNo: 'ESIC1234567890',
    );
  }

  /// Complete demo dashboard data
  static DashboardData getDemoDashboardData() {
    return DashboardData(
      employeeName: 'Alex Demo',
      employeePhoto: 'https://i.pravatar.cc/150?img=11',
      checkinTime: '09:15 AM',
      checkoutTime: null,
      isLate: false,
      totalWorked: '4h 32m',
      effectiveTime: '4h 10m',
      totalBreakMinutes: 22,
      shiftName: 'General Shift',
      shiftTiming: '09:00 AM - 06:00 PM',
      serverTime: DateTime.now().toIso8601String(),
      attendanceScore: 95,
      todayWorkDuration: '4h 32m',
      totalWorkDurationWeek: '22h 15m',
      birthdayMessage: null,
      latestPayroll: PayrollData(
        amount: 87500.00,
        date: 'January 2024',
      ),
      overtime: null,
      activeBreak: null,
      recentBreaks: [
        BreakData(
          type: 'Short Break',
          startTime: '11:30 AM',
          endTime: '11:45 AM',
          durationMinutes: 15,
        ),
        BreakData(
          type: 'Meal Break',
          startTime: '01:00 PM',
          endTime: '01:22 PM',
          durationMinutes: 22,
        ),
      ],
    );
  }

  /// Demo login response
  static LoginResponse getDemoLoginResponse() {
    return LoginResponse(
      accessToken: 'demo_access_token_${DateTime.now().millisecondsSinceEpoch}',
      refreshToken: 'demo_refresh_token_${DateTime.now().millisecondsSinceEpoch}',
      role: 'employee',
      username: demoUsername,
      firstName: 'Alex',
      lastName: 'Demo',
    );
  }

  /// Simulate API delay for demo mode
  static Future<void> simulateDelay({int milliseconds = 800}) async {
    await Future.delayed(Duration(milliseconds: milliseconds));
  }

  /// Get demo announcements
  static List<Map<String, dynamic>> getDemoAnnouncements() {
    return [
      {
        'id': 1,
        'title': 'Welcome to Innovyx HRMS Demo',
        'content': 'This is a demo environment. Feel free to explore all features.',
        'created_at': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
        'is_pinned': true,
      },
      {
        'id': 2,
        'title': 'Team Meeting Update',
        'content': 'Weekly team meeting scheduled for Friday at 3 PM.',
        'created_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        'is_pinned': false,
      },
      {
        'id': 3,
        'title': 'New Leave Policy',
        'content': 'Updated leave policy is now in effect. Check the policies section.',
        'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
        'is_pinned': false,
      },
    ];
  }

  /// Get demo tasks
  static List<Map<String, dynamic>> getDemoTasks() {
    return [
      {
        'id': 1,
        'title': 'Complete project documentation',
        'description': 'Update the API documentation for the new features',
        'status': 'in_progress',
        'priority': 'high',
        'due_date': DateTime.now().add(const Duration(days: 3)).toIso8601String(),
      },
      {
        'id': 2,
        'title': 'Code review',
        'description': 'Review pull requests from team members',
        'status': 'pending',
        'priority': 'medium',
        'due_date': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      },
      {
        'id': 3,
        'title': 'Team standup preparation',
        'description': 'Prepare updates for tomorrow\'s standup meeting',
        'status': 'completed',
        'priority': 'low',
        'due_date': DateTime.now().toIso8601String(),
      },
    ];
  }

  /// Get demo leave balance
  static Map<String, dynamic> getDemoLeaveBalance() {
    return {
      'total_leaves': 24,
      'used_leaves': 8,
      'available_leaves': 16,
      'pending_leaves': 2,
      'leave_types': [
        {'type': 'Casual Leave', 'total': 12, 'used': 4, 'available': 8},
        {'type': 'Sick Leave', 'total': 8, 'used': 3, 'available': 5},
        {'type': 'Earned Leave', 'total': 4, 'used': 1, 'available': 3},
      ],
    };
  }

  /// Get demo attendance history
  static List<Map<String, dynamic>> getDemoAttendanceHistory() {
    final List<Map<String, dynamic>> history = [];
    final now = DateTime.now();

    for (int i = 0; i < 30; i++) {
      final date = now.subtract(Duration(days: i));
      final isWeekend = date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;

      if (!isWeekend && i > 2) {
        history.add({
          'date': date.toIso8601String(),
          'check_in': '09:0${i % 10} AM',
          'check_out': '06:${10 + i % 20} PM',
          'status': 'present',
          'work_duration': '${8 + i % 2}h ${10 + i % 30}m',
        });
      } else if (isWeekend) {
        history.add({
          'date': date.toIso8601String(),
          'check_in': null,
          'check_out': null,
          'status': 'weekend',
          'work_duration': null,
        });
      }
    }

    return history;
  }

  /// Get demo calendar events
  static List<Map<String, dynamic>> getDemoCalendarEvents() {
    final now = DateTime.now();
    return [
      {
        'id': 1,
        'title': 'New Year',
        'date': DateTime(now.year, 1, 1).toIso8601String(),
        'type': 'holiday',
        'is_holiday': true,
      },
      {
        'id': 2,
        'title': 'Republic Day',
        'date': DateTime(now.year, 1, 26).toIso8601String(),
        'type': 'holiday',
        'is_holiday': true,
      },
      {
        'id': 3,
        'title': 'Team Outing',
        'date': now.add(const Duration(days: 15)).toIso8601String(),
        'type': 'event',
        'is_holiday': false,
      },
      {
        'id': 4,
        'title': 'Project Deadline',
        'date': now.add(const Duration(days: 7)).toIso8601String(),
        'type': 'deadline',
        'is_holiday': false,
      },
    ];
  }

  /// Get demo break configurations
  static List<Map<String, dynamic>> getDemoBreakConfigs() {
    return [
      {
        'id': 1,
        'break_choice': 'short_break',
        'duration_minutes': 15,
        'enabled': true,
      },
      {
        'id': 2,
        'break_choice': 'meal_break',
        'duration_minutes': 30,
        'enabled': true,
      },
      {
        'id': 3,
        'break_choice': 'dont_disturb',
        'duration_minutes': null,
        'enabled': true,
      },
    ];
  }

  /// Get demo company info
  static Map<String, dynamic> getDemoCompanyInfo() {
    return {
      'id': 1,
      'name': 'Innovyx Technologies Demo',
      'logo': null,
      'address': '123 Demo Street, Bangalore',
      'contact': '+91 80 1234 5678',
      'email': 'demo@innovyx.com',
      'website': 'https://demo.innovyx.com',
    };
  }

  /// Get demo notifications
  static List<Map<String, dynamic>> getDemoNotifications() {
    return [
      {
        'id': 1,
        'title': 'Welcome to Demo',
        'message': 'You are viewing the demo version of Innovyx HRMS.',
        'type': 'info',
        'is_read': false,
        'created_at': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
      },
      {
        'id': 2,
        'title': 'New Task Assigned',
        'message': 'You have been assigned a new demo task.',
        'type': 'task',
        'is_read': false,
        'created_at': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
      },
    ];
  }

  /// Get demo task summary
  static Map<String, int> getDemoTaskSummary() {
    return {
      'pending': 5,
      'in_progress': 3,
      'completed': 12,
      'total': 20,
    };
  }

  /// Get demo leave types
  static List<Map<String, dynamic>> getDemoLeaveTypes() {
    return [
      {'id': 1, 'name': 'Casual Leave', 'max_days': 12},
      {'id': 2, 'name': 'Sick Leave', 'max_days': 8},
      {'id': 3, 'name': 'Earned Leave', 'max_days': 4},
      {'id': 4, 'name': 'Work From Home', 'max_days': 5},
    ];
  }

  /// Get demo applied leaves
  static List<Map<String, dynamic>> getDemoAppliedLeaves() {
    return [
      {
        'id': 1,
        'leave_type': 'Casual Leave',
        'from_date': DateTime.now().subtract(const Duration(days: 5)).toIso8601String().split('T')[0],
        'to_date': DateTime.now().subtract(const Duration(days: 4)).toIso8601String().split('T')[0],
        'days': 2,
        'reason': 'Family function',
        'status': 'approved',
      },
      {
        'id': 2,
        'leave_type': 'Sick Leave',
        'from_date': DateTime.now().subtract(const Duration(days: 15)).toIso8601String().split('T')[0],
        'to_date': DateTime.now().subtract(const Duration(days: 14)).toIso8601String().split('T')[0],
        'days': 1,
        'reason': 'Not feeling well',
        'status': 'approved',
      },
    ];
  }

  /// Get demo company policies
  static List<Map<String, dynamic>> getDemoCompanyPolicies() {
    return [
      {
        'id': 1,
        'title': 'Leave Policy 2024',
        'description': 'Complete leave policy including casual, sick, and earned leave.',
        'document_url': null,
        'updated_at': '2024-01-01',
      },
      {
        'id': 2,
        'title': 'Code of Conduct',
        'description': 'Company ethics and professional behavior guidelines.',
        'document_url': null,
        'updated_at': '2024-01-15',
      },
    ];
  }
}
