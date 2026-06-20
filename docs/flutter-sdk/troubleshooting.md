# Flutter Troubleshooting

Native sign-in (the `yeboid_flutter` SDK / `flutter_appauth`) enforces several
OIDC checks that a browser/web flow silently skips. So a product can have
**working web login but a failing mobile app**. Walk these in order — they map
to the stages of the flow:

**handoff → token exchange → `id_token.aud` → `id_token.nonce`**

## Build error: `No named parameter 'preferEphemeralSession'`

`flutter_appauth` 8.x removed that parameter. Use `yeboid_flutter >= 1.0.2`
(it no longer passes the flag; the non-ephemeral default still shares the SSO
session). Ensure your app is on `flutter_appauth ^8`.

## Sign-in shows a blank page with raw JSON

The authorize endpoint is pointed at the API host. It must be the **HTML hosted
login** `https://yeboid.com/oauth/authorize`; the token endpoint stays on
`https://api.yeboid.com/oauth/token`. The SDK derives these from `authUrl` /
`apiUrl` — don't set `authUrl` to `api.yeboid.com`.

## Consent finishes but the browser won't close / never returns to the app

Two distinct causes:

1. **Redirect delivery.** Use a **custom scheme** redirect, registered via
   `appAuthRedirectScheme` (Android) and `CFBundleURLSchemes` (iOS). The hosted
   login returns the code via a server-issued **302** to the scheme (a
   client-side navigation to a custom scheme is dropped by Chrome Custom Tabs /
   `SFSafariViewController`).

2. **`No stored state`.** If logcat shows
   `W/AppAuth: No stored state - unable to handle response`, your `MainActivity`
   has `android:taskAffinity=""` (or a custom affinity). AppAuth's
   `AuthorizationManagementActivity` is `singleTask` with the **default**
   affinity, so a mismatch runs the flow in a separate task that's cleared
   during the browser round-trip. **Remove `taskAffinity=""`** and do a full
   rebuild.

## `Invalid ID Token — Audience mismatch`

```
PlatformException(authorize_and_exchange_code_failed,
  Failed to authorize: [error: null, description: Invalid ID Token],
  Audience mismatch, null)
```

AppAuth validates `id_token.aud == your client_id`. If you see this, YeboID is
minting the id_token with the wrong audience — report it to the YeboID team
(the `aud` must be the `client_id`, not an internal app id). Fixed server-side
2026-06-20.

## `Invalid ID Token — Nonce mismatch`

```
PlatformException(authorize_and_exchange_code_failed,
  Failed to authorize: [error: null, description: Invalid ID Token],
  Nonce mismatch, null)
```

AppAuth sends a `nonce` and requires the id_token to echo it. If the id_token
comes back without it, the hosted login isn't forwarding the nonce through
consent — report it to the YeboID team. Fixed in the hosted login 2026-06-20.

## Returning users get re-prompted every time

Don't force `prompt=login`. Without it, a returning user with a live YeboID SSO
session + recorded consent is returned via a pure server-302 (no interactive
screen). The SDK does not force `prompt=login`.
