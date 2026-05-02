import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class BreakNotificationService {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static const int _warningId = 9001;
  static const int _overdueId = 9002;

  static Timer? _warningTimer;
  static Timer? _overdueTimer;

  static Future<void> _ensureInitialized() async {
    if (_initialized) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    _initialized = true;
  }

  static Future<void> _show(int id, String title, String body) async {
    await _ensureInitialized();
    const androidDetails = AndroidNotificationDetails(
      'hrms_breaks',
      'Break Reminders',
      channelDescription: 'Reminders for break time',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentSound: true,
    );
    await _plugin.show(
      id,
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  }

  /// Schedule break-end warning and overdue notifications.
  /// [breakDurationMinutes] — total allowed break duration.
  /// [warningMinutesBefore] — how many minutes before end to warn (default 2).
  static void scheduleBreakEnd({
    required int breakDurationMinutes,
    String breakName = 'Break',
    int warningMinutesBefore = 2,
  }) {
    cancel();

    final totalSeconds = breakDurationMinutes * 60;
    final warningSeconds = (breakDurationMinutes - warningMinutesBefore) * 60;

    if (warningSeconds > 0) {
      _warningTimer = Timer(Duration(seconds: warningSeconds), () {
        _show(
          _warningId,
          '⏰ $breakName ending soon',
          '$breakName ends in $warningMinutesBefore minutes. Please wrap up.',
        );
      });
    }

    _overdueTimer = Timer(Duration(seconds: totalSeconds), () {
      _show(
        _overdueId,
        '🔔 $breakName time is over',
        'Your $breakName has ended. Time to get back to work!',
      );
    });
  }

  /// Cancel all scheduled break notifications.
  static void cancel() {
    _warningTimer?.cancel();
    _overdueTimer?.cancel();
    _warningTimer = null;
    _overdueTimer = null;
    _plugin.cancel(_warningId);
    _plugin.cancel(_overdueId);
  }
}
