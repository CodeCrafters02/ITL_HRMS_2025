# HRMS Mobile App - API Integration

## Overview
This Flutter mobile app is now connected to the Django backend HRMS system with full authentication support.

## Features Implemented

### 1. Authentication
- **Login**: Users can sign in with username and password
- **Sign Up**: New users can register with username, email, and password
- **Token Management**: JWT tokens are stored securely using SharedPreferences
- **Navigation**: Seamless navigation between login and signup pages

### 2. Backend Integration
- Base URL: `https://apihrms.innovyxtechlabs.com`
- Login Endpoint: `/app/login/`
- Register Endpoint: `/app/master-register/`
- Token Refresh: `/api/token/refresh/`

## Project Structure

```
lib/
├── config/
│   └── api_config.dart          # API configuration and endpoints
├── models/
│   └── user_model.dart          # User data models
├── services/
│   ├── auth_service.dart        # Authentication API calls
│   └── storage_service.dart     # Local storage for tokens
└── main.dart                     # Main app with login/signup pages
```

## Key Files

### api_config.dart
Contains all API endpoints and base URL configuration. Update the `baseUrl` for local development:
- Production: `https://apihrms.innovyxtechlabs.com`
- Local: `http://localhost:8000`
- Android Emulator: `http://10.0.2.2:8000`

### auth_service.dart
Handles all authentication operations:
- `login()`: Authenticate user and store tokens
- `register()`: Create new user account
- `logout()`: Clear stored tokens
- `refreshToken()`: Refresh expired access token

### storage_service.dart
Manages local storage of authentication data:
- Access token
- Refresh token
- User role
- Username

## API Response Handling

### Login Response
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "role": "master"
}
```

### Register Response
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "role": "master"
}
```

## Error Handling
The app handles various error scenarios:
- Network errors
- Invalid credentials
- Duplicate email/username
- Validation errors
- Server errors

## Loading States
Both login and signup pages show loading indicators during API calls to improve UX.

## Dependencies
- `http: ^1.2.0` - HTTP client for API calls
- `shared_preferences: ^2.2.2` - Local storage for tokens

## Setup Instructions

1. Install dependencies:
   ```bash
   flutter pub get
   ```

2. Update API base URL in `lib/config/api_config.dart` if needed

3. Run the app:
   ```bash
   flutter run
   ```

## Testing

### Test Credentials (if you have test accounts)
You can test with your backend test accounts.

### Creating New Account
1. Navigate to Sign Up page
2. Enter username, email, and password
3. Password must be at least 6 characters
4. On success, you'll be redirected to login

### Logging In
1. Enter your username and password
2. On successful login, JWT tokens are stored
3. Role-based access is supported (master, admin, employee)

## Next Steps

To complete the app, consider implementing:
1. Home screen after successful login
2. Role-based routing (different screens for master/admin/employee)
3. Profile management
4. Auto-logout on token expiration
5. Remember me functionality
6. Forgot password flow

## Backend Compatibility
This app is compatible with the Django REST backend at:
- Backend codebase: `backend/` folder
- Uses Django REST Framework with JWT authentication
- Supports roles: master, admin, employee
