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
GET https://yeboid.com/authorize
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
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile phone"
}
```

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
  "phone": "+26878422613",
  "phone_verified": true,
  "name": "John Doe",
  "picture": "https://api.yeboid.com/avatars/usr_abc123.jpg",
  "kyc_status": "VERIFIED",
  "kyc_country": "SZ",
  "updated_at": 1709251200
}
```

## Available Scopes

| Scope | Description | Claims |
|-------|-------------|--------|
| `openid` | Required for OIDC | `sub` |
| `profile` | Basic profile info | `name`, `picture`, `updated_at` |
| `phone` | Phone number | `phone`, `phone_verified` |
| `email` | Email address (if available) | `email`, `email_verified` |
| `kyc` | KYC verification status | `kyc_status`, `kyc_country` |

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
