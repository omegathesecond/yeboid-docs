# YeboIDProfileCard

A complete profile card widget showing user information, KYC status, and action buttons.

## Basic Usage

```dart
YeboIDProfileCard(
  onLogout: () {
    Navigator.pushReplacementNamed(context, '/login');
  },
)
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `onLogout` | `VoidCallback?` | `null` | Called when logout is tapped |
| `onVerify` | `VoidCallback?` | `null` | Called when verify is tapped |
| `showLogout` | `bool` | `true` | Show logout button |
| `showVerifyPrompt` | `bool` | `true` | Show verify prompt if not verified |
| `user` | `YeboIDUser?` | `null` | Custom user (uses context if null) |
| `backgroundColor` | `Color?` | Auto | Card background color |
| `borderRadius` | `double` | `16` | Card corner radius |
| `padding` | `EdgeInsets` | `EdgeInsets.all(20)` | Card padding |

## Features

### User Info Display

Shows the user's:
- Avatar with verification badge
- Display name
- Phone number
- Email (if available)
- KYC country (if verified)

### KYC Status Banner

Different states based on verification:

**Verified** - Green banner with checkmark:
```
✅ Identity Verified
Your account is fully verified
```

**Pending** - Amber banner:
```
⏳ Verification in progress...
```

**Not Verified** - Gold prompt with verify button:
```
🛡️ Verify your identity to unlock all features
[Verify Identity]
```

### Logout Confirmation

Tapping logout shows a confirmation dialog:

```dart
YeboIDProfileCard(
  onLogout: () {
    // Called after user confirms logout
    Navigator.pushReplacementNamed(context, '/login');
  },
)
```

## Customization

### Hide Logout Button

```dart
YeboIDProfileCard(
  showLogout: false,
  // Handle logout elsewhere
)
```

### Hide Verify Prompt

```dart
YeboIDProfileCard(
  showVerifyPrompt: false,
  // Handle verification elsewhere
)
```

### Custom Background

```dart
YeboIDProfileCard(
  backgroundColor: Colors.grey[900],
  borderRadius: 24,
  padding: EdgeInsets.all(32),
)
```

### Custom Verify Handler

```dart
YeboIDProfileCard(
  onVerify: () {
    // Custom KYC flow
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => CustomKycScreen(),
    ));
  },
)
```

## Adapts to Theme

The card automatically adapts to light/dark theme:

- **Dark theme:** `#1A1A2E` background, white text
- **Light theme:** White background, dark text

## Complete Example

```dart
import 'package:flutter/material.dart';
import 'package:yeboid_flutter/yeboid_flutter.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: const Color(0xFF0A0A0F),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile card
            YeboIDProfileCard(
              showLogout: true,
              showVerifyPrompt: true,
              onLogout: () {
                Navigator.pushReplacementNamed(context, '/login');
              },
              onVerify: () async {
                // Start KYC flow
                final client = YeboIDProvider.of(context);
                final url = await client.startKycVerification();
                if (url != null) {
                  // Navigate to KYC
                }
              },
            ),
            
            const SizedBox(height: 24),
            
            // Additional actions
            _buildActionTile(
              icon: Icons.settings,
              title: 'Settings',
              onTap: () => Navigator.pushNamed(context, '/settings'),
            ),
            _buildActionTile(
              icon: Icons.help_outline,
              title: 'Help & Support',
              onTap: () => Navigator.pushNamed(context, '/support'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFFD4AF37)),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      trailing: const Icon(Icons.chevron_right, color: Colors.white54),
      onTap: onTap,
    );
  }
}
```

## Bottom Sheet Usage

Perfect for showing in a bottom sheet:

```dart
void showProfileSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (context) => Container(
      decoration: const BoxDecoration(
        color: Color(0xFF1A1A2E),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: YeboIDProfileCard(
        onLogout: () {
          Navigator.pop(context); // Close sheet
          Navigator.pushReplacementNamed(context, '/login');
        },
      ),
    ),
  );
}
```

## Info Row Display

When verified, additional info is shown:

| Icon | Label | Value |
|------|-------|-------|
| 🏳️ | Country | KYC country code |
| ✉️ | Email | User's email |

These only appear if the data is available.
