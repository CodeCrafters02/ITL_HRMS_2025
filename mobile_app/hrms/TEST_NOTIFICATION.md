# How to Send Test FCM Notifications

## Method 1: Firebase Console (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `hrms-54ea8`
3. Navigate to: **Cloud Messaging** → **Send your first message**
4. Enter notification title and text
5. Select **"Single device"** as target
6. Paste your FCM token
7. Click **"Test"**

## Method 2: Using curl (Command Line)

### Get Server Key:
1. Firebase Console → Project Settings → Cloud Messaging
2. Copy the **Server Key** (legacy) or use **Service Account** for v1 API

### Send using Legacy API:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test notification"
    },
    "data": {
      "type": "test",
      "message": "Hello from FCM!"
    }
  }'
```

### Send using v1 API (Recommended):
```bash
# First, get an access token (requires service account JSON)
# Then use:
curl -X POST https://fcm.googleapis.com/v1/projects/hrms-54ea8/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "YOUR_FCM_TOKEN",
      "notification": {
        "title": "Test Notification",
        "body": "This is a test notification"
      },
      "data": {
        "type": "test"
      }
    }
  }'
```

## Method 3: Using Your Backend API

If your backend has a notification endpoint, you can send through it:

```bash
curl -X POST http://192.168.0.3:8000/notifications/send/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_FCM_TOKEN",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## Method 4: Using Postman

1. Create a new POST request
2. URL: `https://fcm.googleapis.com/fcm/send`
3. Headers:
   - `Authorization: key=YOUR_SERVER_KEY`
   - `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "to": "YOUR_FCM_TOKEN",
  "notification": {
    "title": "Test Notification",
    "body": "This is a test notification"
  },
  "data": {
    "type": "test"
  }
}
```

## Your Current FCM Token
```
fd1XlKctSauXb2N1WYxos9:APA91bH4cIGk3Upsxglk7FT0IkcddU_aKHG2W2qbo35ern5pn72nqw90yBLCYmv-JvG-qTImgXB8fQ_ixA7-Lf_oys2zTpMcqQWNzyCpyw6L_d-VnYo-0C4
```

## Testing Scenarios

### 1. Foreground Notification (App Open)
- Keep app open
- Send notification
- Should appear as local notification in app

### 2. Background Notification (App Minimized)
- Minimize app (don't close)
- Send notification
- Should appear in system notification tray

### 3. Terminated Notification (App Closed)
- Close app completely
- Send notification
- Should appear in system notification tray
- Tapping should open app

## Expected Behavior

✅ **Success Indicators:**
- Notification appears on device
- Console shows: "Received foreground message: [id]"
- Badge counts update (if applicable)
- App navigates correctly when notification is tapped

❌ **If notification doesn't appear:**
- Check device internet connection
- Verify FCM token is correct
- Check notification permissions are granted
- Verify Firebase project configuration
- Check console for error messages

