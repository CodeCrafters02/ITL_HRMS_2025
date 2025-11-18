# App Logo Setup Guide

## Overview
This guide will help you add a custom logo/icon for the HRMS mobile app on both Android and iOS platforms.

## Method 1: Using flutter_launcher_icons (Recommended)

### Step 1: Add the package
The `flutter_launcher_icons` package has been added to `pubspec.yaml`. Run:
```bash
flutter pub get
```

### Step 2: Prepare your logo
1. Create a square logo image (recommended: 1024x1024 pixels)
2. Save it as `assets/logo/app_logo.png`
3. The image should:
   - Be square (1:1 aspect ratio)
   - Have a transparent background (PNG format)
   - Be high resolution (at least 1024x1024px)
   - Have the logo centered with some padding

### Step 3: Generate icons
Run the following command to generate all required icon sizes:
```bash
flutter pub run flutter_launcher_icons
```

This will automatically:
- Generate Android launcher icons in all required sizes
- Generate iOS app icons in all required sizes
- Update the necessary configuration files

### Step 4: Rebuild the app
After generating icons, rebuild your app:
```bash
flutter clean
flutter pub get
flutter run
```

## Method 2: Manual Replacement (Alternative)

If you prefer to manually replace icons:

### Android Icons
Replace the following files in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` (48x48px)
- `mipmap-hdpi/ic_launcher.png` (72x72px)
- `mipmap-xhdpi/ic_launcher.png` (96x96px)
- `mipmap-xxhdpi/ic_launcher.png` (144x144px)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192px)

### iOS Icons
Replace icons in `ios/Runner/Assets.xcassets/AppIcon.appiconset/`:
- Various sizes from 20x20 to 1024x1024

## Current Configuration

The app is configured to use:
- **Android**: `@mipmap/ic_launcher` (default Flutter icon)
- **iOS**: Default Flutter icon
- **App Name**: "hrms" (can be changed in AndroidManifest.xml and Info.plist)

## Changing App Display Name

### Android
Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<application
    android:label="HRMS"  <!-- Change this -->
    ...
```

### iOS
Edit `ios/Runner/Info.plist`:
```xml
<key>CFBundleDisplayName</key>
<string>HRMS</string>  <!-- Change this -->
```

## Notes

- After changing icons, you may need to uninstall and reinstall the app to see the new icon
- For production builds, ensure all icon sizes are properly generated
- The logo should be recognizable at small sizes (app icon is typically 48-192px on Android)

