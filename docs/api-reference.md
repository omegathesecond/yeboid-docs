# REST API Reference

RESTful API for YeboID phone+OTP authentication and identity management. For the OAuth 2.0
/ OpenID Connect endpoints (`/oauth/*`, discovery, JWKS), see the
[OAuth & OIDC reference](/api-reference/oauth).

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.yeboid.com` |
| Development | `https://dev-api.yeboid.com` |

## Authentication

### Public Endpoints

No authentication required:
- `POST /auth/*` (except logout)
- `GET /users/@:handle`
- `GET /users/handle/check`
- `GET /health`

### Protected Endpoints

Include the access token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

## Request Format

```http
Content-Type: application/json
Authorization: Bearer <token>
X-Request-ID: <uuid>   # Optional, for tracing
```

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

---

## Health

### <span class="api-method get">GET</span> /health

Check API status.

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-18T20:00:00Z"
}
```

---

## Authentication

### <span class="api-method post">POST</span> /auth/otp/send

Send OTP to phone number.

**Request:**

```json
{
  "phone": "+26878422613",
  "purpose": "signup"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164 format |
| `purpose` | string | Yes | `signup` or `pin_reset` |

**Response:**

```json
{
  "success": true,
  "data": {
    "expires_in": 300,
    "message": "OTP sent to +268****613"
  }
}
```

---

### <span class="api-method post">POST</span> /auth/otp/verify

Verify OTP code.

**Request:**

```json
{
  "phone": "+26878422613",
  "code": "123456",
  "purpose": "signup"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "verified": true,
    "temp_token": "eyJ...",
    "expires_in": 600
  }
}
```

---

### <span class="api-method post">POST</span> /auth/signup

Create account after OTP verification.

**Request:**

```json
{
  "temp_token": "eyJ...",
  "pin": "1234",
  "handle": "laslie",
  "name": "Laslie Georges Jr."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `temp_token` | string | Yes | From OTP verify |
| `pin` | string | Yes | 4-6 digits |
| `handle` | string | Yes | 3-30 chars, lowercase |
| `name` | string | No | Display name |

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+26878422613",
      "handle": "laslie",
      "name": "Laslie Georges Jr.",
      "avatar_url": null,
      "kyc_status": "none",
      "created_at": "2026-03-18T20:00:00Z"
    },
    "access_token": "eyJ...",
    "refresh_token": "abc123...",
    "expires_in": 900
  }
}
```

---

### <span class="api-method post">POST</span> /auth/signin

Sign in with phone and PIN.

**Request:**

```json
{
  "phone": "+26878422613",
  "pin": "1234"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "access_token": "eyJ...",
    "refresh_token": "abc123...",
    "expires_in": 900
  }
}
```

---

### <span class="api-method post">POST</span> /auth/refresh

Refresh access token.

**Request:**

```json
{
  "refresh_token": "abc123..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "def456...",
    "expires_in": 900
  }
}
```

::: warning Token Rotation
Refresh tokens are rotated on each use. The old token is invalidated.
:::

---

### <span class="api-method post">POST</span> /auth/logout

Revoke refresh token.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "refresh_token": "abc123..."
}
```

---

## Users

### <span class="api-method get">GET</span> /users/me

Get authenticated user's profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "+26878422613",
    "phone_verified": true,
    "handle": "laslie",
    "name": "Laslie Georges Jr.",
    "avatar_url": "https://...",
    "bio": "Building the future of Africa",
    "country": "SZ",
    "language": "en",
    "kyc_status": "verified",
    "kyc_country": "SZ",
    "kyc_verified_at": "2026-03-18T20:00:00Z",
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-18T20:00:00Z"
  }
}
```

---

### <span class="api-method patch">PATCH</span> /users/me

Update user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "name": "Laslie G.",
  "bio": "CEO @ Omevision",
  "avatar_url": "https://...",
  "language": "en"
}
```

All fields optional. Only include fields to update.

---

### <span class="api-method get">GET</span> /users/@:handle

Get public profile by handle.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "handle": "laslie",
    "name": "Laslie Georges Jr.",
    "avatar_url": "https://...",
    "bio": "Building the future of Africa",
    "kyc_status": "verified",
    "created_at": "2026-03-01T10:00:00Z"
  }
}
```

::: tip Privacy
Phone, country, and language are NOT included in public profiles.
:::

---

### <span class="api-method get">GET</span> /users/handle/check

Check handle availability.

**Query:** `?handle=<handle>`

**Response:**

```json
{
  "success": true,
  "data": {
    "handle": "newhandle",
    "available": true
  }
}
```

---

### <span class="api-method delete">DELETE</span> /users/me

Delete account permanently.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "pin": "1234",
  "confirmation": "DELETE MY ACCOUNT"
}
```

::: danger Irreversible
This action is irreversible. Data is hard-deleted after 30 days.
:::

---

## Sessions

### <span class="api-method get">GET</span> /sessions

List active sessions.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "device_name": "iPhone 15 Pro",
        "platform": "ios",
        "ip_address": "102.xxx.xxx.xxx",
        "last_used_at": "2026-03-18T20:00:00Z",
        "created_at": "2026-03-15T10:00:00Z",
        "current": true
      }
    ],
    "total": 1
  }
}
```

---

### <span class="api-method delete">DELETE</span> /sessions/:id

Revoke a session.

**Headers:** `Authorization: Bearer <access_token>`

---

## KYC

### <span class="api-method get">GET</span> /kyc/status

Get KYC verification status.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "verified",
    "verified_at": "2026-03-18T20:00:00Z",
    "level": "standard",
    "documents": ["id_card"]
  }
}
```

---

### <span class="api-method post">POST</span> /kyc/initiate

Start KYC verification.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "verification_url": "https://verify.yeboid.com/session/abc123",
    "expires_in": 1800
  }
}
```

Redirect user to `verification_url` to complete KYC.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request |
| `INVALID_PHONE` | 400 | Invalid phone format |
| `INVALID_PIN` | 400 | PIN doesn't meet requirements |
| `INVALID_HANDLE` | 400 | Invalid handle format |
| `INVALID_OTP` | 400 | Wrong OTP code |
| `OTP_EXPIRED` | 400 | OTP has expired |
| `INVALID_CREDENTIALS` | 401 | Wrong phone or PIN |
| `INVALID_TOKEN` | 401 | Access token invalid |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid |
| `ACCOUNT_LOCKED` | 403 | Account temporarily locked |
| `FORBIDDEN` | 403 | Not allowed |
| `NOT_FOUND` | 404 | Resource not found |
| `PHONE_NOT_FOUND` | 404 | Phone not registered |
| `HANDLE_TAKEN` | 409 | Handle already in use |
| `HANDLE_RESERVED` | 409 | Handle is reserved |
| `PHONE_EXISTS` | 409 | Phone already registered |
| `HANDLE_COOLDOWN` | 429 | Must wait between handle changes |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/otp/send` | 3 | 1 hour |
| `POST /auth/signin` | 5 | 15 minutes |
| `POST /auth/otp/verify` | 5 | per code |
| `GET /users/handle/check` | 30 | 1 minute |
| All other endpoints | 100 | 1 minute |

**Response headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710770000
```

---

## SDKs

- [Node.js SDK](/node-sdk/) — Express middleware + token verification for backends
- [Web / React SDK](/web-sdk/) — browser PKCE flow with React bindings
- [Flutter SDK](/flutter-sdk/) — official Flutter package

---

*API Version: 1.0*
