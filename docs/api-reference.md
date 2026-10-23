# REST API Reference

The first-party REST API behind YeboID's phone + OTP + PIN login and the
identity/account surface the YeboID app is built on.

For the OAuth 2.0 / OpenID Connect endpoints your app integrates against
(`/oauth/*`, discovery, JWKS), see the
[OAuth & OIDC reference](/api-reference/oauth) — that is the surface
third-party products should use.

::: warning Which surface should I use?
If you are integrating YeboID into your product, you almost certainly want
the [OAuth & OIDC endpoints](/api-reference/oauth), not the routes on this
page. The `/auth/*` and `/users/*` routes are the account-holder API: they
authenticate a **YeboID user directly** with a first-party token and are
what the YeboID login/account app itself calls. They do not accept OAuth
access tokens issued to your `client_id`.
:::

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.yeboid.com` |
| Development | `https://dev-api.yeboid.com` |

## Authentication

### Public endpoints

No authentication required:

- `GET /health`, `GET /ready`
- `POST /auth/start`, `POST /auth/otp/send`, `POST /auth/otp/verify`
- `POST /auth/login/pin`, `POST /auth/pin/reset`
- `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/recovery/*`
- `GET /auth/clients/:clientId/otp-mode`
- `GET /users/@:handle`, `GET /users/handle/check`, `GET /users/handle/suggestions`

### Protected endpoints

Everything else takes a first-party access token from
`/auth/otp/verify` or `/auth/login/pin`:

```http
Authorization: Bearer <accessToken>
```

Missing or malformed header → `401 { "success": false, "error": "Missing or
invalid authorization header" }`. Invalid or expired token → `401 { "success":
false, "error": "Invalid or expired token" }`.

## Request format

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
```

## Response format

Responses are **flat** — fields sit at the top level next to `success`.
There is no `data` envelope.

### Success

```json
{
  "success": true,
  "user": { "id": "..." }
}
```

### Error

`error` is a **human-readable string**, not an object. Machine-readable
`code` is present on the errors that define one; `retryAfterMs` appears on
rate-limit and lockout responses.

```json
{
  "success": false,
  "error": "Too many OTP requests. Try again later.",
  "code": "OTP_SEND_RATE_LIMITED",
  "retryAfterMs": 840000
}
```

Body validation failures (Zod) return `400` with a `details` array instead
of a `code`:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "phone", "message": "Invalid phone format" }]
}
```

Unhandled server faults return a deliberately generic
`500 { "success": false, "error": "Internal server error" }` — the detail
goes to Sentry and the server logs, never to the client.

---

## Health

### <span class="api-method get">GET</span> /health

Liveness. Does not touch the database.

```json
{ "status": "ok", "service": "yeboid", "version": "1.0.0" }
```

---

### <span class="api-method get">GET</span> /ready

Readiness — runs `SELECT 1` against Postgres.

```json
{ "status": "ready", "service": "yeboid", "version": "1.0.0" }
```

When the database is unreachable, `503`:

```json
{
  "status": "unavailable",
  "service": "yeboid",
  "version": "1.0.0",
  "error": "database_unreachable"
}
```

---

## Authentication

Login is always two calls: `/auth/start` decides *which* credential to ask
for, then either `/auth/login/pin` or `/auth/otp/verify` exchanges it for
tokens. Both token-minting endpoints also set the `yeboid_session` SSO
cookie, which is what lets `/oauth/authorize` mint codes for this user
later without a second login.

### <span class="api-method post">POST</span> /auth/start

First step of every login. Returns `pin` for a returning user who has set a
PIN; otherwise sends an OTP and returns `otp`, so the client can render the
code screen immediately.

**Request:**

