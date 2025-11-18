# Debugging FCM Notifications for Leave Requests

## Important: Notification Recipient

**When an employee applies for leave:**
- ✅ Notification is sent to the **REPORTING MANAGER** (not the employee)
- ❌ The employee who applied will NOT receive a notification

## How to Test Leave Request Notifications

### Step 1: Verify User Roles
1. **Employee Account**: Apply for leave (from React or Flutter)
2. **Manager Account**: Must be logged into the mobile app to receive notification

### Step 2: Check FCM Token Registration
The reporting manager's FCM token must be registered in the backend:

1. **Check Backend Database:**
   ```sql
   SELECT * FROM notifications_userdevice WHERE user_id = [MANAGER_USER_ID];
   ```
   - Should show the manager's FCM token
   - Token should match the one shown in mobile app logs

2. **Verify Token Registration:**
   - Manager must be logged into mobile app
   - Check logs for: `"FCM token registered successfully"`
   - Token should be saved in backend `UserDevice` table

### Step 3: Check Backend Logs
When leave is applied, check backend logs for:
```
Failed to send FCM notification for leave request: [error]
```
or
```
Failed to send FCM push to user [user_id]: [error]
```

### Step 4: Verify Backend FCM Configuration
Check `backend/innovyx_hrms/settings.py`:
- `FCM_CREDENTIALS_FILE` - Path to Firebase service account JSON
- `FCM_PROJECT_ID` - Firebase project ID

### Step 5: Test Flow
1. **Login as Manager** in mobile app
2. **Apply leave as Employee** (from React app or another account)
3. **Manager should receive notification** in mobile app

## Common Issues

### Issue 1: No Notification Received
**Possible Causes:**
- Manager's FCM token not registered in backend
- Backend FCM credentials not configured
- Manager not logged into mobile app
- Wrong user_id in backend (token registered to different user)

**Solution:**
- Logout and login again as manager in mobile app
- Check backend `UserDevice` table
- Verify backend FCM configuration

### Issue 2: Notification Sent But Not Received
**Possible Causes:**
- FCM token expired or invalid
- Network issues
- App not running or in background

**Solution:**
- Check mobile app logs for: `=== FCM Message Received ===`
- Verify internet connection
- Try sending test notification from Firebase Console

### Issue 3: Backend Error Sending Notification
**Possible Causes:**
- FCM credentials file missing or invalid
- Firebase project ID incorrect
- Service account permissions insufficient

**Solution:**
- Check backend logs for FCM errors
- Verify `firebase-service-account.json` exists and is valid
- Check Firebase project settings

## Testing Checklist

- [ ] Manager is logged into mobile app
- [ ] FCM token is registered (check logs: "FCM token registered successfully")
- [ ] Token exists in backend `UserDevice` table for manager's user_id
- [ ] Employee has a reporting manager assigned
- [ ] Backend FCM credentials are configured
- [ ] Backend logs show no FCM errors
- [ ] Mobile app logs show message received (if app is open)

## Expected Behavior

**When employee applies leave:**
1. Backend signal `leave_created_notify_manager` triggers
2. Backend looks up manager's FCM token from `UserDevice` table
3. Backend sends FCM notification to manager's device
4. Manager receives notification in mobile app (if logged in)
5. Tapping notification opens Leave Request page

**If manager is not logged into mobile app:**
- Notification will be queued by FCM
- Manager will receive it when they open the app next time
- Check `getInitialMessage()` in FCM service

