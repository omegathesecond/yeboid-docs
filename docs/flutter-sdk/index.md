# Flutter SDK

The YeboID Flutter SDK provides beautiful, pre-styled widgets for authentication with the Midnight Gold theme. Add "Login with Yebo" to your app in minutes.

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  yeboid_flutter: ^1.0.0
```

Run:

```bash
flutter pub get
```

## Quick Start

### 1. Wrap Your App

```dart
import 'package:yeboid_flutter/yeboid_flutter.dart';

void main() {
  runApp(
    YeboIDProvider(
      config: YeboIDConfig(
        clientId: 'your-client-id',
        redirectUri: 'yourapp://auth',
      ),
      child: MaterialApp(
        home: LoginScreen(),
      ),
    ),
  );
}
```

### 2. Add Login Button

```dart
class LoginScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: YeboIDLoginButton(
          onSuccess: (user) {
            Navigator.pushReplacementNamed(context, '/home');
          },
          onError: (error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(error)),
            );
          },
        ),
      ),
    );
  }
}
```

### 3. Show User Info

```dart
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          YeboIDProfileCard(
            onLogout: () {
              Navigator.pushReplacementNamed(context, '/login');
            },
          ),
        ],
      ),
    );
  }
}
```

## Available Widgets

| Widget | Description |
|--------|-------------|
| [YeboIDProvider](/flutter-sdk/provider) | Provider widget that wraps your app |
| [YeboIDLoginButton](/flutter-sdk/login-button) | Pre-styled "Login with Yebo" button |
| [YeboIDAvatar](/flutter-sdk/avatar) | User avatar with KYC badge |
| [YeboIDProfileCard](/flutter-sdk/profile-card) | Complete profile card |
| [YeboIDVerifyButton](/flutter-sdk/verify-button) | KYC verification button |

## Theme Colors

The SDK uses the **Midnight Gold** color palette:

| Color | Hex | Usage |
|-------|-----|-------|
| Gold Primary | `#D4AF37` | Primary accent, buttons |
| Gold Light | `#F5E6A3` | Hover states, highlights |
| Gold Dark | `#B8962E` | Gradients, pressed states |
| Dark BG | `#0A0A0F` | Background |
| Dark Surface | `#1A1A2E` | Cards, elevated surfaces |
| Verified Green | `#10B981` | KYC verified badge |

## Context Extensions

The SDK provides convenient context extensions:

```dart
// Get the YeboID client
final client = context.yeboId;

// Get the current user (null if not logged in)
final user = context.yeboIdUser;

// Check if logged in
if (context.isYeboIdLoggedIn) {
  // User is authenticated
}

// Check if KYC verified
if (context.isYeboIdVerified) {
  // User has passed KYC
}
```

## Dependencies

The SDK requires these packages:

```yaml
dependencies:
  flutter_secure_storage: ^9.0.0
  url_launcher: ^6.2.0
  http: ^1.2.0
```

## Platform Setup

### Android

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <application>
    <activity android:name=".MainActivity">
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="yourapp" android:host="auth" />
      </intent-filter>
    </activity>
  </application>
</manifest>
```

### iOS

Add to `ios/Runner/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yourapp</string>
    </array>
  </dict>
</array>
```

## Next Steps

- [YeboIDProvider Setup](/flutter-sdk/provider)
- [Customizing the Login Button](/flutter-sdk/login-button)
- [Displaying User Avatars](/flutter-sdk/avatar)
