# Token management

| Token | Purpose | Default lifetime |
|---|---|---|
| Access JWT | Authorize API requests | 15 minutes |
| Opaque refresh token | Rotate the token set | 60 days |
| ID JWT | Describe the authenticated person to the client | 1 hour |

Use the token response's `expires_in` as authoritative. Operators can configure access and refresh lifetimes.

## Access tokens and claims

Send `Authorization: Bearer ACCESS_TOKEN`. YeboID signs access tokens using RS256. OAuth access JWTs carry `iss`, `sub`, `aud` (your public client ID), `exp`, `iat`, `type: "access"`, `appId`, and `scopes: string[]`. Business tokens also carry `business_id` and `business_role`; `sub` remains the person.

The OAuth token response and introspection response use a space-separated `scope` string. That wire field is different from the access JWT's `scopes` array. Use the [Node SDK](/node-sdk/) to avoid implementing the distinction yourself.

An ID token is for the client that initiated login. Never accept it as an API bearer token. Validate its signature, issuer, audience, expiry, and the `nonce` from your authorization request before trusting identity claims. The browser SDK uses the access token and userinfo for the session profile.

## Rotation and concurrency

```bash
curl https://api.yeboid.com/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=refresh_token \
  --data-urlencode client_id=YOUR_CLIENT_ID \
  --data-urlencode refresh_token=YOUR_REFRESH_TOKEN
```

Persist the returned refresh token before sending another refresh. Serialize refresh calls: tokens are single use, and replaying an already revoked refresh token triggers revocation of that user's outstanding refresh tokens. The browser SDK shares one in-flight refresh within a client instance and protects against stale session results. Coordinate separately across tabs or server workers.

An optional `scope` narrows permissions; it cannot add permissions beyond the active consent grant. Revoked consent, a disabled account, or lost business access prevents renewal. Authorization codes are also single use and bound to the exact client, redirect URI, and PKCE verifier.

## Browser storage

The browser SDK defaults to localStorage so a login redirect and subsequent visits can restore the session. JavaScript executing on your origin can read it: prevent XSS, use a restrictive Content Security Policy, and avoid untrusted scripts. Storage write failures propagate instead of pretending tokens were saved. You may provide the SDK's `Storage` interface; memory-only storage does not survive a full-page PKCE redirect by itself.

For applications requiring tokens inaccessible to browser JavaScript, implement a backend-for-frontend using the Node SDK. Keep tokens on your server and give the browser a Secure, HttpOnly, SameSite session cookie, with CSRF protection appropriate to your routes. A browser `Storage` adapter cannot itself read an HttpOnly cookie.

Native applications should use their platform's secure credential storage. Never embed a client secret in a browser or mobile bundle. Store server secrets in a secret manager and exclude tokens from logs, analytics, error reports, and URLs.

## Backend verification and live permissions

```ts
import { YeboID } from '@omevision/yeboid-node';
const identity = new YeboID({ clientId: process.env.YEBOID_CLIENT_ID! });
app.get('/profile', identity.authenticate(), identity.requireScopes('profile'), handler);
```

The middleware verifies RS256, the configured issuer and audience, expiry, required claims, access-token purpose, and scope shape. It caches public JWKS keys locally. It cannot see a new ban or revoked grant from an offline JWT check alone. For sensitive actions, call `identity.introspect(token)` and require `active`, then enforce your own ownership/role checks. The identity API rechecks current account and consent state on protected requests. See the [permission matrix](/permissions).

## Logout and revocation

Use the browser SDK's `signOut()` or submit `token` (the refresh token) and `client_id` to `/oauth/revoke`. If you supply a client secret, it is validated. An unknown token or a token belonging to another client returns 200 without a mutation. A 200 response does not mean an arbitrary access JWT was blacklisted: offline verifiers can continue accepting an already-issued JWT until expiry. Disconnecting the app revokes its consent grant, and introspection/userinfo observe that immediately.

Clear local application sessions after successful sign-out, and display failures so the user knows when server logout did not finish. Disconnecting an app and signing out of YeboID's hosted SSO session are distinct actions.
