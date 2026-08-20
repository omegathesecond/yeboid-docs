# User Management

The `/users/*` routes: profile, handle, email verification, sessions,
connected apps, phone-number change, and account deletion.

::: warning First-party surface
These routes authenticate a **YeboID account holder** with a first-party
access token from `/auth/otp/verify` or `/auth/login/pin`. They do not
accept OAuth access tokens issued to your `client_id`.

If you are integrating YeboID into your product, read profile data from
[`GET /oauth/userinfo`](/api-reference/oauth) instead — that is the
scope-gated surface built for third parties.
:::

Base URLs and the shared request/response/error envelope are documented on
the [REST API Reference](/api-reference).

## The user object

`GET /users/me` and `PATCH /users/me` return this projection:

```json
{
  "success": true,
  "user": {
    "id": "clx...",
    "phone": "+26878422613",
    "handle": "laslie",
    "name": "Laslie Georges Jr.",
    "email": "laslie@example.com",
    "avatar": "https://...",
    "emailVerified": true,
    "emailVerifiedAt": "2026-03-18T20:00:00.000Z",
    "kycStatus": "VERIFIED",
    "createdAt": "2026-03-01T10:00:00.000Z"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable YeboID user id. This is the FK products store |
| `phone` | string | E.164. Also the login identity |
| `handle` | string \| null | Public username, `[a-z0-9_]`, 3–30 chars |
| `name` | string \| null | Display name |
| `email` | string \| null | Email address |
| `avatar` | string \| null | Avatar URL |
| `emailVerified` | boolean | Whether `email` has been confirmed |
| `emailVerifiedAt` | string \| null | ISO 8601 timestamp |
| `kycStatus` | string | `NONE`, `PENDING`, `VERIFIED`, `REJECTED` |
| `createdAt` | string | ISO 8601 timestamp |

::: tip Fields that don't exist
There is no `bio`, `language`, `phone_verified`, `updated_at`, or free-form
`metadata` on the user object, and no avatar **upload** endpoint — `avatar`
is a URL you set yourself via `PATCH /users/me`. Country is resolved
server-side from KYC (falling back to the phone prefix) and is not part of
this projection.
:::

## Profile

### <span class="api-method get">GET</span> /users/me

**Auth required.** Returns the object above.

```bash
curl https://api.yeboid.com/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Errors:** `401` missing/invalid token, `404` user not found.

---

### <span class="api-method patch">PATCH</span> /users/me

**Auth required.** All fields optional — send only what changes.

```bash
curl -X PATCH https://api.yeboid.com/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Laslie G.", "handle": "laslie"}'
```

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | string | 1–100 characters |
| `email` | string | Valid email address |
| `avatar` | string | Absolute URL |
| `handle` | string | 3–30 chars, lowercase `a-z`, `0-9`, `_` only |

**Response:** the same `{ success, user }` shape as `GET /users/me`.

::: warning Changing `email` resets verification
Writing a different address clears `emailVerified` and `emailVerifiedAt` —
a stale "verified" flag must never carry over to a new address. Re-run the
email verification flow afterwards.
:::

**Errors:**

| Status | `code` | Meaning |
|--------|--------|---------|
| 409 | `HANDLE_TAKEN` | Taken or reserved — refetch suggestions |
| 400 | `HANDLE_INVALID` | Format or length problem — show inline |

## Handles

### <span class="api-method get">GET</span> /users/@:handle

Public profile lookup. **No authentication.**

```bash
curl https://api.yeboid.com/users/@laslie
```

```json
{
  "success": true,
  "user": {
    "id": "clx...",
    "handle": "laslie",
    "name": "Laslie Georges Jr.",
    "avatar": "https://...",
    "verified": true,
    "createdAt": "2026-03-01T10:00:00.000Z"
  }
}
```

