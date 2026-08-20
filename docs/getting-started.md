# Getting Started

Welcome to YeboID — the identity and authentication platform built for African applications.

## What is YeboID?

YeboID provides:

- **Phone-first authentication** — Users sign in with their phone number and PIN
- **KYC verification** — Verify user identity with government-issued IDs via YeboVerify
- **OAuth 2.0 + PKCE** — Industry-standard secure authentication
- **Pre-built UI components** — Beautiful Flutter widgets with Midnight Gold theme

## Prerequisites

Before integrating YeboID, you'll need:

1. **A YeboID Application** — create one yourself in the developer portal at
   [yeboid.com/developer/apps](https://yeboid.com/developer/apps) to get your
   `client_id`. It is self-service; see [Register Your App](/register-app).
2. **Redirect URI** — registered with the app and matched **exactly** at authorize
   time. Mobile apps use a custom scheme (e.g. `yourapp://auth`), web apps a full
   URL (e.g. `https://yourapp.com/callback`).

## Integration Options

### Flutter SDK (Recommended)

The fastest way to add YeboID to your mobile app:

```dart
YeboIDProvider(
  config: YeboIDConfig(
    clientId: 'your-app-id',
    redirectUri: 'yourapp://auth',
  ),
  child: MyApp(),
)
```

[View Flutter SDK Documentation →](/flutter-sdk/)

### Server-side SDKs

- **[Node.js SDK](/node-sdk/)** — Express middleware + token verification + the OAuth flow for Node/TypeScript backends.
- **[Web / React SDK](/web-sdk/)** — browser PKCE flow with React bindings.

### REST API

For backend integrations or custom implementations:

- Authorization request (send the **browser** here): `https://yeboid.com/oauth/authorize` — the hosted HTML login, and exactly what the OIDC discovery document advertises as `authorization_endpoint`. There is also a `/oauth/authorize` on the API host, but that one is the JSON endpoint the login UI itself calls — never send a browser there. See [Base URLs](/api-reference/oauth#base-urls).
- Token endpoint: `https://api.yeboid.com/oauth/token`
- User info endpoint: `https://api.yeboid.com/oauth/userinfo`

[View OAuth API Reference →](/api-reference/oauth)

## Authentication Flow

YeboID uses the standard OAuth 2.0 Authorization Code flow with PKCE:

```mermaid
sequenceDiagram
    participant App
    participant YeboID
    participant User
    
    App->>YeboID: 1. Authorization request + code_challenge
    YeboID->>User: 2. Show login screen
    User->>YeboID: 3. Enter phone + PIN
    YeboID->>App: 4. Redirect with authorization code
    App->>YeboID: 5. Exchange code + code_verifier for tokens
    YeboID->>App: 6. Return access_token + refresh_token
    App->>YeboID: 7. Fetch user profile
```

### Token Lifecycle

| Token | Lifetime | Usage |
|-------|----------|-------|
| Access Token | 15 minutes | API requests (`Authorization: Bearer <token>`) |
| Refresh Token | 60 days | Get new access tokens |
| ID Token | 1 hour | Contains user claims (OpenID Connect) |

## KYC Verification

Users can optionally verify their identity through YeboVerify:

1. User taps "Verify Identity" in your app
2. Opens YeboVerify in browser
3. User uploads government ID + selfie
4. Verification processed (usually < 2 minutes)
5. User returns to your app with verified status

A verified user's [`/oauth/userinfo`](/api-reference/oauth) response carries:

- `kyc_status: "VERIFIED"` — the enum is **uppercase** (`NONE`, `PENDING`,
  `VERIFIED`, `REJECTED`)
- `country` — ISO 3166-1 alpha-2 code resolved from their ID
- `currency` and `currency_symbol` — derived from `country`

Those four claims need the `kyc` scope. The full extracted document data
(`kyc_data`) requires `kyc:full`. There are no `kyc_country` or
`kyc_verified_at` claims.

## Supported Countries

Phone-number login accepts any E.164 number (`+` followed by 10–15 digits), so
sign-in is not restricted by country. The list below is **KYC document**
coverage — the countries whose IDs YeboVerify can verify:

| Country | Code | ID Types |
|---------|------|----------|
| Eswatini | SZ | National ID |
| South Africa | ZA | National ID, Passport |
| Mozambique | MZ | National ID |
| Kenya | KE | National ID |
| Nigeria | NG | National ID, Passport |

More countries coming soon.

## Next Steps

- [Flutter SDK Installation](/flutter-sdk/)
- [Authentication Deep Dive](/authentication/)
- [Widget Reference](/widgets/login-button)
- [API Reference](/api-reference)
