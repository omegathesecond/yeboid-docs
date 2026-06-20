# Flutter SDK

The YeboID Flutter SDK provides beautiful, pre-styled widgets for authentication with the Midnight Gold theme. Add "Login with Yebo" to your app in minutes.

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  yeboid_flutter: ^1.0.3
```

Or pin the GitHub release directly (works today, before pub.dev publish):

```yaml
dependencies:
  yeboid_flutter:
    git:
      url: https://github.com/omegathesecond/yeboid-flutter.git
      ref: v1.0.3
```

The SDK requires `flutter_appauth ^8` in the consuming app.

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

Your `redirectUri` **must be a custom scheme** (e.g. `yourapp://callback`) and
that scheme must be registered both on your YeboID OAuth app's `redirectUris`
**and** natively, below. (Don't use an `https://` App Link — system browsers
claim https themselves and won't reliably hand it back to your app.)

### Android

Register the redirect scheme with `flutter_appauth`'s manifest placeholder in
`android/app/build.gradle` (do **not** hand-add an intent-filter to
`MainActivity` — the SDK/`flutter_appauth` provides the `RedirectUriReceiverActivity`):

```gradle
android {
    defaultConfig {
        manifestPlaceholders += ['appAuthRedirectScheme': 'yourapp']
    }
}
```

::: danger Do NOT set `android:taskAffinity=""` on MainActivity
`flutter_appauth`'s `AuthorizationManagementActivity` is `singleTask` with the
default task affinity (your package name). An empty/custom affinity on
`MainActivity` puts the OAuth flow in a separate task that is cleared during the
browser round-trip — login completes in the browser but never returns to the
app, and logcat shows `W/AppAuth: No stored state - unable to handle response`.
Leave `MainActivity` on the default affinity (`launchMode="singleTop"` is fine).
:::

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