::: tip Why `verified` and not `kycStatus`
Phone and email never appear in a public profile, and the raw enum is
deliberately withheld. `NONE`, `PENDING` and `REJECTED` all collapse to
`verified: false`, so an anonymous caller who can enumerate handles cannot
turn that into a map of who submitted a government ID and was rejected, or
who is mid-review.
:::

**Errors:** `404` user not found.

---

### <span class="api-method get">GET</span> /users/handle/check

Availability check. **No authentication.**

**Query:** `?handle=<handle>` — required, `400` if absent.

```bash
curl "https://api.yeboid.com/users/handle/check?handle=newhandle"
```

```json
{
  "success": true,
  "handle": "newhandle",
  "available": true,
  "reason": null
}
```

`reason` carries the explanation when `available` is `false` — taken,
reserved, or a format problem.

---

### <span class="api-method get">GET</span> /users/handle/suggestions

Available-handle suggestions for a claim-handle screen. **No authentication.**

**Query:** `?count=4` — clamped to 3–5, default 4.

```json
{ "success": true, "suggestions": ["swift_lion", "bold_river"] }
```

Availability is checked when the suggestions are generated, so one can
still lose a race — always handle `409 HANDLE_TAKEN` from `PATCH /users/me`.

## Email verification

Two-step, OTP-based confirmation. The code is emailed via YeboLink.

### <span class="api-method post">POST</span> /users/me/email/verify/request

**Auth required.** Sends a 6-digit code to the user's current address.

```json
{ "success": true, "email": "laslie@example.com", "expiresIn": 300 }
```

**Errors:** `400 NO_EMAIL` (nothing on file), `409 ALREADY_VERIFIED`,
`429 RATE_LIMITED` (3 sends / 15 min, with `retryAfterMs`).

A `400`/`409` short-circuit does not burn the send quota.

---

### <span class="api-method post">POST</span> /users/me/email/verify/confirm

**Auth required.** Body `{ "code": "123456" }` — exactly 6 digits.

```json
{ "success": true, "emailVerified": true }
```

Idempotent: confirming an already-verified address succeeds without
consuming a code.

**Errors:** `400 INVALID_CODE`, `400 NO_EMAIL`, `429 RATE_LIMITED`
(5 attempts / 15 min).

## Sessions

SSO sessions live up to 60 days, so a leaked session cookie has real blast
radius. Every route here is scoped to the caller — you can only ever see or
kill your **own** sessions.

### <span class="api-method get">GET</span> /users/me/sessions

**Auth required.** Returns a **bare array**, not a `{ success }` envelope.

```json
[
  {
    "id": "ses_abc123",
    "device": "Chrome on macOS",
    "location": null,
    "lastActive": "2026-03-15T10:00:00.000Z",
    "current": true
  }
]
```

| Field | Description |
|-------|-------------|
| `device` | Derived from the User-Agent; `"Unknown device"` when unparseable |
| `location` | Always absent — no geo-IP service is wired, and YeboID does not invent one |
| `lastActive` | When the session was **established**; per-request activity is not tracked |
| `current` | Marks the session whose cookie made this request, so the UI can disable self-revocation |

---

### <span class="api-method delete">DELETE</span> /users/me/sessions

**Auth required.** Log out everywhere — destroys every session **and**
revokes every refresh token, including the caller's own. The client must
re-authenticate afterwards.

```json
{ "success": true, "message": "Logged out everywhere", "sessionsDestroyed": 3 }
```

Emits one bulk `session.destroyed` [webhook](/webhooks) with `all: true`.

---

### <span class="api-method delete">DELETE</span> /users/me/sessions/:id

**Auth required.** Revoke a single session. The delete is scoped to
`(id, userId)`, so an id you don't own yields `404` rather than touching
someone else's session.

```json
{ "success": true, "message": "Session revoked" }
```

## Connected apps

### <span class="api-method get">GET</span> /users/me/connected-apps

**Auth required.** OAuth apps the user has authorized. Bare array.