```json
{ "phone": "+26878422613" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164, `+` followed by 10–15 digits |

**Response — PIN user:**

```json
{ "success": true, "mode": "pin" }
```

**Response — OTP user (code already sent):**

```json
{
  "success": true,
  "mode": "otp",
  "expiresIn": 300,
  "deliveredVia": "whatsapp"
}
```

`deliveredVia` is `"whatsapp"` or `"sms"`. The `pin` branch never burns the
OTP send budget.

**Errors:** `429 OTP_SEND_RATE_LIMITED` (with `retryAfterMs`).

---

### <span class="api-method get">GET</span> /auth/clients/:clientId/otp-mode

Lets a login screen know, before collecting a phone number, whether the
requesting OAuth client forces or forbids WhatsApp delivery — so it can
label the input correctly on first paint.

**Response:**

```json
{ "mode": "default" }
```

| `mode` | Meaning |
|--------|---------|
| `default` | WhatsApp first, SMS fallback |
| `whatsapp-required` | WhatsApp only; SMS fallback refused |
| `sms-only` | SMS only |

Always `200` — an unknown or deactivated `clientId` returns `default`
rather than an error, so this endpoint can't be used to enumerate the
client registry. A throttled caller gets `429 { "mode": "default" }`.

---

### <span class="api-method post">POST</span> /auth/otp/send

Send a login code. Usually unnecessary — `/auth/start` already sends one on
the `otp` branch. Use this to resend.

**Request:**

```json
{
  "phone": "+26878422613",
  "clientId": "yebo_1a2b3c...",
  "channel": "sms"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164 |
| `clientId` | string | No | OAuth client, so its WhatsApp flags apply |
| `channel` | string | No | Only `"sms"` is accepted — the sole channel a client may force |

**Response:**

```json
{
  "success": true,
  "message": "OTP sent",
  "expiresIn": 300,
  "deliveredVia": "sms"
}
```

**Errors:**

| Status | `code` | Meaning |
|--------|--------|---------|
| 400 | `WHATSAPP_REQUIRED` | Client requires WhatsApp; `channel: "sms"` refused |
| 429 | `OTP_SEND_RATE_LIMITED` | Per-phone or per-IP send budget spent |

---

### <span class="api-method post">POST</span> /auth/otp/verify

Exchange a code for tokens. **Creates the account** if the phone number is
new — this is the signup path; there is no separate signup endpoint.

**Request:**

```json
{ "phone": "+26878422613", "otp": "123456" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164 |
| `otp` | string | Yes | Exactly 6 digits |

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "clx...",
    "phone": "+26878422613",
    "handle": "laslie",
    "name": "Laslie Georges Jr.",
    "avatar": "https://...",
    "kycStatus": "VERIFIED"
  },
  "hasPin": false,
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "expiresIn": 900
}
```

`expiresIn` is the access token's lifetime in seconds (15 minutes).

**Errors:**

| Status | `code` | Meaning |
|--------|--------|---------|
| 401 | — | Invalid or expired OTP. Adds `attemptsRemaining` only at ≤2 left |
| 409 | `PIN_REQUIRED` | Account has a PIN — use `/auth/login/pin` or `/auth/pin/reset` |
| 429 | `OTP_LOCKED` | Too many wrong codes; the code is dead, request a new one |

---

### <span class="api-method post">POST</span> /auth/login/pin

Returning-user login with phone + PIN.

**Request:**

```json
{ "phone": "+26878422613", "pin": "123456" }
```

PINs are **exactly 6 digits**.

**Response:** identical shape to `/auth/otp/verify`, with `hasPin: true`.

**Errors:**

| Status | `code` | Meaning |
|--------|--------|---------|
| 401 | `PIN_INVALID` | Wrong PIN, or no such account. Adds `attemptsRemaining` at ≤2 left |
| 423 | `PIN_LOCKED` | 5 wrong attempts in 15 min. Recover via `/auth/pin/reset` |

Unknown phone and wrong PIN return the *same* error, so this endpoint can't
be used to test whether a number is registered.

---

### <span class="api-method post">POST</span> /auth/refresh

Rotate tokens.

**Request:**

```json
{ "refreshToken": "abc123..." }
```

**Response:**

```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "def456...",
  "expiresIn": 900
}
```

::: warning Token rotation
Refresh tokens rotate on every use — the token you sent is invalidated.
Persist the new `refreshToken` from the response or the next refresh fails.
:::

**Errors:** `401 { "error": "Invalid or expired refresh token" }`.

---

### <span class="api-method post">POST</span> /auth/logout

Revokes the refresh token (when supplied) and destroys the SSO session,
clearing the `yeboid_session` cookie.

**Request:** `refreshToken` is optional — `{}` is valid and still ends the
SSO session, which is what a browser-side "sign out" wants.

```json
{ "refreshToken": "abc123..." }
```

**Response:**

```json
{ "success": true, "message": "Logged out" }
```

---

## PIN management

### <span class="api-method get">GET</span> /auth/pin/status

**Auth required.** `{ "success": true, "hasPin": true }`

---

### <span class="api-method post">POST</span> /auth/pin/set

**Auth required.** Sets or replaces the PIN. Body `{ "pin": "123456" }`
(exactly 6 digits) → `{ "success": true, "message": "PIN set successfully" }`.

---

### <span class="api-method post">POST</span> /auth/pin/change

**Auth required.** Body `{ "currentPin": "123456", "newPin": "654321" }` →
`{ "success": true, "message": "PIN changed successfully" }`.

**Errors:** `401 PIN_INVALID`, `400 PIN_NOT_SET`, `429` with `retryAfterMs`.

---

### <span class="api-method post">POST</span> /auth/pin/verify

**Auth required.** Confirms a sensitive action. Does **not** issue tokens.

Body `{ "pin": "123456" }` → `{ "success": true, "valid": true }`.

**Errors:** `401 PIN_INVALID`, `400 PIN_NOT_SET`, `429` (5 attempts / 15 min).

---

### <span class="api-method post">POST</span> /auth/pin/reset

Forgotten-PIN recovery. Call `/auth/otp/send` first, then post the code
with the replacement PIN. No access token needed.

```json
{ "phone": "+26878422613", "otp": "123456", "newPin": "654321" }
```

**Errors:** `401` invalid/expired OTP, `429 OTP_LOCKED`.

---

## Account recovery (lost phone number)

For a user who no longer controls their login number. Both numbers must be
proven, and the request is either completed by an email code or queued for
human review.

### <span class="api-method post">POST</span> /auth/recovery/start

```json
{
  "phone": "+26878422613",
  "newPhone": "+26876543210",
  "note": "Lost my SIM"
}
```

`phone` is the lost number (the account identity), `newPhone` the one the
user controls now. `note` is optional free text for the reviewer.

**Response:**

```json
{
  "success": true,
  "requestId": "rec_abc123",
  "method": "EMAIL",
  "message": "Verification code sent to the new number.",
  "expiresIn": 300
}
```

`method` is `EMAIL` when the account has a **verified** email (recovery can
complete self-service) and `ADMIN` otherwise (an operator must approve).

**Errors:** `400 SAME_PHONE`, `403 ACCOUNT_DISABLED`, `404` no account,
`409 PHONE_TAKEN`, `429 RATE_LIMITED` / `OTP_SEND_RATE_LIMITED`.

---

### <span class="api-method post">POST</span> /auth/recovery/verify-phone

Proves control of `newPhone` with the code sent above. Returns
`status: "awaiting_email"` when an email code follows, or
`status: "awaiting_review"` when it goes to an operator.

---

### <span class="api-method post">POST</span> /auth/recovery/verify-email

Final step of the `EMAIL` path — the code sent to the account's verified
address.

---

## Users

The `/users/*` routes — profile, handles, email verification, sessions,
connected apps, phone-number change and account deletion — have their own
page: **[User Management](/api-reference/users)**.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /users/me` | User token | Authenticated user's profile |
| `PATCH /users/me` | User token | Update `name`, `email`, `avatar`, `handle` |
| `DELETE /users/me` | User token + fresh re-auth | Permanent hard delete |
| `GET /users/@:handle` | Public | Public profile card |
| `GET /users/handle/check` | Public | Handle availability |
| `GET /users/handle/suggestions` | Public | Suggested available handles |
| `POST /users/me/email/verify/request` | User token | Email a 6-digit code |
| `POST /users/me/email/verify/confirm` | User token | Confirm the code |
| `GET /users/me/sessions` | User token | List active sessions |
| `DELETE /users/me/sessions` | User token | Log out everywhere |
| `DELETE /users/me/sessions/:id` | User token | Revoke one session |
| `GET /users/me/connected-apps` | User token | Authorized OAuth apps |
| `DELETE /users/me/connected-apps/:clientId` | User token | Disconnect an app |
| `POST /users/me/phone/change/request` | User token | Start a phone change |
| `POST /users/me/phone/change/confirm` | User token + fresh re-auth | Commit it |

---

## KYC

KYC is served by the `/verification/*` routes. See
[KYC with YeboVerify](/kyc-integration) for the full flow.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /verification/start` | User token | Open a verification session, returns `verifyUrl` |
| `GET /verification/status` | User token | Poll `kycStatus` + decrypted `kycData` |
| `POST /verification/webhook` | HMAC | Inbound from YeboVerify — not for your app |

Third-party OAuth apps should read KYC state from
[`GET /oauth/userinfo`](/api-reference/oauth) with the `kyc` / `kyc:full`
scope, or subscribe to the `user.kyc.verified` and `user.kyc.rejected`
[webhooks](/webhooks) — not by calling `/verification/*`.

---

## Error codes

Codes actually emitted by these routes. Errors without a `code` carry only
`error` (a message) — always branch on the HTTP status first.

| Code | HTTP | Description |
|------|------|-------------|
| `WHATSAPP_REQUIRED` | 400 | Client mandates WhatsApp; SMS fallback refused |
| `NO_EMAIL` | 400 | No email address on file to verify |
| `INVALID_CODE` | 400 | Wrong or expired email verification code |
| `SAME_PHONE` | 400 | New number equals the current one |
| `HANDLE_INVALID` | 400 | Handle fails format/length rules |
| `PIN_NOT_SET` | 400 | Action needs a PIN the user hasn't set |
| `PIN_REQUIRED` | 400 | PIN required to confirm this action |
| `OTP_REQUIRED` | 400 | Verification code required to confirm this action |
| `PIN_INVALID` | 401 | Wrong PIN |
| `OTP_INVALID` | 401 | Wrong or expired code on a re-auth step |
| `PIN_REQUIRED` | 409 | On `/auth/otp/verify`: account has a PIN, use PIN login |
| `ACCOUNT_DISABLED` | 403 | Account is banned |
| `account_disabled` | 403 | Same condition on the OAuth paths (OAuth-style casing) |
| `HANDLE_TAKEN` | 409 | Handle already taken or reserved |
| `PHONE_TAKEN` | 409 | Phone already belongs to another account |
| `ALREADY_VERIFIED` | 409 | Email already verified / user already KYC-verified |
| `PIN_LOCKED` | 423 | PIN login locked after repeated failures |
| `OTP_SEND_RATE_LIMITED` | 429 | Send budget spent (per phone or per IP) |
| `OTP_LOCKED` | 429 | Code locked after too many wrong guesses |
| `RATE_LIMITED` | 429 | Generic per-user attempt limiter |

---

## Rate limits

| Surface | Limit | Window |
|---------|-------|--------|
| OTP send, per phone | 3 | 15 min |
| OTP send, per IP | 15 | 15 min |
| OTP verify, per code | 5 wrong guesses | code locked 15 min |
| `POST /auth/login/pin`, per phone | 5 | 15 min → `423 PIN_LOCKED` |
| `POST /auth/pin/verify` + `/pin/change`, per user | 5 | 15 min |
| Email verify send, per user | 3 | 15 min |
| Email verify confirm, per user | 5 | 15 min |
| Account delete + phone-change confirm, per user | 5 | 15 min |
| `GET /auth/clients/:clientId/otp-mode`, per IP | 60 | 5 min |

The OTP send budget is **shared** across `/auth/start`, `/auth/otp/send`
and `/users/me/phone/change/request`, so one number can't be bombed by
spreading sends across endpoints.

::: warning No rate-limit headers
The API does not emit `X-RateLimit-*` headers. Read `retryAfterMs` from the
429 body instead.
:::

Most limiters are in-memory per Cloud Run instance, so the effective
ceiling across `N` instances is `limit × N`. The brute-force-critical
control — the OTP verify lockout — is database-backed and therefore exact.

---

## SDKs

- [Node.js SDK](/node-sdk/) — Express middleware + token verification for backends
- [Web / React SDK](/web-sdk/) — browser PKCE flow with React bindings
- [Flutter SDK](/flutter-sdk/) — official Flutter package

## Delegated permissions

Use [the permissions matrix](/permissions) before calling personal or business endpoints. App tokens cannot administer global sessions, credentials, OAuth applications, or webhook subscriptions. Profile writes require `profile:write`, and verification status does not disclose full identity data without `kyc:full`. A KYC-owned name is read-only.
