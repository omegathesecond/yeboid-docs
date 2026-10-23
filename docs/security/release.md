# Security and release verification

Reviewed on **23 October 2026**. Release candidates are `@omevision/yeboid-node@2.0.0` and `@omevision/yeboid-web@0.5.0`. **npm publication is pending account 2FA.** A successful local build or tarball installation does not mean a package is available from the public registry.

## Test and dependency results

| Component | Tests passed | npm audit findings |
|---|---:|---:|
| Identity API | 650 | 0 |
| Node SDK | 104 | 0 |
| Browser SDK | 139 | 0 |
| Hosted sign-in UI | 98 | 0 |
| Admin console | 9 | 0 |
| Retained private legacy SDK | 36 | 0 |
| Documentation | Build and eight-page browser check | 0 |

The suites total **1,036 passing tests**. [Download the release evidence](/security/release-evidence.json). These results cover the reviewed release source; npm availability and live behavior are separate gates.

## What was checked

| Area | Verification |
|---|---|
| Account permissions | Delegated apps receive only consented profile fields; profile writes require `profile:write`; account credentials, global sessions, client secrets, webhooks and account deletion require the person's direct YeboID session |
| Business permissions | Scope checks plus current membership, role, app connection and suspension checks; business context never grants account administration |
| Token validation | RS256, issuer, audience, expiry, access-token purpose and scope shape; ID tokens rejected by API middleware |
| Token lifecycle | PKCE and redirect binding, atomic single-use authorization codes and refresh rotation, foreign-client revocation refusal, bans/disabled apps/revoked grants |
| Webhooks | Actual API HMAC format, raw body and timestamp replay protection, HTTPS-only destinations, connection-time public DNS validation, redirects refused |
| Browser integrations | Credential-free machine OAuth endpoints support public-client CORS; hosted account routes retain the UI origin allowlist |
| Deployment inputs | Environment files, private keys, local dependencies and Git metadata excluded from build upload/container context; production signing keys and administrator MFA required |
| Packaging | Only distribution files, manifest, README and MIT license; ESM, CommonJS, TypeScript and optional React entry verified |

The clean consumer test mints tokens through the actual API signing service using synthetic users, generated keys and local HTTP endpoints. It verifies accepted access tokens, rejected ID tokens, React rendering and independently computed webhook HMACs. It does not contact a production database or send OTPs.

## Reproduce the release gates

1. In each SDK, run `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and `npm audit`.
2. Pack the exact distribution and install it in a fresh project. Verify ESM, CommonJS, TypeScript, React exports, API-issued claims and webhook signatures.
3. Publish the tested tarballs with public access using an authorized npm identity with 2FA. Never weaken npm account security to bypass a release failure.
4. From an empty npm configuration without a token, install those exact registry versions and repeat the consumer checks. Verify registry integrity against the tested tarballs.
5. Build the documentation, check internal links, inspect screenshots and verify the deployed public URLs.
6. Build/deploy the API and hosted UI from the reviewed source, then verify live discovery, JWKS, OAuth errors, CORS and protected-route failures separately from local tests.

## Screenshots and data

[The quickstart](/getting-started) and [app registration](/register-app) include screenshots of the real local sign-in, app settings and consent UI. Accounts, phone numbers, client IDs and app details are synthetic fixtures. No production credentials or real verification documents appear in the images.

## Deployment checks

The API security release is deployed as production revision `yeboid-api-prod-00125-nah`. Live checks verify discovery/JWKS, the public OAuth CORS contract, rejected unauthenticated account/developer/admin requests, and database readiness. The hosted login serves the tested `index-dgmXE0B6.js` asset. The hosted UI and admin console have explicit script and framing policies, verified by rendering their production bundles under those policies. Identity API responses carry `Cache-Control: no-store`, anti-embedding and content-type headers, including errors. The admin console retains its Cloudflare Access gate. Development was temporarily started for the same API checks and restored to its original zero-instance setting.

The shared username registry was rechecked: **15,810 users, zero missing usernames and zero registry repairs needed**. No additional backfill writes were required.

## Operational limits

Offline JWT verification cannot observe a new ban or revoked consent until expiry; use introspection for sensitive actions. Browser localStorage is readable by same-origin JavaScript, so XSS prevention and CSP remain the integrating application's responsibility. Public native callback schemes can be claimed by another installed app; PKCE limits code theft, and platform-verified HTTPS links are preferable when available.

Some abuse limits are held per API process. Aggregate limits grow with the number of Cloud Run instances; monitor abuse and enforce account lockouts/edge limits alongside them. Session-store outages propagate as API errors rather than being presented as a successful anonymous session. Local tests mock databases and providers: they are not a penetration test of every production dependency, a delivery test of SMS/email, or proof that all third-party products are correctly integrated.
