# YeboIDAvatar

A user avatar widget that displays the user's profile picture or initials, with an optional KYC verification badge.

## Basic Usage

```dart
YeboIDAvatar(
  size: 48,
  showBadge: true,
  onTap: () => showProfileSheet(context),
)
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `double` | `40` | Avatar diameter in pixels |
| `showBadge` | `bool` | `true` | Show KYC verification badge |
| `badgeScale` | `double` | `0.35` | Badge size relative to avatar |
| `onTap` | `VoidCallback?` | `null` | Tap callback |
| `user` | `YeboIDUser?` | `null` | Custom user (uses context if null) |
| `placeholder` | `Widget?` | `null` | Widget when not logged in |
| `borderColor` | `Color?` | `null` | Border color (null for no border) |
| `borderWidth` | `double` | `2` | Border width |

## Features

### Profile Picture

Shows the user's avatar image if available:

```dart
YeboIDAvatar(
  size: 64,
  user: user, // Has avatarUrl
)
```

### Initials Fallback

If no avatar image, shows initials with a gradient background:

- Full name → First letters of first and last name
- Single name → First letter
- No name → Last 2 digits of phone number

```dart
// "John Doe" → "JD"
// "Alice" → "A"
// "+26878422613" → "13"
```

### KYC Badge

Green checkmark badge when user is verified:

```dart
YeboIDAvatar(
  showBadge: true,  // Shows badge only if user.isVerified
)
```

### Custom Badge Size

```dart
YeboIDAvatar(
  size: 60,
  badgeScale: 0.4, // Badge is 40% of avatar size
)
```

## Styling

### With Border

Add a gold border for emphasis:

```dart
YeboIDAvatar(
  size: 56,
  borderColor: const Color(0xFFD4AF37),
  borderWidth: 3,
)
```

### Custom Placeholder

Show a custom widget when not logged in:

```dart
YeboIDAvatar(
  placeholder: Container(
    width: 48,
    height: 48,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: LinearGradient(
        colors: [Color(0xFFD4AF37), Color(0xFFB8962E)],
      ),
    ),
    child: Icon(Icons.login, color: Colors.black),
  ),
)
```

### Default Placeholder

Without a custom placeholder, shows a gray circle with person icon.

## Using with Context

When inside a `YeboIDProvider`, the avatar automatically uses the current user:

```dart
// Uses context.yeboIdUser
YeboIDAvatar(size: 48)
```

## Using with Custom User

Pass a user directly:

```dart
YeboIDAvatar(
  user: someOtherUser,
  size: 48,
)
```

## Tap Handler

Make the avatar tappable:

```dart
YeboIDAvatar(
  size: 48,
  onTap: () {
    showModalBottomSheet(
      context: context,
      builder: (_) => ProfileSheet(),
    );
  },
)
```

## Color Generation

Initials backgrounds use consistent colors based on user ID:

| Color | Hex |
|-------|-----|
| Gold | `#D4AF37` |
| Indigo | `#6366F1` |
| Pink | `#EC4899` |
| Purple | `#8B5CF6` |
| Teal | `#14B8A6` |
| Amber | `#F59E0B` |
| Red | `#EF4444` |
| Blue | `#3B82F6` |

Same user ID always gets the same color.

## Complete Example

```dart
import 'package:flutter/material.dart';
import 'package:yeboid_flutter/yeboid_flutter.dart';

class AppBar extends StatelessWidget implements PreferredSizeWidget {
  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0A0A0F),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        child: Row(
          children: [
            Text(
              'My App',
              style: TextStyle(
                color: const Color(0xFFD4AF37),
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            
            // User avatar with badge
            YeboIDAvatar(
              size: 40,
              showBadge: true,
              borderColor: const Color(0xFFD4AF37),
              onTap: () => _showProfileMenu(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showProfileMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        child: YeboIDProfileCard(
          onLogout: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }
}
```

## Badge Styling

The verification badge:

- Green background (`#10B981`)
- White checkmark icon
- White border (2px)
- Subtle shadow
- Positioned at bottom-right

```dart
// Badge is only shown when:
// 1. showBadge is true
// 2. user.isVerified is true
```
