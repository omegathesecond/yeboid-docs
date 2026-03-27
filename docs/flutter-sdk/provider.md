# YeboIDProvider

The `YeboIDProvider` widget wraps your application and provides YeboID authentication capabilities to all descendant widgets.

## Basic Usage

```dart
import 'package:yeboid_flutter/yeboid_flutter.dart';

void main() {
  runApp(
    YeboIDProvider(
      config: YeboIDConfig(
        clientId: 'your-client-id',
        redirectUri: 'yourapp://auth',
      ),
      child: MyApp(),
    ),
  );
}
```

## Configuration

### YeboIDConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `clientId` | `String` | Required | Your app's client ID from YeboID dashboard |
| `redirectUri` | `String` | Required | OAuth callback URI (e.g., `yourapp://auth`) |
| `apiUrl` | `String` | `https://api.yeboid.com` | API base URL |
| `authUrl` | `String` | `https://yeboid.com` | OAuth authorization URL |
| `scopes` | `List<String>` | `['openid', 'profile', 'phone']` | OAuth scopes to request |
| `requireKyc` | `bool` | `false` | Require KYC verification for login |

### Example with All Options

```dart
YeboIDProvider(
  config: YeboIDConfig(
    clientId: 'your-client-id',
    redirectUri: 'yourapp://auth',
    scopes: ['openid', 'profile', 'phone', 'email', 'kyc'],
    requireKyc: true,  // Only allow KYC-verified users
  ),
  child: MyApp(),
)
```

### Development Configuration

Use the `dev` factory for development/staging:

```dart
YeboIDProvider(
  config: YeboIDConfig.dev(
    clientId: 'dev-client-id',
    redirectUri: 'yourapp://auth',
  ),
  child: MyApp(),
)
```

## Accessing the Client

### Using `YeboIDProvider.of()`

```dart
// Throws if no provider found
final client = YeboIDProvider.of(context);

// Returns null if no provider found
final client = YeboIDProvider.maybeOf(context);
```

### Using Context Extensions

```dart
// Get the client
final client = context.yeboId;

// Get current user
final user = context.yeboIdUser;

// Check status
if (context.isYeboIdLoggedIn) {
  print('Logged in as ${context.yeboIdUser?.displayName}');
}

if (context.isYeboIdVerified) {
  print('KYC verified');
}
```

## Client Methods

The `YeboIDClient` provides these methods:

### Authentication

```dart
final client = YeboIDProvider.of(context);

// Login (opens OAuth flow)
final user = await client.login();

// Logout
await client.logout();

// Refresh user info from server
await client.fetchUser();
```

### State Properties

```dart
// Current user (null if not logged in)
final user = client.user;

// Loading state
if (client.isLoading) {
  return CircularProgressIndicator();
}

// Error message
if (client.error != null) {
  print('Error: ${client.error}');
}

// Login status
if (client.isLoggedIn) {
  // Authenticated
}

// KYC status
if (client.isVerified) {
  // User is KYC verified
}
```

### KYC Verification

```dart
// Start KYC verification flow
final verifyUrl = await client.startKycVerification();
if (verifyUrl != null) {
  // Open the verification URL
  launchUrl(Uri.parse(verifyUrl));
}
```

## Listening to State Changes

The client extends `ChangeNotifier`, so you can listen to changes:

```dart
@override
void initState() {
  super.initState();
  final client = YeboIDProvider.of(context);
  client.addListener(_onAuthStateChanged);
}

void _onAuthStateChanged() {
  final client = YeboIDProvider.of(context);
  if (client.isLoggedIn) {
    // Navigate to home
  }
}

@override
void dispose() {
  YeboIDProvider.of(context).removeListener(_onAuthStateChanged);
  super.dispose();
}
```

Or use with `ListenableBuilder`:

```dart
ListenableBuilder(
  listenable: YeboIDProvider.of(context),
  builder: (context, _) {
    final user = context.yeboIdUser;
    if (user == null) {
      return LoginScreen();
    }
    return HomeScreen(user: user);
  },
)
```

## Using a Pre-created Client

For advanced use cases, you can create the client yourself:

```dart
final client = YeboIDClient(
  config: YeboIDConfig(
    clientId: 'your-client-id',
    redirectUri: 'yourapp://auth',
  ),
);

// Initialize manually
await client.initialize();

// Pass to provider
YeboIDProvider(
  config: config,
  client: client,  // Use pre-created client
  child: MyApp(),
)
```

## Complete Example

```dart
import 'package:flutter/material.dart';
import 'package:yeboid_flutter/yeboid_flutter.dart';

void main() {
  runApp(
    YeboIDProvider(
      config: YeboIDConfig(
        clientId: 'my-app',
        redirectUri: 'myapp://auth',
      ),
      child: MaterialApp(
        title: 'My App',
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF0A0A0F),
        ),
        home: const AuthGate(),
      ),
    ),
  );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: YeboIDProvider.of(context),
      builder: (context, _) {
        final client = YeboIDProvider.of(context);
        
        if (client.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        
        if (client.isLoggedIn) {
          return const HomeScreen();
        }
        
        return const LoginScreen();
      },
    );
  }
}
```
