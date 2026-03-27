# KYC Integration

YeboID integrates with [YeboVerify](https://yeboverify.com) for identity verification. This guide covers how to verify your users' identities.

## Overview

KYC (Know Your Customer) verification allows you to:

- Verify user identities with government-issued documents
- Confirm user age and nationality
- Meet regulatory compliance requirements
- Unlock premium features for verified users

## Verification Flow

```
┌─────────────┐     Start KYC     ┌─────────────┐
│   Your App  │ ─────────────────▶│  YeboID API │
└─────────────┘                   └─────────────┘
                                        │
                                        │ Returns verify URL
                                        ▼
                                  ┌─────────────┐
                                  │ YeboVerify  │
                                  │   (Web UI)  │
                                  └─────────────┘
                                        │
                                        │ User completes:
                                        │ - Document scan
                                        │ - Selfie
                                        │ - Liveness check
                                        ▼
┌─────────────┐    Webhook Event   ┌─────────────┐
│   Your App  │◀──────────────────│  YeboID API │
└─────────────┘   kyc.completed   └─────────────┘
```

## Starting Verification

### Flutter SDK

```dart
YeboIDVerifyButton(
  onVerified: () {
    print('User verified!');
    // Refresh user data
    YeboIDProvider.of(context).fetchUser();
  },
  onError: (error) {
    print('Verification failed: $error');
  },
)
```

Or manually:

```dart
final client = YeboIDProvider.of(context);
final verifyUrl = await client.startKycVerification();

if (verifyUrl != null) {
  // Open in browser
  await launchUrl(Uri.parse(verifyUrl));
}
```

### API

```bash
POST https://api.yeboid.com/api/v1/kyc/start
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "country": "SZ",
  "return_url": "yourapp://kyc-complete"
}
```

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| `country` | No | ISO 3166-1 alpha-2 country code (auto-detected if omitted) |
| `return_url` | No | URL to redirect after completion |

**Response:**

```json
{
  "verification_url": "https://verify.yeboid.com/v/sess_abc123",
  "session_id": "sess_abc123",
  "expires_at": "2024-02-28T12:00:00Z"
}
```

## Checking Status

### User Properties

After the user completes verification, their profile is updated:

```dart
final user = context.yeboIdUser;

if (user.isVerified) {
  print('✅ Verified in ${user.kycCountry}');
  print('Verified at: ${user.kycVerifiedAt}');
} else if (user.isPendingVerification) {
  print('⏳ Verification pending');
} else {
  print('❌ Not verified');
}
```

### API

```bash
GET https://api.yeboid.com/api/v1/kyc/status
Authorization: Bearer ACCESS_TOKEN
```

**Response:**

```json
{
  "status": "VERIFIED",
  "country": "SZ",
  "verified_at": "2024-01-15T10:30:00Z",
  "document_type": "NATIONAL_ID",
  "full_name": "John Doe",
  "date_of_birth": "1990-05-15"
}
```

## KYC Status Values

| Status | Description |
|--------|-------------|
| `NONE` | User hasn't started verification |
| `PENDING` | Verification in progress (document submitted) |
| `VERIFIED` | Successfully verified |
| `REJECTED` | Verification failed |

## Supported Countries

YeboVerify currently supports:

| Country | Code | Documents |
|---------|------|-----------|
| Eswatini | SZ | National ID, Passport |
| South Africa | ZA | National ID, Passport, Driver's License |
| Mozambique | MZ | National ID, Passport |
| Zimbabwe | ZW | National ID, Passport |
| Namibia | NA | National ID, Passport |
| Botswana | BW | National ID, Passport |
| Lesotho | LS | National ID, Passport |

More countries coming soon.

## Requiring KYC

You can require KYC verification for login:

```dart
YeboIDProvider(
  config: YeboIDConfig(
    clientId: 'your-client-id',
    redirectUri: 'yourapp://auth',
    requireKyc: true,  // Only allow verified users
  ),
  child: MyApp(),
)
```

Or handle it in your app:

```dart
if (!context.isYeboIdVerified) {
  return VerificationRequiredScreen();
}
```

## Webhooks

Get notified when KYC status changes:

```json
{
  "event": "kyc.completed",
  "data": {
    "user_id": "usr_abc123",
    "status": "VERIFIED",
    "country": "SZ",
    "verified_at": "2024-01-15T10:30:00Z"
  }
}
```

See [Webhooks](/webhooks) for setup.

## Best Practices

### 1. Explain the Benefits

```dart
Container(
  padding: EdgeInsets.all(16),
  child: Column(
    children: [
      Icon(Icons.verified_user, size: 48, color: Colors.amber),
      Text('Verify Your Identity'),
      Text('Unlock these benefits:'),
      BenefitRow(icon: Icons.money, text: 'Higher transfer limits'),
      BenefitRow(icon: Icons.lock, text: 'Enhanced security'),
      BenefitRow(icon: Icons.check, text: 'Priority support'),
      YeboIDVerifyButton(),
    ],
  ),
)
```

### 2. Handle Pending State

```dart
Widget buildKycStatus(YeboIDUser user) {
  if (user.isVerified) {
    return VerifiedBadge();
  }
  
  if (user.isPendingVerification) {
    return Row(
      children: [
        CircularProgressIndicator(),
        Text('Verification in progress...'),
        TextButton(
          onPressed: () => _checkStatus(),
          child: Text('Refresh'),
        ),
      ],
    );
  }
  
  return YeboIDVerifyButton();
}
```

### 3. Graceful Failure

```dart
YeboIDVerifyButton(
  onError: (error) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Verification Issue'),
        content: Text(
          'We couldn\'t complete your verification. '
          'Please try again or contact support.',
        ),
        actions: [
          TextButton(
            onPressed: () => _contactSupport(),
            child: Text('Contact Support'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Try Again'),
          ),
        ],
      ),
    );
  },
)
```

## Data Access

After verification, you can access:

| Field | Description | Scope Required |
|-------|-------------|----------------|
| `kyc_status` | Verification status | `kyc` |
| `kyc_country` | Verified country | `kyc` |
| `kyc_birthday` | Date of birth | `kyc` (with additional consent) |
| Full name | Legal name from document | `kyc` |

Request the `kyc` scope to access this data:

```dart
YeboIDConfig(
  clientId: 'your-client-id',
  redirectUri: 'yourapp://auth',
  scopes: ['openid', 'profile', 'phone', 'kyc'],
)
```
