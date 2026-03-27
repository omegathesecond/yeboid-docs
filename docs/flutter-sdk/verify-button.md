# YeboIDVerifyButton

A button to start the KYC verification flow. Opens the YeboVerify identity verification process.

## Basic Usage

```dart
YeboIDVerifyButton(
  onVerified: () {
    // User completed verification
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Identity verified!')),
    );
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
| `onVerified` | `VoidCallback?` | `null` | Called when verification succeeds |
| `onError` | `void Function(String error)?` | `null` | Called when verification fails |
| `onTap` | `VoidCallback?` | `null` | Custom tap handler (overrides default) |
| `text` | `String` | `'Verify Identity'` | Button text |
| `style` | `YeboIDVerifyButtonStyle` | `.filled` | Button style variant |
| `width` | `double?` | `null` | Custom width |
| `height` | `double` | `44` | Button height |
| `borderRadius` | `double` | `10` | Corner radius |

## Button Styles

### Filled (Default)

Gold gradient background with dark text and icon:

```dart
YeboIDVerifyButton(
  style: YeboIDVerifyButtonStyle.filled,
  onVerified: () => print('Verified!'),
)
```

### Outlined

Gold border with gold text:

```dart
YeboIDVerifyButton(
  style: YeboIDVerifyButtonStyle.outlined,
  onVerified: () => print('Verified!'),
)
```

## Customization

### Custom Text

```dart
YeboIDVerifyButton(
  text: 'Complete KYC',
  onVerified: () => {},
)
```

### Custom Size

```dart
YeboIDVerifyButton(
  width: double.infinity,
  height: 52,
  borderRadius: 26,
  onVerified: () => {},
)
```

### Custom Tap Handler

Override the default verification flow:

```dart
YeboIDVerifyButton(
  onTap: () {
    // Custom flow
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => CustomKycScreen(),
    ));
  },
)
```

## How It Works

When tapped (without `onTap` override):

1. Shows loading indicator
2. Calls `client.startKycVerification()` to get a verification URL
3. Opens the URL in an external browser
4. Waits for user to return
5. Refreshes user info to check verification status
6. Calls `onVerified` if successful, `onError` if failed

## Verification Flow

```
┌─────────────┐     Tap      ┌─────────────┐
│   Button    │ ────────────▶│  YeboID API │
└─────────────┘              └─────────────┘
                                   │
                                   │ Returns verify URL
                                   ▼
                             ┌─────────────┐
                             │  Browser    │
                             │ (YeboVerify)│
                             └─────────────┘
                                   │
                                   │ User completes KYC
                                   ▼
┌─────────────┐   Refresh    ┌─────────────┐
│     App     │◀──────────── │   Return    │
└─────────────┘              └─────────────┘
```

## Integration with YeboVerify

The button integrates with YeboVerify for identity verification:

- Document scanning (ID, passport)
- Selfie verification
- Liveness detection
- Data extraction

Users are guided through the process in their browser.

## Example: Verification Prompt

```dart
class VerificationPrompt extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFD4AF37).withOpacity(0.3),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.verified_user_outlined,
            size: 48,
            color: const Color(0xFFD4AF37),
          ),
          const SizedBox(height: 16),
          Text(
            'Verify Your Identity',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Complete KYC verification to unlock all features and higher limits.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: YeboIDVerifyButton(
              onVerified: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('🎉 Identity verified!'),
                    backgroundColor: Color(0xFF10B981),
                  ),
                );
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
          ),
        ],
      ),
    );
  }
}
```

## Conditional Display

Only show the button if user is not verified:

```dart
final user = context.yeboIdUser;

if (user != null && !user.isVerified) {
  return YeboIDVerifyButton(
    onVerified: () => _refreshUser(),
  );
}

// Already verified - don't show button
return SizedBox.shrink();
```

## Styling

| Element | Filled | Outlined |
|---------|--------|----------|
| Background | `#D4AF37` → `#B8962E` gradient | Transparent |
| Border | None | `#D4AF37` (1.5px) |
| Text | `#0A0A0F` | `#D4AF37` |
| Icon | `#0A0A0F` | `#D4AF37` |
| Loading | Dark spinner | Gold spinner |

The button includes a shield icon (🛡️) by default.
