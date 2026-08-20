# PKCE (Proof Key for Code Exchange)

PKCE (pronounced "pixy") is a security extension to OAuth 2.0 that prevents authorization code interception attacks. It's required for all YeboID authentication flows.

## Why PKCE?

Traditional OAuth 2.0 uses a `client_secret` to exchange authorization codes for tokens. However, mobile and single-page applications can't securely store secrets—anyone can decompile your app and extract them.

PKCE solves this by:

1. Generating a random secret (code verifier) for each authentication request
2. Sending a hash (code challenge) with the auth request
3. Proving possession of the original secret during token exchange

Even if an attacker intercepts the authorization code, they can't exchange it without the code verifier.

## How It Works

```
┌─────────────┐                              ┌─────────────┐
│             │  1. Generate code_verifier   │             │
│             │  2. Hash → code_challenge    │             │
│   Your App  │                              │   YeboID    │
│             │ ────────────────────────────▶│             │
│             │  3. Auth request with        │             │
│             │     code_challenge           │             │
└─────────────┘                              └─────────────┘
       │                                            │
       │                                            │
       │         4. User authenticates              │
       │                                            │
       │◀────────────────────────────────────────────
       │         5. Authorization code
       │
       │         6. Exchange code with
       ▼            code_verifier
┌─────────────┐                              ┌─────────────┐
│             │ ────────────────────────────▶│             │
│   Your App  │                              │  YeboID API │
│             │◀──────────────────────────── │             │
│             │  7. Tokens (if verifier      │             │
│             │     matches challenge)       │             │
└─────────────┘                              └─────────────┘
```

## Implementation

### 1. Generate Code Verifier

The code verifier is a cryptographically random string between 43 and 128 characters:

::: code-group

```dart [Dart]
import 'dart:convert';
import 'dart:math';

String generateCodeVerifier() {
  final random = Random.secure();
  final bytes = List<int>.generate(32, (_) => random.nextInt(256));
  return base64UrlEncode(bytes).replaceAll('=', '');
}
```

```javascript [JavaScript]
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

```python [Python]
import secrets
import base64

def generate_code_verifier():
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
```

:::

### 2. Generate Code Challenge

Hash the code verifier using SHA-256 and base64url-encode the result:

::: code-group

```dart [Dart]
import 'dart:convert';
import 'package:crypto/crypto.dart';

String generateCodeChallenge(String verifier) {
  final bytes = utf8.encode(verifier);
  final digest = sha256.convert(bytes);
  return base64UrlEncode(digest.bytes).replaceAll('=', '');
}
```

```javascript [JavaScript]
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}
```

```python [Python]
import hashlib
import base64

def generate_code_challenge(verifier):
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')
```

:::

### 3. Store the Code Verifier

Store the code verifier securely so you can use it when exchanging the authorization code:

::: code-group

```dart [Flutter]
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();
await storage.write(key: 'pkce_verifier', value: codeVerifier);
```

```javascript [JavaScript]
// For SPAs, use sessionStorage (cleared when tab closes)
sessionStorage.setItem('pkce_verifier', codeVerifier);
```

:::

### 4. Include Challenge in Auth Request

```
https://yeboid.com/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=yourapp://auth&
  scope=openid profile phone&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256&
  state=abc123
```

### 5. Include Verifier in Token Exchange

```bash
POST https://api.yeboid.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=yourapp://auth&
client_id=YOUR_CLIENT_ID&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

## Security Best Practices

::: warning Store Securely
Never log or persist the code verifier in plain text. Use secure storage mechanisms appropriate for your platform.
:::

### Do's

- ✅ Generate a new code verifier for every authentication request
- ✅ Use cryptographically secure random number generators
- ✅ Store the verifier in secure storage (Keychain, SecureStorage, etc.)
- ✅ Clear the verifier after successful token exchange

### Don'ts

- ❌ Reuse code verifiers across authentication attempts
- ❌ Store verifiers in localStorage or UserDefaults
- ❌ Log verifiers or include them in error reports
- ❌ Use predictable or short code verifiers

## Flutter SDK

When using the YeboID Flutter SDK, PKCE is handled automatically:

```dart
// All PKCE operations are internal
YeboIDProvider(
  config: YeboIDConfig(
    clientId: 'your-client-id',
    redirectUri: 'yourapp://auth',
  ),
  child: MyApp(),
)

// Just call login - PKCE is automatic
YeboIDLoginButton(
  onSuccess: (user) => print('Logged in: ${user.displayName}'),
)
```

## Troubleshooting

### "Invalid code_verifier"

This error occurs when:
- The code verifier doesn't match the original code challenge
- The verifier was lost between the auth request and token exchange
- The verifier is too short (minimum 43 characters)

**Solution:** Ensure you're storing and retrieving the exact same verifier string.

### "code_challenge_method not supported"

YeboID only supports `S256` (SHA-256). The `plain` method is not allowed for security reasons.

### "code_challenge required"

PKCE is mandatory for all YeboID applications. Ensure you're including the `code_challenge` parameter in your authorization request.
