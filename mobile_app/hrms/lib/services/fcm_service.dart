import 'dart:async';
import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import '../firebase_options.dart';
import '../config/api_config.dart';
import '../services/storage_service.dart';
import '../services/notification_service.dart';

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  // Update badge counts when notification arrives
  // Note: This is called from background, so we trigger a refresh
  // The actual badge update will happen when app comes to foreground
}

class FCMService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static bool _initialized = false;
  static String? _currentToken;

  // Initialize FCM service
  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Initialize local notifications for Android
      const androidSettings = AndroidInitializationSettings(
        '@mipmap/ic_launcher',
      );
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      // Create notification channel for Android
      await _createNotificationChannel();

      // Request notification permissions
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      print('FCM DEBUG: Authorization Status: ${settings.authorizationStatus}');

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        // Get FCM token
        await _getToken();

        // Listen for token refresh
        _messaging.onTokenRefresh.listen((newToken) {
          _currentToken = newToken;
          _registerTokenWithBackend(newToken);
        });

        // Handle foreground messages
        FirebaseMessaging.onMessage.listen((message) {
          _handleForegroundMessage(message);
          // Update badge counts when notification arrives
          NotificationService.startPolling();
        });

        // Handle notification taps when app is in background
        FirebaseMessaging.onMessageOpenedApp.listen((message) {
          _handleNotificationTap(message);
        });

        // Check if app was opened from a notification
        final initialMessage = await _messaging.getInitialMessage();
        if (initialMessage != null) {
          _handleNotificationTap(initialMessage);
        }
      }

      _initialized = true;
    } catch (e) {
      // Error initializing FCM
    }
  }

  // Create notification channel for Android
  static Future<void> _createNotificationChannel() async {
    const androidChannel = AndroidNotificationChannel(
      'hrms_notifications',
      'HRMS Notifications',
      description: 'Notifications for HRMS app',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(androidChannel);
  }

  // Get FCM token
  static Future<String?> _getToken() async {
    try {
      // For iOS, check APNS token first
      final apnsToken = await _messaging.getAPNSToken();
      print('FCM DEBUG: APNS Token: $apnsToken');
      
      final token = await _messaging.getToken();
      _currentToken = token;
      print('FCM DEBUG: FCM Token: $token');
      
      if (token != null) {
        await _registerTokenWithBackend(token);
      }
      return token;
    } catch (e) {
      print('FCM DEBUG: Error getting token: $e');
      return null;
    }
  }
  
  // Get FCM token (public method for debugging)
  static Future<String?> getToken() async {
    try {
      final apnsToken = await _messaging.getAPNSToken();
      print('FCM DEBUG: APNS Token: $apnsToken');

      final token = await _messaging.getToken();
      _currentToken = token;
      print('FCM DEBUG: FCM Token: $token');

      if (token != null) {
        await _registerTokenWithBackend(token);
      }
      return token;
    } catch (e) {
      print('FCM DEBUG: Error getting token: $e');
      return null;
    }
  }

  // Register token with backend
  static Future<void> _registerTokenWithBackend(String token) async {
    try {
      final accessToken = await StorageService.getAccessToken();
      if (accessToken == null) {
        return;
      }

      await http.post(
        Uri.parse(ApiConfig.deviceTokenUrl),
        headers: ApiConfig.getAuthHeaders(accessToken),
        body: jsonEncode({'token': token}),
      );

      // Token registration response handled silently
    } catch (e) {
      // Error registering token
    }
  }

  // Handle foreground messages
  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    // Badge counts will be updated via polling

    // Extract title and body
    // Backend sends data-only messages, so check both notification and data fields
    String title = 'Notification';
    String body = '';

    if (message.notification != null) {
      // Has notification payload
      title = message.notification!.title ?? title;
      body = message.notification!.body ?? body;
    } else if (message.data.isNotEmpty) {
      // Data-only message (backend sends this way)
      title = message.data['title']?.toString() ?? title;
      body = message.data['body']?.toString() ?? body;
    }
    
    if (title.isNotEmpty || body.isNotEmpty) {
      // When app is in foreground, show in-app notification (not in system tray)
      // The notification will appear as a banner/dialog inside the app
      // For background/terminated, FCM automatically shows in system tray
      await _showLocalNotification(title, body, message.data);
    }
  }

  // Show local notification
  static Future<void> _showLocalNotification(
    String title,
    String body,
    Map<String, dynamic> data,
  ) async {
    const androidDetails = AndroidNotificationDetails(
      'hrms_notifications',
      'HRMS Notifications',
      channelDescription: 'Notifications for HRMS app',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      details,
      payload: jsonEncode(data),
    );
  }

  // Handle notification tap
  static void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;

    // Store notification data for navigation
    _pendingNotificationData = data;

    // Trigger navigation if app is running
    _navigateFromNotification(data);
  }

  // Navigate based on notification type
  static void _navigateFromNotification(Map<String, dynamic> data) {
    // Navigation will be handled by the app when it checks pending notifications
    // This is stored for EmployeeLayout to process
  }

  // Handle notification tap from local notifications
  static void _onNotificationTapped(NotificationResponse response) {
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!);
        _pendingNotificationData = data;
      } catch (e) {
        // Error parsing notification payload
      }
    }
  }

  // Get pending notification data (for navigation)
  static Map<String, dynamic>? _pendingNotificationData;
  static Map<String, dynamic>? getPendingNotificationData() {
    final data = _pendingNotificationData;
    _pendingNotificationData = null;
    return data;
  }

  // Get current FCM token
  static String? getCurrentToken() => _currentToken;

  // Clear token on logout
  static Future<void> clearToken() async {
    try {
      _currentToken = null;
      await _messaging.deleteToken();
    } catch (e) {
      // Error clearing FCM token
    }
  }
}
