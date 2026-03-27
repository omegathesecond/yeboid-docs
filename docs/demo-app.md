# Demo App

A fully functional demo app showcasing all YeboID Flutter SDK widgets.

<div class="tip custom-block" style="padding: 16px; background: linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05)); border-left: 4px solid #D4AF37; border-radius: 8px; margin: 24px 0;">
  <p style="margin: 0; font-weight: 600; color: #D4AF37;">📱 Download APK</p>
  <p style="margin: 8px 0 16px 0;">Try the demo on your Android device</p>
  <a href="https://cdn.yeboid.com/downloads/yeboid-demo-v1.0.apk" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #D4AF37, #B8962E); color: #0A0A0F; text-decoration: none; border-radius: 8px; font-weight: 600;">Download APK (46 MB)</a>
</div>

## Source Code

The full source code is available on GitHub:

**[github.com/omegathesecond/yeboid-demo](https://github.com/omegathesecond/yeboid-demo)**

## Features

The demo app includes all YeboID widgets:

### Login Screen
- `YeboIDLoginButton` with all 3 styles (filled, outlined, text)
- Real OAuth2 authentication flow

### Home Screen  
- `YeboIDAvatar` in the app bar
- Welcome message with user's name

### Profile Screen
- `YeboIDProfileCard` with full user info
- `YeboIDVerifyButton` for KYC verification
- KYC status display

### Settings Screen
- Logout functionality
- Theme toggle (dark/light)
- App version info

## Screenshots

| Login | Home | Profile |
|-------|------|---------|
| Login button styles | Avatar & greeting | Profile card |

## Running Locally

```bash
# Clone the repo
git clone https://github.com/omegathesecond/yeboid-demo.git
cd yeboid-demo

# Install dependencies
flutter pub get

# Run on device/emulator
flutter run
```

## Building APK

```bash
flutter build apk --release
```

The APK will be at `build/app/outputs/flutter-apk/app-release.apk`

## Configuration

The demo app uses these settings:

```dart
YeboIDConfig(
  clientId: 'yeboid-demo',
  redirectUri: 'yeboid-demo://auth',
)
```

This is a first-party app registered with YeboID, so it skips the consent screen.

## Code Structure

```
lib/
├── main.dart              # App entry, YeboIDProvider setup
├── theme/
│   └── app_theme.dart     # Midnight Gold theme
└── screens/
    ├── login_screen.dart   # Login with all button styles
    ├── home_screen.dart    # Home with avatar
    ├── profile_screen.dart # Profile card & verify
    └── settings_screen.dart # Logout & settings
```

## Learn More

- [Flutter SDK Documentation](/flutter-sdk/)
- [Widget Reference](/widgets/login-button)
- [Getting Started Guide](/getting-started)
