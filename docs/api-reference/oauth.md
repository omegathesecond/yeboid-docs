# OAuth & OIDC API Reference

YeboID is an OAuth 2.0 + OpenID Connect provider. This page documents the OAuth/OIDC
endpoints. For the phone+OTP account REST API (sign-up, sessions, profile), see the
[REST Endpoints](/api-reference) reference.

## Base URLs

| Environment | API base | Login / authorize UI |
|-------------|----------|----------------------|
| Production | `https://api.yeboid.com` | `https://yeboid.com` |
| Development | `https://dev-api.yeboid.com` | — |

There are **two** `/oauth/authorize` URLs, and the distinction matters:

- `https://yeboid.com/oauth/authorize` — the hosted **HTML login UI**. This is where you send
  the user's **browser** to start an interactive login.
- `https://api.yeboid.com/oauth/authorize` — the **JSON protocol endpoint** the login UI calls.
  When the user has no active session it returns a JSON payload (`requiresLogin: true`) describing
  the app and requested scopes; the hosted UI renders that and POSTs the result back to it.

The OIDC discovery document advertises `authorization_endpoint` as the API-host value
(`https://api.yeboid.com/oauth/authorize`) — that is the literal value the server returns, shown
verbatim below.

::: warning Don't redirect a browser to the API host
A discovery-driven OIDC client library will read `authorization_endpoint` and redirect the browser
straight to `https://api.yeboid.com/oauth/authorize`, which renders as a **blank page of raw JSON**.
For interactive browser flows, point users at the hosted login UI
`https://yeboid.com/oauth/authorize` instead (this is what the [PKCE walkthrough](/authentication/pkce)
and the SDKs do). All other endpoints (`token`, `userinfo`, `revoke`, `logout`, `introspect`, `jwks`)
are on the API host as advertised.
:::

## Discovery

### <span class="api-method get">GET</span> /.well-known/openid-configuration

Returns the OIDC discovery document — the canonical, machine-readable list of endpoints,
supported scopes, claims, and algorithms. Most OIDC client libraries read this
automatically.

```json
{
  "issuer": "https://api.yeboid.com",
  "authorization_endpoint": "https://api.yeboid.com/oauth/authorize",
  "token_endpoint": "https://api.yeboid.com/oauth/token",
  "userinfo_endpoint": "https://api.yeboid.com/oauth/userinfo",
  "revocation_endpoint": "https://api.yeboid.com/oauth/revoke",
  "end_session_endpoint": "https://api.yeboid.com/oauth/logout",
  "introspection_endpoint": "https://api.yeboid.com/oauth/introspect",
  "jwks_uri": "https://api.yeboid.com/.well-known/jwks.json",
  "registration_endpoint": "https://api.yeboid.com/apps",
  "response_types_supported": ["code"],
  "response_modes_supported": ["query"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "code_challenge_methods_supported": ["S256", "plain"],
  "scopes_supported": ["openid", "profile", "profile:write", "phone", "email", "kyc", "kyc:full"],
  "claims_supported": ["sub", "iss", "aud", "iat", "exp", "auth_time", "nonce", "name", "preferred_username", "picture", "phone_number", "phone_number_verified", "email", "email_verified", "kyc_status", "kyc_data", "country", "currency", "currency_symbol"]
}
```