```json
[
  {
    "clientId": "yid_abc123",
    "name": "YeboShops",
    "icon": "https://...",
    "scopes": ["openid", "profile", "phone"],
    "authorizedAt": "2026-03-01T10:00:00.000Z"
  }
]
```

---

### <span class="api-method delete">DELETE</span> /users/me/connected-apps/:clientId

**Auth required.** Disconnect an app — revokes the consent grant **and**
that app's refresh tokens, so it cannot silently continue. Keyed by the
public `clientId` the UI already holds, not the internal app id.

```json
{ "success": true, "message": "App disconnected" }
```

**Errors:** `404` unknown client, or no active grant for it.

## Changing the phone number

The phone number **is** the login credential. A user who swaps SIM with no
way to update it would be permanently locked out, so this exists — as a
two-step, doubly-authenticated flow. Both numbers must be proven: the
existing credential stops a thief who holds only the new SIM.

### <span class="api-method post">POST</span> /users/me/phone/change/request

**Auth required.** Validates and uniqueness-checks the new number, sends it
a code, and pins it to the user as `pendingPhone`. The live `phone` is
untouched.

```json
{ "newPhone": "+26876543210" }
```

**Response:**

```json
{
  "success": true,
  "message": "Verification code sent to the new number",
  "expiresIn": 300
}
```

**Errors:** `400 SAME_PHONE`, `409 PHONE_TAKEN`,
`429 OTP_SEND_RATE_LIMITED`. The send shares the login OTP budget, so this
endpoint can't be used to bypass send limits.

---

### <span class="api-method post">POST</span> /users/me/phone/change/confirm

**Auth required.** Commits the swap. Requires the code that landed on the
**new** number *and* fresh re-auth on the **existing** credential.

```json
{ "otp": "123456", "pin": "654321" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `otp` | string | Yes | 6 digits, sent to the new number |
| `pin` | string | Conditional | Required when the user has a PIN |
| `currentPhoneOtp` | string | Conditional | Required when they don't — send to the **current** number first |

On success the number is swapped, country is re-derived, the change is
audited, and `user.updated` is emitted.

**Errors:** `429 RATE_LIMITED` (5 attempts / 15 min).

## Deleting an account

### <span class="api-method delete">DELETE</span> /users/me

**Auth required, plus fresh re-auth in the same request** — a valid session
alone is not enough.

```bash
curl -X DELETE https://api.yeboid.com/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456"}'
```

Users **without** a PIN send `{ "otp": "123456" }` instead, after calling
`POST /auth/otp/send` for their number.

**Response:**

```json
{ "success": true, "message": "Account deleted", "webhookDelivered": true }
```

`webhookDelivered` reports plainly whether the `user.deleted` fan-out
succeeded. The account is gone either way — the failure is surfaced, not
swallowed.

::: danger Irreversible and immediate
This is a **hard delete**. There is no soft-delete and no grace period. The
user row is removed and Postgres cascades erase sessions, refresh tokens,
OTP and email-verification codes, OAuth authorization codes, access grants,
and the user's own OAuth apps.

Hard delete was chosen over anonymisation deliberately: YeboID is the
canonical PII store, so the strongest guarantee it can give downstream
products is that the data is *gone*, not merely hidden. Audit rows survive
with the user FK set to null, preserving the deletion record without
retaining PII.
:::

**Errors:**

| Status | `code` | Meaning |
|--------|--------|---------|
| 400 | `PIN_REQUIRED` | User has a PIN and none was supplied |
| 400 | `OTP_REQUIRED` | User has no PIN and no code was supplied |
| 401 | `PIN_INVALID` | Wrong PIN |
| 401 | `OTP_INVALID` | Wrong or expired code |
| 429 | `RATE_LIMITED` | 5 attempts / 15 min |

::: tip Purge your own references
Subscribe to the `user.deleted` [webhook](/webhooks) so your product drops
its `yeboid_user_id` rows when an account is erased.
:::
