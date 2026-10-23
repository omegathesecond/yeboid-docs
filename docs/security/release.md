# Security and release verification

Updated **24 October 2026**. Release availability and a passing local test are separate checks.

## Developer onboarding release

| Gate | Status |
|---|---|
| Public app configuration and scope catalog | Deployed to production; read-only, credential-free CORS; no client secret or owner identity in the response |
| Portal permission presets and AI setup command | Deployed, with matching `openid profile offline_access` defaults |
| Hosted login and returning-consent fix | Deployed; includes SSO cookies and validated callback handling |
| `yeboid-node@3.0.0` and `yeboid-web@1.0.0` | Tested tarballs prepared; **publication and anonymous installation pending npm security-key approval** |
| AI setup guide and screenshots | Built in an isolated documentation release; publication awaits the SDK release |
| Developer KYC/domain verification policy | Candidate implemented and tested; **migration and strict production cutover not applied** |

The currently verified public registry versions remain `yeboid-node@2.0.0` and `yeboid-web@0.5.0`. The new `doctor` and `init` commands require Node SDK 3.0.0; do not assume they exist in 2.0.0.

## Current validation

| Component | Passing tests | Build | Dependency audit |
|---|---:|---|---|
| Setup-support API release | 655 | Pass | 0 reported vulnerabilities |
| Full scope and verification API candidate | 672 | Pass | 0 reported vulnerabilities |
| Node SDK 3.0.0 candidate | 110 | Pass + TypeScript | 0 reported vulnerabilities |
| Web SDK 1.0.0 candidate | 145 | Pass + TypeScript | 0 reported vulnerabilities |
| Portal setup subset | 130 | Pass | 0 reported vulnerabilities |
| Portal verification candidate | 133 | Pass | 0 reported vulnerabilities |
| Admin console | 9 | Pass with explicit production API URL | 0 reported vulnerabilities |
| Generated React/Node starter | Browser journey below | Pass | 0 runtime or full-tree reported vulnerabilities |
| Documentation | Internal-link/build check | Pass | 0 reported vulnerabilities |

The portal integrates the existing main-branch outage recovery and session-ownership protections while continuing to load the canonical account profile. Business consent clearly distinguishes third-party selections from Omevision-wide business access.

The dependency refresh patches Zod to 4.6.7, updates parser/proxy/query dependencies, and adjusts the API validation error handler to use the current issue structure. A valid UUID fixture replaced a malformed UUID accepted by the old validator. No validation bypass or compatibility parser was added. [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [proxy-address advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).

## Browser and package proof

A fresh consumer installed the exact packed SDKs. The installed CLI checked a synthetic registration and generated a React frontend and protected Node API. Chrome completed hosted consent, PKCE code exchange, callback, a real signed-token API call, returning-session reload and logout. Both runtime and full dependency audits of the generated project report zero vulnerabilities.

The browser check caught and fixed a missing `/oauth/authorize` path in generated configuration before publication. The generator refuses existing output directories. Names, phone numbers, client IDs, domain proof and KYC state in [the screenshots](/ai-agents#tested-browser-journey) are synthetic. No OTP was sent, production profile shared, real person's KYC approved or actual external domain verified by this fixture.

Anonymous installation of the **new** registry releases has not yet passed because publication is pending. Previous-version anonymous registry evidence remains available in [the historical report](/security/release-evidence.json). The new evidence is [available separately](/security/onboarding-evidence.json).

## Verification cutover impact

Read-only production inventory found **23 active apps, 22 KYC-verified owners, one owner without verified KYC, and no recorded domain-ownership proofs**. Applying the strict policy immediately would return every existing app to testing and stop public logins until its requirements pass. Existing OAuth refresh credentials without an original scope ceiling will require fresh sign-in after cutover. Direct YeboID login sessions are distinct.

The candidate migration creates app-bound, expiring DNS/HTTPS ownership proof and a production flag, plus an original scope ceiling on OAuth refresh credentials. It does not manufacture historical proof, broaden consent or exempt first-party apps. The staged transition decision is pending; the production migration is deliberately unapplied. See [the verification flow](/app-verification).

## Permission boundaries

New SDK preflight checks exact callbacks and registered scopes before browser navigation. The candidate server enforces the scope ceiling for raw OAuth requests as well, checks current grants at userinfo/introspection, refuses code exchange after consent withdrawal, requires offline access for refresh issuance, and prevents an old refresh credential from acquiring a later consent upgrade.

Developer verification endpoints require a direct owner session. Unauthenticated, foreign-owner, app-delegated and business tokens cannot administer app verification. Proof checks reject private/internal networks, DNS rebinding, redirects, oversized bodies, incorrect/rotated/expired proofs and concurrent configuration changes. Failures remain visible.

## Limits

Local JWT verification cannot instantly observe bans, revoked consent or app-state changes; use introspection for sensitive operations requiring current state. Browser localStorage requires strong XSS defenses and CSP. Native custom callback schemes can be claimed by another app; prefer platform-verified HTTPS links where available. Some API abuse limits are per process, so aggregate limits increase with Cloud Run instance count.

Unit tests mock databases/providers, and the browser journey uses a synthetic database. These checks do not constitute a full production penetration test, real-device native login test, SMS delivery test or proof that every portfolio app has been integrated. New schema migration behavior has been validated at the schema/source level, not applied to production.
