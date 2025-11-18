# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
Firebase Cloud Messaging has been integrated into the Flutter app to enable system-level push notifications, matching the React implementation.

## Implementation Status
✅ All code implementation is complete. The following steps require manual configuration:

## Required Manual Steps

### 1. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project: `hrms-de74c` (same as React app)
3. Add Android app:
   - Package name: `com.example.hrms`
   - Download `google-services.json`
   - Place it in: `android/app/google-services.json`
4. Add iOS app:
   - Bundle ID: (check your iOS project settings)
   - Download `GoogleService-Info.plist`
   - Place it in: `ios/Runner/GoogleService-Info.plist`

### 2. Android Configuration
- ✅ Google Services plugin added to `android/build.gradle.kts`
- ✅ Google Services plugin applied in `android/app/build.gradle.kts`
- ✅ Notification permissions added to `AndroidManifest.xml`
- ⚠️ **Required**: Add `google-services.json` to `android/app/` directory

### 3. iOS Configuration
- ✅ Background modes added to `Info.plist`
- ⚠️ **Required**: Add `GoogleService-Info.plist` to `ios/Runner/` directory
- ⚠️ **Required**: Enable Push Notifications capability in Xcode:
  1. Open `ios/Runner.xcworkspace` in Xcode
  2. Select Runner target
  3. Go to Signing & Capabilities
  4. Click "+ Capability"
  5. Add "Push Notifications"
  6. Add "Background Modes" and enable "Remote notifications"

### 4. Install Dependencies
Run the following command to install the new packages:
```bash
flutter pub get
```

### 5. Platform-Specific Build
After adding the configuration files:
- **Android**: Run `flutter build apk` or `flutter run`
- **iOS**: Run `pod install` in `ios/` directory, then build from Xcode

## Features Implemented

### 1. FCM Service (`lib/services/fcm_service.dart`)
- ✅ Firebase initialization
- ✅ Notification permission request
- ✅ FCM token retrieval and registration
- ✅ Token refresh handling
- ✅ Foreground message handling
- ✅ Background message handler
- ✅ Local notification display
- ✅ Notification tap handling

### 2. Integration Points
- ✅ `main.dart`: Firebase initialization and background handler registration
- ✅ `employee_layout.dart`: FCM initialization after authentication
- ✅ `auth_service.dart`: FCM token cleanup on logout
- ✅ `api_config.dart`: Device token endpoint configuration
- ✅ `notification_service.dart`: Badge count updates on notification arrival

### 3. Platform Configuration
- ✅ Android: Permissions, notification channel, Google Services plugin
- ✅ iOS: Background modes, notification permissions

## Testing

### Test Foreground Notifications
1. Open the app
2. Send a test notification from Firebase Console
3. Verify notification appears as local notification

### Test Background Notifications
1. Put app in background
2. Send a test notification
3. Verify system notification appears

### Test Notification Taps
1. Tap on a notification
2. Verify app opens and navigates correctly

### Test Token Registration
1. Check backend logs for token registration
2. Verify token is saved in database

## API Endpoint
- **Device Token Registration**: `POST /notifications/devices/`
- **Request Body**: `{"token": "fcm_token"}`
- **Headers**: `Authorization: Bearer <access_token>`

## Notes
- The FCM token is automatically registered when user logs in
- Token is refreshed automatically when it changes
- Token is cleared on logout
- Badge counts are updated when notifications arrive
- The same Firebase project is used as the React app for consistency

