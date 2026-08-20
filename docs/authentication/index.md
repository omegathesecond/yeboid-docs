# OAuth2 Authentication

YeboID uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication. This is the industry standard for mobile and single-page applications.

## Flow Overview

```
┌──────────────┐     1. Auth Request      ┌──────────────┐
│              │ ─────────────────────────▶│              │
│   Your App   │                          │    YeboID    │
│              │◀───────────────────────── │              │
└──────────────┘     2. Auth Code         └──────────────┘
       │                                         │
       │ 3. Exchange Code                        │
       │    + Code Verifier                      │
       ▼                                         │
┌──────────────┐     4. Access Token      ┌──────────────┐
│              │◀───────────────────────── │              │
│   Your App   │                          │  YeboID API  │
│              │ ─────────────────────────▶│              │
└──────────────┘     5. API Requests      └──────────────┘
```

## Step 1: Generate PKCE Parameters

Before initiating the auth flow, generate the PKCE code verifier and challenge:

```javascript
// Generate a random code verifier (43-128 characters)
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// Create the code challenge (SHA-256 hash of verifier)
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}
```

::: tip
The Flutter SDK handles PKCE automatically. You don't need to implement this yourself when using `YeboIDProvider`.
:::

## Step 2: Authorization Request

Redirect the user to the YeboID authorization endpoint:

```
GET https://yeboid.com/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=yourapp://auth
  &scope=openid profile phone
  &code_challenge=GENERATED_CHALLENGE
  &code_challenge_method=S256
  &state=RANDOM_STATE
```

| Parameter | Description |
|-----------|-------------|
| `response_type` | Always `code` for authorization code flow |
| `client_id` | Your application's client ID |
| `redirect_uri` | Where to redirect after auth (must match registered URI) |
| `scope` | Space-separated list of scopes |
| `code_challenge` | Base64URL-encoded SHA-256 hash of code verifier |
| `code_challenge_method` | Always `S256` |
| `state` | Random string to prevent CSRF attacks |

## Step 3: Handle the Callback

After successful authentication, YeboID redirects to your `redirect_uri` with an authorization code:

```
yourapp://auth?code=AUTH_CODE&state=YOUR_STATE
```

Verify that `state` matches what you sent, then exchange the code for tokens.

## Step 4: Exchange Code for Tokens

```bash
POST https://api.yeboid.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=yourapp://auth
&client_id=YOUR_CLIENT_ID
&code_verifier=ORIGINAL_CODE_VERIFIER
```

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile phone"
}
```

`expires_in` is in seconds — access tokens live **15 minutes**. The `refresh_token` is
only returned when the `offline_access` scope (or a long-lived grant) applies; see
[Tokens](/authentication/tokens).

## Step 5: Access User Info

Use the access token to fetch user information:

```bash
GET https://api.yeboid.com/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN
```

Response:

```json
{
  "sub": "usr_abc123",
  "name": "John Doe",
  "preferred_username": "johndoe",
  "picture": "https://api.yeboid.com/avatars/usr_abc123.jpg",
  "phone_number": "+26878422613",
  "phone_number_verified": true,
  "kyc_status": "VERIFIED",
  "country": "SZ",
  "currency": "SZL",
  "currency_symbol": "E"
}
```

Claims are returned only when the matching scope was granted (and the data exists).

## Available Scopes

These are the scopes the YeboID API actually accepts. Requesting anything outside this
list fails with `invalid_scope`.

| Scope | Description | Claims |
|-------|-------------|--------|
| `openid` | Required for OIDC. Provides the user ID. | `sub` |
| `profile` | Read basic profile (name, handle, avatar). | `name`, `preferred_username`, `picture` |
| `profile:write` | Update the user's profile. | — |
| `phone` | Read the phone number. | `phone_number`, `phone_number_verified` |
| `email` | Read the email address (if available). | `email`, `email_verified` |
| `kyc` | Read KYC status, country, and currency. | `kyc_status`, `country`, `currency`, `currency_symbol` |
| `kyc:full` | Read the full KYC verification data. | `kyc_status`, `kyc_data` |
| `offline_access` | Stay signed in between sessions — issues a refresh token. | — |

::: warning Wallet scopes
`wallet` and `wallet:transact` are **not** currently supported — there is no wallet
backend yet, and the API rejects them with `invalid_scope`. Don't request them.
:::

## Error Handling

If authentication fails, the callback will include error parameters:

```
yourapp://auth?error=access_denied&error_description=User+cancelled+the+request
```

Common errors:

| Error | Description |
|-------|-------------|
| `invalid_request` | Missing or invalid parameters |
| `unauthorized_client` | Client not authorized for this grant type |
| `access_denied` | User denied the request |
| `invalid_scope` | Requested scope is invalid |
| `server_error` | Internal server error |

## Next Steps

- [Learn about PKCE in depth](/authentication/pkce)
- [Token management and refresh](/authentication/tokens)
