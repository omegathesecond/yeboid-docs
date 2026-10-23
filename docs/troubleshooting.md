# Troubleshooting sign-in

| Symptom | Check and next action |
| --- | --- |
| `invalid_redirect_uri` | Register the callback exactly, including path, port, trailing slash, and scheme. Web callbacks need HTTPS; loopback HTTP is allowed for local development. Fragments and embedded credentials are rejected. |
| Callback returns 404 | Configure an SPA fallback or add the callback route to your server. Mount the React provider on that route. |
| `invalid_state` or missing verifier | Start with `signIn()` in the same browser storage context. Do not manually construct a callback or reuse a previous authorization code. |
| API returns 401 after login | Send the access token, not the ID token. Check `YEBOID_CLIENT_ID` matches the token's audience and the issuer is `https://api.yeboid.com`. |
| API returns `insufficient_scope` | Allow the scope in Developer Apps, request it during sign-in, then obtain a new consent grant. Do not invent a permission client-side. |
| `DIRECT_SESSION_REQUIRED` | Open the YeboID account UI for credential, global-session, developer-app, or webhook administration. |
| No phone/email in userinfo | The matching scope was not granted or the profile field is absent. Do not substitute invented data. |
| `email_verified` is false | The user must verify their address in YeboID. `requireVerifiedEmail` is a UX gate; enforce verification on your backend too. |
| Third-party cookies blocked | Browsers may restrict cross-site SSO cookies. Keep the application session and global identity session distinct; display logout failures and offer retry. |
| 429 | Respect `Retry-After` and the SDK's single-flight refresh. Avoid retry loops across tabs. |
| Webhook signature fails | Use the raw request bytes, `X-YeboID-Signature`, and `X-YeboID-Timestamp`. Node 2 requires all four verifier arguments. Parsing/re-serializing JSON changes signed bytes. |
| Package install fails with 404 | Confirm the [release status](/security/release); a prepared tarball is not proof the public npm version has been published. |

## Error handling in React

`useYeboID()` exposes `error`, `retry()`, and `resetError()`. Render failures using your normal error UI. The provided `YeboIDSignInButton` also displays failed sign-in redirects. Catch rejected sign-out promises instead of showing a successful logout while server credentials remain active.

## Report a security issue

Use a private report to the repository owner rather than publishing credentials, personal data, or an exploit against live accounts. Include the package/version, affected endpoint, expected permission, and a reproduction using synthetic local fixtures. Never include an access token, refresh token, client secret, OTP, identity document, or npm token.