::: tip Verify locally first
Access tokens are self-contained RS256 JWTs — the fastest, network-free way to validate
one is to verify its signature against the [JWKS](#jwks) (see
[Token verification](#token-verification)). For cases where you need to confirm a token is
still *live* (e.g. a refresh token, or an access token whose grant may have been revoked
mid-lifetime), use the [introspection endpoint](#introspect). Revoke tokens with
[`/oauth/revoke`](#revoke), and terminate the user's SSO session with
[`/oauth/logout`](#end-session).
:::

### <span class="api-method get">GET</span> /.well-known/jwks.json {#jwks}

Returns the RSA public keys (JWK Set) used to verify YeboID-signed JWTs. Tokens are signed
with `RS256`.

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "yeboid-key-2",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7agoebGc...",
      "e": "AQAB"
    }
  ]
}
```

## Authorization

### <span class="api-method get">GET</span> /oauth/authorize

Start the authorization-code flow. PKCE is required for public clients. Redirect the user
to `https://yeboid.com/oauth/authorize` with these query parameters:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `response_type` | Yes | Always `code`. |
| `client_id` | Yes | Your app's client ID. |
| `redirect_uri` | Yes | Must exactly match a registered redirect URI. |
| `scope` | No | Space-separated [scopes](/authentication/#available-scopes). Defaults to `openid profile`. |
| `state` | Recommended | Opaque value echoed back, for CSRF protection. |
| `code_challenge` | Yes (PKCE) | Base64URL SHA-256 of your `code_verifier`. |
| `code_challenge_method` | Yes (PKCE) | `S256` (recommended) or `plain`. |
| `nonce` | No | Bound into the `id_token` for replay protection. |
| `prompt` | No | `none`, `login`, or `consent`. `none` errors with `login_required` / `consent_required` if interaction would be needed. |

On approval, YeboID redirects to your `redirect_uri` with `?code=<code>&state=<state>`.
On denial, it redirects with `?error=access_denied`.

## Token

### <span class="api-method post">POST</span> /oauth/token

Exchange an authorization code for tokens, or refresh an existing token set. Accepts
`application/json` or `application/x-www-form-urlencoded`. The `grant_type` selects the
mode.

**Authorization code grant**

| Field | Required | Description |
|-------|----------|-------------|
| `grant_type` | Yes | `authorization_code` |
| `code` | Yes | The authorization code. |
| `redirect_uri` | Yes | Must match the value used at `/oauth/authorize`. |
| `client_id` | Yes | Your app's client ID. |
| `code_verifier` | Yes (PKCE) | The original PKCE verifier. |
| `client_secret` | Confidential clients | Required for server-side (confidential) clients. |

**Refresh token grant**

| Field | Required | Description |
|-------|----------|-------------|
| `grant_type` | Yes | `refresh_token` |
| `refresh_token` | Yes | A valid, un-rotated refresh token. |
| `client_id` | Yes | Your app's client ID. |
| `scope` | No | Request a **narrower** scope set than granted. Widening fails with `invalid_scope`. |
| `client_secret` | Confidential clients | Required for confidential clients. |

**Response**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "f3a1...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile phone"
}
```

Access tokens are JWTs that live **15 minutes** (`expires_in` = `900`). Refresh tokens are
opaque, live **60 days**, and are **rotated on every use** — always persist the new one.
Reusing a rotated refresh token revokes the whole token family. See
[Tokens](/authentication/tokens).

## UserInfo

### <span class="api-method get">GET</span> /oauth/userinfo

Returns OIDC claims for the bearer access token. Also available as `POST`. Claims are
included only when the matching scope was granted and the data exists.

```http
GET https://api.yeboid.com/oauth/userinfo
Authorization: Bearer <access_token>
```

```json
{
  "sub": "usr_abc123",
  "name": "John Doe",
  "preferred_username": "johndoe",
  "picture": "https://api.yeboid.com/avatars/usr_abc123.jpg",
  "phone_number": "+26878422613",
  "phone_number_verified": true,
  "email": "john@example.com",
  "email_verified": true,
  "kyc_status": "VERIFIED",
  "country": "SZ",
  "currency": "SZL",
  "currency_symbol": "E"
}
```

| Claim | Scope required |
|-------|----------------|
| `sub` | `openid` |
| `name`, `preferred_username`, `picture` | `profile` |
| `phone_number`, `phone_number_verified` | `phone` |
| `email`, `email_verified` | `email` |
| `kyc_status`, `country`, `currency`, `currency_symbol` | `kyc` |
| `kyc_data` | `kyc:full` |

If the user later disconnects your app, `/oauth/userinfo` returns `401 invalid_token`
even with a not-yet-expired access token.

## Revoke

### <span class="api-method post">POST</span> /oauth/revoke

Revoke an access or refresh token (RFC 7009). Always returns `200` with an empty body,
even for unknown tokens.

| Field | Required | Description |
|-------|----------|-------------|
| `token` | Yes | The token to revoke. |
| `client_id` | Yes | Your app's client ID. |
| `token_type_hint` | No | `access_token` or `refresh_token`. |
| `client_secret` | Confidential clients | Required for confidential clients. |

## Introspection

### <span class="api-method post">POST</span> /oauth/introspect {#introspect}

Token introspection (RFC 7662). Lets a resource server / API gateway confirm whether a
presented **access OR refresh** token is currently live and read its metadata, instead of
having to try to *use* it. This is the right call when local JWKS verification isn't
enough — e.g. validating an opaque refresh token, or catching an access token whose grant
was revoked before it expired.

Client authentication mirrors [`/oauth/revoke`](#revoke): confidential clients send
`client_secret`; public PKCE clients are identified by `client_id` alone. Rate-limited per
`(client_id, IP)`.

| Field | Required | Description |
|-------|----------|-------------|
| `token` | Yes | The access or refresh token to inspect. |
| `client_id` | Yes | Your app's client ID. |
| `token_type_hint` | No | `access_token` or `refresh_token` — an ordering hint only; a wrong/absent hint never changes the result. |
| `client_secret` | Confidential clients | Required for confidential clients. |

**Active token response** (`200`)

```json
{
  "active": true,
  "scope": "openid profile phone",
  "client_id": "yebo_1a2b3c...",
  "sub": "usr_abc123",
  "username": "johndoe",
  "token_type": "Bearer",
  "exp": 1735689600,
  "iat": 1735688700
}
```

`token_type` and the JWT-only fields are present for access tokens. For refresh tokens the
response omits `token_type` and resolves `scope` from the consent grant.

**Inactive token response** (`200`)

```json
{ "active": false }
```

Any unknown, expired, or revoked token — including an access token whose grant was
withdrawn, or a refresh token that was rotated/revoked — returns a bare `{ "active": false }`.
The endpoint deliberately never reveals *why* a token is inactive (RFC 7662 §2.2).

## End session (logout)

### <span class="api-method get">GET</span> /oauth/logout {#end-session}

OIDC RP-initiated logout (the `end_session_endpoint` from discovery). Terminates the
user's YeboID **SSO session** so they are genuinely signed out — without this, clearing
your own product's session is futile, because the next silent `/oauth/authorize` re-logs
the user straight back in from the surviving SSO cookie.

Redirect the user's browser here (it reads the SSO cookie):

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id_token_hint` | Recommended | A previously issued `id_token`. Identifies the client so `post_logout_redirect_uri` can be validated against its registered URIs. |
| `post_logout_redirect_uri` | No | Where to send the user after logout. **Must** be a registered redirect URI of the identified client, or the request is rejected `400`. |
| `client_id` | No | Fallback client identifier when no `id_token_hint` is supplied. |
| `state` | No | Opaque value echoed back on the post-logout redirect. |

On success YeboID destroys the SSO session and clears the cookie, then either redirects to
`post_logout_redirect_uri` (echoing `state`) or — when none is supplied — returns
`200 {"success": true, "message": "Logged out"}`. A `post_logout_redirect_uri` that can't
be validated against a registered client URI is rejected with `400` and never redirected
to (no open redirector).

## Authorized apps (grants)

### <span class="api-method get">GET</span> /oauth/grants

Lists the apps the signed-in user has authorized. Requires a YeboID session.

### <span class="api-method delete">DELETE</span> /oauth/grants/:appId

Revokes the user's consent for a specific app, invalidating its tokens.

## App registration

### <span class="api-method post">POST</span> /apps

Register an OAuth client app. Requires an authenticated YeboID session (the request is
attributed to the signed-in user as the owner). This is the `registration_endpoint` from
discovery. Most developers should instead [register through the developer portal](/register-app).

**Request**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name (2–100 chars). |
| `slug` | Yes | URL-safe slug, `^[a-z0-9-]+$` (2–50 chars). |
| `redirectUris` | Yes | Array of redirect URIs (at least one). |
| `scopes` | No | Array of [scopes](/authentication/#available-scopes). Defaults to `["openid","profile"]`. |
| `logoUrl`, `websiteUrl`, `privacyUrl` | No | URLs. |

**Response** (`201`)

```json
{
  "success": true,
  "app": { "id": "...", "name": "My App", "slug": "my-app" },
  "credentials": {
    "clientId": "yebo_1a2b3c...",
    "clientSecret": "yebo_secret_9f8e..."
  },
  "warning": "Store the client_secret securely — it is shown only once."
}
```

The `clientSecret` is shown **once** and stored hashed; rotate it with
`POST /apps/:id/rotate-secret`. Other management routes (all require ownership):
`GET /apps`, `GET /apps/:id`, `PATCH /apps/:id`, `DELETE /apps/:id`.

## Token verification

For access tokens, the fastest path is to **verify the JWT locally** against the JWKS — no
network round-trip per request (use [introspection](#introspect) when you instead need to
confirm a token is still live):

1. Fetch the signing keys from [`/.well-known/jwks.json`](#jwks) and cache them.
2. Verify the JWT signature (`RS256`) against the key whose `kid` matches the token header.
3. Check `iss` = `https://api.yeboid.com`, `aud` = your `client_id`, and `exp`.
4. Enforce the `scope` claim for the route.

The [Node.js SDK](/node-sdk/) does all of this for you via `yeboid.authenticate()`. See
[Tokens → Verification](/authentication/tokens#token-verification) for a hand-rolled
example.
