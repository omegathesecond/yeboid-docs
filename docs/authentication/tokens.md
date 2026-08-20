# Token Management

YeboID uses JWT (JSON Web Tokens) for authentication. Understanding how to manage tokens is essential for building secure applications.

## Token Types

| Token | Purpose | Lifetime | Storage |
|-------|---------|----------|---------|
| Access Token | API authentication | 15 minutes | Memory |
| Refresh Token | Get new access tokens | 60 days | Secure storage |
| ID Token | User identity claims | 1 hour | Optional |

## Access Token

The access token is a signed JWT used to authenticate API requests:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-123"
  },
  "payload": {
    "iss": "https://api.yeboid.com",
    "sub": "usr_abc123",
    "aud": "your-client-id",
    "exp": 1709254800,
    "iat": 1709251200,
    "scope": "openid profile phone"
  }
}
```

### Claims

| Claim | Description |
|-------|-------------|
| `iss` | Issuer (`https://api.yeboid.com` in production) |
| `sub` | Subject (user ID) |
| `aud` | Audience (your client ID) |
| `exp` | Expiration timestamp |
| `iat` | Issued at timestamp |
| `scope` | Granted scopes |

## Refresh Token

Refresh tokens allow you to obtain new access tokens without requiring user interaction:

```bash
POST https://api.yeboid.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=YOUR_REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
```

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "new-refresh-token...",
  "scope": "openid profile phone"
}
```

::: warning Refresh Token Rotation
YeboID uses single-use refresh token rotation. Each time you use a refresh token, a new
one is issued and the old one is invalidated — always store the new refresh token.
Presenting an already-used refresh token is treated as token theft: the **entire** token
family for that grant is revoked.
:::

::: tip Down-scoping
You may pass a `scope` parameter on a refresh to request a **narrower** set of scopes
than originally granted. You can never widen scope on refresh — that fails with
`invalid_scope`.
:::

## ID Token

The ID token contains identity claims about the authenticated user:

```json
{
  "iss": "https://api.yeboid.com",
  "sub": "usr_abc123",
  "aud": "your-client-id",
  "exp": 1709254800,
  "iat": 1709251200,
  "auth_time": 1709251180,
  "nonce": "random-nonce",
  "name": "John Doe",
  "preferred_username": "johndoe",
  "picture": "https://api.yeboid.com/avatars/usr_abc123.jpg",
  "phone_number": "+26878422613",
  "phone_number_verified": true,
  "kyc_status": "VERIFIED"
}
```

## Token Storage

### Flutter (Recommended)

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  final _storage = FlutterSecureStorage();
  
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? idToken,
  }) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
    if (idToken != null) {
      await _storage.write(key: 'id_token', value: idToken);
    }
  }
  
  Future<String?> getAccessToken() => _storage.read(key: 'access_token');
  Future<String?> getRefreshToken() => _storage.read(key: 'refresh_token');
  
  Future<void> clearTokens() => _storage.deleteAll();
}
```

### Web Applications

For web applications, consider:

- **Access tokens:** Store in memory only (JavaScript variable)
- **Refresh tokens:** Use `httpOnly` cookies set by your backend

```javascript
// Don't do this:
localStorage.setItem('access_token', token); // ❌ Vulnerable to XSS

// Do this instead:
let accessToken = null; // ✅ Memory only

function setAccessToken(token) {
  accessToken = token;
}

function getAccessToken() {
  return accessToken;
}
```

## Token Refresh Strategy

Implement proactive token refresh to avoid failed requests:

```dart
class TokenManager {
  String? _accessToken;
  DateTime? _expiresAt;
  
  bool get isExpired => 
    _expiresAt == null || 
    DateTime.now().isAfter(_expiresAt!.subtract(Duration(minutes: 5)));
  
  Future<String> getValidAccessToken() async {
    if (isExpired) {
      await _refreshTokens();
    }
    return _accessToken!;
  }
  
  Future<void> _refreshTokens() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null) throw AuthException('No refresh token');
    
    final response = await http.post(
      Uri.parse('https://api.yeboid.com/oauth/token'),
      body: {
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken,
        'client_id': clientId,
      },
    );
    
    final data = jsonDecode(response.body);
    _accessToken = data['access_token'];
    _expiresAt = DateTime.now().add(
      Duration(seconds: data['expires_in']),
    );
    
    // Store new refresh token (rotation)
    await _storage.saveRefreshToken(data['refresh_token']);
  }
}
```

## Token Verification

### Verify on Your Backend

Always verify tokens on your backend before trusting them:

```javascript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://api.yeboid.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
});

async function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  const key = await client.getSigningKey(decoded.header.kid);
  
  return jwt.verify(token, key.getPublicKey(), {
    issuer: 'https://api.yeboid.com',
    audience: 'your-client-id',
  });
}
```

::: tip Use the SDK instead
The [Node.js SDK](/node-sdk/) does this verification for you — JWKS fetch, caching, and
`issuer`/`audience` checks — via `yeboid.authenticate()`. Hand-rolling JWKS verification
is only necessary if you can't use the SDK.
:::

### JWKS Endpoint

Fetch public keys to verify token signatures:

```
GET https://api.yeboid.com/.well-known/jwks.json
```

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id-123",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7agoebGc...",
      "e": "AQAB"
    }
  ]
}
```

## Logout

To log out a user, revoke their tokens and clear local storage:

```dart
Future<void> logout() async {
  final refreshToken = await _storage.getRefreshToken();
  
  // Revoke on server
  if (refreshToken != null) {
    await http.post(
      Uri.parse('https://api.yeboid.com/oauth/revoke'),
      body: {
        'token': refreshToken,
        'client_id': clientId,
      },
    );
  }
  
  // Clear local storage
  await _storage.clearTokens();
  _accessToken = null;
  _expiresAt = null;
}
```

## Security Best Practices

1. **Never store access tokens in localStorage** - Use memory or secure storage
2. **Implement token refresh proactively** - Refresh before expiration
3. **Handle refresh token rotation** - Always save new refresh tokens
4. **Verify tokens on your backend** - Don't trust client-side verification alone
5. **Revoke tokens on logout** - Prevent token reuse
6. **Use short access token lifetimes** - Limits impact of token theft
