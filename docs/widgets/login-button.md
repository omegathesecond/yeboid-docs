# YeboIDLoginButton

A pre-styled "Login with Yebo" button that handles the complete OAuth flow. Features the Midnight Gold theme with gradient styling.

## Basic Usage

```dart
YeboIDLoginButton(
  onSuccess: (user) {
    Navigator.pushReplacementNamed(context, '/home');
  },
  onError: (error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error)),
    );
  },
)
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `onSuccess` | `void Function(YeboIDUser user)?` | `null` | Called when login succeeds |
| `onError` | `void Function(String error)?` | `null` | Called when login fails |
| `onCancel` | `VoidCallback?` | `null` | Called when user cancels login |
| `text` | `String?` | `'Continue with Yebo'` | Button text |
| `style` | `YeboIDButtonStyle` | `.filled` | Button style variant |
| `showLoading` | `bool` | `true` | Show loading indicator |
| `width` | `double?` | Expand to fill | Custom width |
| `height` | `double` | `52` | Button height |
| `borderRadius` | `double` | `12` | Border radius |

## Button Styles

### Filled (Default)

Gold gradient background with dark text.

```dart
YeboIDLoginButton(
  style: YeboIDButtonStyle.filled,
  onSuccess: (user) => print('Logged in: ${user.displayName}'),
)
```

### Outlined

Gold border with gold text on transparent background.

```dart
YeboIDLoginButton(
  style: YeboIDButtonStyle.outlined,
  onSuccess: (user) => print('Logged in'),
)
```

### Text

Text-only button with no background.

```dart
YeboIDLoginButton(
  style: YeboIDButtonStyle.text,
  text: 'Sign in with YeboID',
  onSuccess: (user) => print('Logged in'),
)
```

## Customization

### Custom Text

```dart
YeboIDLoginButton(
  text: 'Sign in with YeboID',
  onSuccess: (user) => {},
)
```

### Custom Size

```dart
YeboIDLoginButton(
  width: 300,
  height: 56,
  borderRadius: 28, // Fully rounded
  onSuccess: (user) => {},
)
```

### Full Width

```dart
Padding(
  padding: EdgeInsets.symmetric(horizontal: 24),
  child: YeboIDLoginButton(
    // Width defaults to expand to fill parent
    onSuccess: (user) => {},
  ),
)
```

## Event Handling

### Success

Called with the authenticated `YeboIDUser`:

```dart
YeboIDLoginButton(
  onSuccess: (user) {
    print('Welcome, ${user.displayName}!');
    print('Phone: ${user.phone}');
    print('Verified: ${user.isVerified}');
    
    Navigator.pushReplacementNamed(context, '/home');
  },
)
```

### Error

Called with an error message string:

```dart
YeboIDLoginButton(
  onError: (error) {
    if (error.contains('network')) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text('Connection Error'),
          content: Text('Please check your internet connection.'),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
    }
  },
)
```

### Cancel

Called when user closes the login flow without completing:

```dart
YeboIDLoginButton(
  onCancel: () {
    print('User cancelled login');
  },
)
```

## Loading State

The button automatically shows a loading indicator during authentication:

```dart
YeboIDLoginButton(
  showLoading: true,  // Default
  onSuccess: (user) => {},
)
```

Disable loading indicator:

```dart
YeboIDLoginButton(
  showLoading: false,
  onSuccess: (user) => {},
)
```

## Complete Example

```dart
import 'package:flutter/material.dart';
import 'package:yeboid_flutter/yeboid_flutter.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Icon(
                Icons.shield_outlined,
                size: 80,
                color: const Color(0xFFD4AF37),
              ),
              const SizedBox(height: 24),
              
              // Title
              Text(
                'Welcome',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Sign in to continue',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 48),
              
              // Primary login button
              YeboIDLoginButton(
                style: YeboIDButtonStyle.filled,
                onSuccess: (user) {
                  Navigator.pushReplacementNamed(context, '/home');
                },
                onError: (error) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(error),
                      backgroundColor: Colors.red,
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              
              // Alternative: outlined style
              YeboIDLoginButton(
                style: YeboIDButtonStyle.outlined,
                text: 'Use different account',
                onSuccess: (user) {
                  Navigator.pushReplacementNamed(context, '/home');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Styling

The button uses these colors from the Midnight Gold palette:

| Element | Color |
|---------|-------|
| Filled background | Linear gradient: `#D4AF37` → `#B8962E` |
| Filled text | `#0A0A0F` (dark) |
| Outlined border | `#D4AF37` |
| Outlined text | `#D4AF37` |
| Text-only | `#D4AF37` |
| Shadow | `#D4AF37` at 30% opacity |

The button includes the Yebo "Y" logo icon automatically.
