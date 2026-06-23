# OAuth & OIDC API Reference

YeboID is an OAuth 2.0 + OpenID Connect provider. This page documents the OAuth/OIDC
endpoints. For the phone+OTP account REST API (sign-up, sessions, profile), see the
[REST Endpoints](/api-reference) reference.

## Base URLs

| Environment | API base | Login / authorize UI |
|-------------|----------|----------------------|
| Production | `https://api.yeboid.com` | `https://yeboid.com` |
| Development | `https://dev-api.yeboid.com` | — |

The `authorization_endpoint` is user-facing and served by the YeboID app
(`https://yeboid.com/oauth/authorize`); all other endpoints below are on the API host.

## Discovery

### <span class="api-method get">GET</span> /.well-known/openid-configuration

Returns the OIDC discovery document — the canonical, machine-readable list of endpoints,
supported scopes, claims, and algorithms. Most OIDC client libraries read this
automatically.

```json
{
  "issuer": "https://api.yeboid.com",
  "authorization_endpoint": "https://yeboid.com/oauth/authorize",
  "token_endpoint": "https://api.yeboid.com/oauth/token",
  "userinfo_endpoint": "https://api.yeboid.com/oauth/userinfo",
  "revocation_endpoint": "https://api.yeboid.com/oauth/revoke",
  "jwks_uri": "https://api.yeboid.com/.well-known/jwks.json",
  "registration_endpoint": "https://api.yeboid.com/apps",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256", "plain"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

::: tip No introspection or end-session endpoint
YeboID does **not** expose an OAuth token-introspection endpoint
(`/oauth/introspect`) or an OIDC RP-initiated `end_session_endpoint`. Verify access
tokens locally via [JWKS](#jwks) (see [Token verification](#token-verification)), and use
[`/oauth/revoke`](#revoke) to revoke tokens.
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

Because there is no introspection endpoint, **resource servers verify access tokens
locally** against the JWKS — no network round-trip per request:

1. Fetch the signing keys from [`/.well-known/jwks.json`](#jwks) and cache them.
2. Verify the JWT signature (`RS256`) against the key whose `kid` matches the token header.
3. Check `iss` = `https://api.yeboid.com`, `aud` = your `client_id`, and `exp`.
4. Enforce the `scope` claim for the route.

The [Node.js SDK](/node-sdk/) does all of this for you via `yeboid.authenticate()`. See
[Tokens → Verification](/authentication/tokens#token-verification) for a hand-rolled
example.
