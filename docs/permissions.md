# Permissions and consent

Register only the permissions your app needs, request them in the authorization redirect, and enforce them on your API. Registration is a ceiling; the user's consent is the grant. Successful authentication alone is not authorization to modify an account or access every identity field.

## Available scopes

| Scope | What it permits | What it does not permit |
| --- | --- | --- |
| `openid` | Identify the person with stable `sub` | Read phone, email, documents, or administer their account |
| `profile` | Name, shared username (`preferred_username`), avatar | Edit the profile |
| `profile:write` | Update handle, avatar, or email via `PATCH /users/me` | Change a KYC-owned name, phone, PIN, global sessions, or developer credentials |
| `phone` | Read `phone_number`, `phone_number_verified` | Change the phone number |
| `email` | Read `email`, `email_verified` when present | Treat an unverified email as verified |
| `kyc` | Verification status, country, currency | Read identity documents |
| `kyc:full` | Full consented identity verification data | Bypass account ownership or business role rules |
| `business` | List approved memberships and obtain business context | Administer a business with a business token |
| `business:kyc` | Legal identity of a business for owner/admin roles | Reveal legal data to a member-role token |
| `business:manage` | Manage a business using a person token and permitted role | Override owner-only operations |
| `offline_access` | Request a refresh credential for continued sign-in | Perform unrelated actions without permission |

`wallet` and `wallet:transact` are unsupported and rejected. YeboID manages identity; it does not implement a wallet API.

## Enforcement points

- `/oauth/userinfo` returns only claims covered by the granted scopes.
- `GET /users/me` returns only granted fields for delegated app tokens. Direct hosted sessions see their own profile.
- `PATCH /users/me` requires `profile:write` for app tokens; its response remains limited to the app's read scopes.
- `/verification/status` requires `kyc` or `kyc:full` for apps. Only `kyc:full` receives `kycData`.
- Phone/PIN changes, email verification actions, global session/connected-app administration, account deletion, OAuth app credentials, and webhook subscription administration require a direct YeboID user session. An OAuth token does not become a hosted account-management session.
- Business tokens cannot read or administer personal identity routes. Use business-scoped userinfo for the context they represent.
- Bearer authentication refuses deleted/banned users, revoked grants, and disabled OAuth apps. Dependencies failing to verify authorization return an error; they do not create an anonymous success.

## Enforce permissions in your product

```ts
app.get('/private-profile', identity.authenticate(), identity.requireScopes('profile'), handler);
```

JWT checks are local and cached. They establish validity at issuance until the token expires; they do not contact YeboID for every request. For current consent and membership on high-impact actions, call `identity.introspect(token)` and require `active`, the needed scopes, and your product's own ownership rules. Never use a browser-only permission check as your server's authorization decision.

## Revocation and errors

Return `401` for missing/invalid/expired credentials, `403` for insufficient scope or role, and a visible `5xx` error when identity verification is unavailable. `DIRECT_SESSION_REQUIRED` means the user must complete the action in the hosted YeboID account UI. See [troubleshooting](/troubleshooting).

## Setup checks for AI agents and CI

```sh
npx yeboid-node doctor --client-id YOUR_CLIENT_ID --redirect-uri YOUR_CALLBACK --json
```

New registrations and SDK defaults use `openid profile offline_access`. The browser SDK checks `/oauth/clients/{clientId}/configuration` before redirecting, and the portal reads `/oauth/scopes` for its picker. The new SDK preflight rejects unsupported and unregistered scopes before navigation for every app. The candidate server release also enforces that ceiling for raw OAuth requests, including first-party apps; check [release status](/security/release) for deployment. Permissions are never silently broadened or discarded during authorization.

The candidate server release requires `offline_access` for a refresh token. Existing server issuance behavior remains until that cutover. Without it, handle access-token expiry by signing in again. Node token responses expose optional `refreshToken` and actual `scope`; browser clients expose `getGrantedScopes()` and `hasScope()`. Configured scopes express what the app asks for, not what a user granted.

Changing registration cannot edit an already signed JWT. In the candidate server release, YeboID API authentication, userinfo and introspection intersect its scopes with the current grant and app registration. External APIs validating JWTs locally observe revocation/removal at token expiry; use introspection for sensitive operations requiring current state.

Adding scopes means updating both app registration and SDK configuration, then starting sign-in again so the user can consent. A refresh request must stay within existing consent. This follows [OAuth refresh rules](https://www.rfc-editor.org/rfc/rfc6749#section-6) and the [OIDC offline-access consent requirement](https://openid.net/specs/openid-connect-core-1_0.html#OfflineAccess).

## Business selection

Third-party applications can access only businesses selected during consent. Under the existing Omevision first-party policy, the `business` permission covers all businesses the person manages; the consent screen explicitly discloses that access and does not present a restrictive picker for those apps. Developer verification and the candidate registered-scope ceiling still apply to first-party apps. A first-party flag never permits direct account administration through a business token.
