# @omevision/yeboid-node

YeboID sign-in for Node APIs. Version 2.0.0 targets public npm distribution, ESM and CommonJS, and typed Express middleware. Node.js 18+.

```bash
npm install @omevision/yeboid-node
```

## Protect an API

```ts
import express from 'express';
import { YeboID, type AuthenticatedRequest } from '@omevision/yeboid-node';

const app = express();
const identity = new YeboID({ clientId: process.env.YEBOID_CLIENT_ID! });

app.get('/me', identity.authenticate(), identity.requireScopes('profile'),
  async (req, res, next) => {
    try {
      // JWT verification gives identity + permissions. Userinfo gives consented profile claims.
      const personId = (req as AuthenticatedRequest).user!.sub;
      const profile = await identity.getUserInfo(req.headers.authorization!.slice(7));
      res.json({ personId, username: profile.handle });
    } catch (error) { next(error); }
  });
app.listen(3000);
```

Only a client ID is required to validate access tokens. For a server-driven authorization flow, also provide `redirectUri` and, for a confidential client, `clientSecret`. Defaults are `https://api.yeboid.com` for issuer/API calls and `https://yeboid.com/oauth/authorize` for hosted login.

## Verify webhooks

Mount the raw-body route before `express.json()`:

```ts
app.post('/webhooks/yeboid', express.raw({ type: 'application/json' }), (req, res) => {
  const valid = identity.verifyWebhook(req.body,
    req.get('X-YeboID-Signature') ?? '', process.env.YEBOID_WEBHOOK_SECRET!,
    req.get('X-YeboID-Timestamp') ?? '');
  if (!valid) return res.sendStatus(401);
  const event = JSON.parse(req.body.toString('utf8'));
  // Deduplicate event.id in your database before applying event.event.
  res.sendStatus(200);
});
```

Signatures are `v1=HMAC_SHA256(secret, timestamp + '.' + rawBody)`, with a five-minute replay window. Raw/legacy signature schemes are rejected.

## Authorization

`authenticate()` validates RS256, issuer, audience, expiry and access-token purpose. The API wire payload uses `scopes: string[]`; ID tokens cannot authenticate API routes. `req.user.sub` is the person; `req.user.businessId` is optional business context. `getUserInfo()` maps OIDC `preferred_username` to `handle` and `phone_number` to `phone` without inventing missing values. Never derive a username from a display name.

Use `requireScopes(...scopes)` plus your own resource ownership rules. For current revocation/role state call `introspect(token)` and check `active`, `hasScope()`/`hasAllScopes()`. An inactive result grants no permissions, even an empty requested set. Offline JWT validation alone cannot instantly observe a server-side revocation.

## Version 2 migration

- `verifyWebhook` and `verifyWebhookSignature` now require the timestamp argument and the API's `v1=` signature format.
- Access-token middleware reads YeboID's actual `type: 'access'` and `scopes` claims; signed ID tokens or malformed payloads are refused.
- Production endpoint defaults are correct; use `authUrl` separately when configuring another hosted environment.
- Do not use the legacy private `yeboid-sdk` package for new integrations.

See [the quickstart](https://docs.yeboid.com/getting-started), [permissions](https://docs.yeboid.com/permissions), and [the source](https://github.com/omegathesecond/yeboid-sdk-node). Publishing availability is verified separately from a successful build. MIT license.
