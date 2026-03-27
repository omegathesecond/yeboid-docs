# YeboIDUser Model

The `YeboIDUser` class represents an authenticated user with their profile data and KYC status.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `String` | Unique YeboID user identifier (UUID) |
| `phone` | `String` | User's phone number (primary identifier) |
| `name` | `String?` | User's display name |
| `email` | `String?` | Email address (optional) |
| `avatarUrl` | `String?` | Profile avatar URL |
| `kycStatus` | `KycStatus` | KYC verification status |
| `kycCountry` | `String?` | Country from KYC verification |
| `kycBirthday` | `String?` | Date of birth (YYYY-MM-DD) |
| `kycVerifiedAt` | `DateTime?` | When user was KYC verified |
| `createdAt` | `DateTime` | When user account was created |

## Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `isVerified` | `bool` | True if KYC status is verified |
| `isPendingVerification` | `bool` | True if KYC is pending |
| `displayName` | `String` | Name or formatted phone |
| `firstName` | `String?` | First name (if available) |

## KycStatus Enum

```dart
enum KycStatus {
  none,      // Not verified
  pending,   // Verification in progress
  verified,  // Successfully verified
  rejected,  // Verification rejected
}
```

## Usage Examples

### Accessing User Data

```dart
final user = context.yeboIdUser;

if (user != null) {
  print('ID: ${user.id}');
  print('Phone: ${user.phone}');
  print('Name: ${user.displayName}');
  print('Verified: ${user.isVerified}');
}
```

### Checking Verification Status

```dart
final user = context.yeboIdUser;

if (user == null) {
  return LoginScreen();
}

if (user.isPendingVerification) {
  return VerificationPendingScreen();
}

if (!user.isVerified) {
  return VerificationPromptScreen();
}

return HomeScreen(user: user);
```

### Displaying User Info

```dart
Widget buildUserInfo(YeboIDUser user) {
  return Column(
    children: [
      Text(user.displayName),
      Text(user.phone),
      if (user.email != null) Text(user.email!),
      if (user.isVerified) ...[
        Icon(Icons.verified, color: Colors.green),
        if (user.kycCountry != null) Text('Country: ${user.kycCountry}'),
      ],
    ],
  );
}
```

## JSON Serialization

### From JSON

```dart
final user = YeboIDUser.fromJson({
  'id': 'usr_abc123',
  'phone': '+26878422613',
  'name': 'John Doe',
  'email': 'john@example.com',
  'avatar_url': 'https://api.yeboid.com/avatars/usr_abc123.jpg',
  'kyc_status': 'VERIFIED',
  'kyc_country': 'SZ',
  'kyc_birthday': '1990-05-15',
  'kyc_verified_at': '2024-01-15T10:30:00Z',
  'created_at': '2023-06-01T08:00:00Z',
});
```

### To JSON

```dart
final json = user.toJson();
// {
//   'id': 'usr_abc123',
//   'phone': '+26878422613',
//   'name': 'John Doe',
//   ...
// }
```

## copyWith

Create a modified copy of the user:

```dart
final updatedUser = user.copyWith(
  name: 'Jane Doe',
  kycStatus: KycStatus.verified,
);
```

## Display Name Logic

The `displayName` property returns:

1. User's name if available
2. Formatted phone number if no name

```dart
// With name:
// user.name = "John Doe"
// user.displayName → "John Doe"

// Without name:
// user.phone = "+26878422613"
// user.displayName → "+268 7842 2613"
```

## First Name

Extracts the first name from full name:

```dart
// user.name = "John Doe"
// user.firstName → "John"

// user.name = "Alice"
// user.firstName → "Alice"

// user.name = null
// user.firstName → null
```

## OAuth Claims Mapping

When created from OAuth userinfo response:

| OAuth Claim | YeboIDUser Property |
|-------------|---------------------|
| `sub` | `id` |
| `phone` / `phone_number` | `phone` |
| `name` | `name` |
| `email` | `email` |
| `picture` / `avatar_url` | `avatarUrl` |
| `kyc_status` / `kycStatus` | `kycStatus` |
| `kyc_country` / `kycCountry` | `kycCountry` |
| `kyc_birthday` / `kycBirthday` | `kycBirthday` |
| `kyc_verified_at` / `kycVerifiedAt` | `kycVerifiedAt` |
| `created_at` / `createdAt` | `createdAt` |

## Complete Example

```dart
import 'package:flutter/material.dart';
import 'package:yeboid_flutter/yeboid_flutter.dart';

class UserProfileWidget extends StatelessWidget {
  final YeboIDUser user;

  const UserProfileWidget({required this.user, super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A2E),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                YeboIDAvatar(user: user, size: 56),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        user.phone,
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            const Divider(color: Colors.white24),
            const SizedBox(height: 16),
            
            // Details
            _buildRow('User ID', user.id),
            if (user.email != null) _buildRow('Email', user.email!),
            _buildRow('Status', _getStatusText(user.kycStatus)),
            if (user.kycCountry != null) _buildRow('Country', user.kycCountry!),
            if (user.kycVerifiedAt != null) 
              _buildRow('Verified', _formatDate(user.kycVerifiedAt!)),
            _buildRow('Member since', _formatDate(user.createdAt)),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54)),
          Text(value, style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }

  String _getStatusText(KycStatus status) {
    switch (status) {
      case KycStatus.verified:
        return '✅ Verified';
      case KycStatus.pending:
        return '⏳ Pending';
      case KycStatus.rejected:
        return '❌ Rejected';
      case KycStatus.none:
        return '⚪ Not verified';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
```
