# Node.js SDK

The official YeboID SDK for Node.js / TypeScript backends. Use it to protect your API
routes with YeboID access tokens, run the OAuth 2.0 + PKCE authorization-code flow from a
server, exchange and refresh tokens, fetch user info, and verify webhook signatures.

- **Package:** [`@omevision/yeboid-node`](https://www.npmjs.com/package/@omevision/yeboid-node)
- **Source:** [omegathesecond/yeboid-sdk-node](https://github.com/omegathesecond/yeboid-sdk-node)
- **Runtime:** Node.js 18+, ships both ESM and CommonJS builds with TypeScript types.

## Installation

```bash
npm install @omevision/yeboid-node
```

::: warning Private package
`@omevision/yeboid-node` is published under the private `@omevision` npm scope.
You need an npm token with read access to that scope before `npm install` will
succeed — locally **and** in CI / build containers. Add it to `~/.npmrc`:

```
//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxx
```
:::

## Configure the client

Create a single `YeboID` instance and reuse it across your app.

```typescript
import { YeboID } from '@omevision/yeboid-node';

const yeboid = new YeboID({
  clientId: process.env.YEBOID_CLIENT_ID!,
  clientSecret: process.env.YEBOID_CLIENT_SECRET!,
  redirectUri: 'https://myapp.com/auth/callback',
  // Always set this in production. The SDK's built-in default points at a
  // legacy host, so production apps must pass the real API base explicitly.
  baseUrl: 'https://api.yeboid.com',
});
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | `string` | Yes | Your app's client ID from the [developer portal](/register-app). |
| `clientSecret` | `string` | Yes | Your app's client secret. Keep this server-side only. |
| `redirectUri` | `string` | Yes | The callback URL registered for your app. |
| `baseUrl` | `string` | No | YeboID API base URL. Set to `https://api.yeboid.com` in production (the built-in default is a legacy host). |
| `jwksCacheTtl` | `number` | No | How long (ms) to cache signing keys. Default `3600000` (1 hour). |

::: tip Get your credentials
You need a `clientId` and `clientSecret` before you can use the SDK. Create an app in
the [YeboID developer portal](/register-app) to get them.
:::

## Protect your API routes (middleware)

`authenticate()` returns Express middleware that verifies the incoming
`Authorization: Bearer <access_token>` header against YeboID's JWKS and attaches the
decoded user to `req.user`.

```typescript
import express from 'express';

const app = express();

// Require a valid YeboID token for everything under /api
app.use('/api', yeboid.authenticate());

app.get('/api/me', (req, res) => {
  // req.user => { sub, phone, name, handle, scopes, email, picture, ... }
  res.json(req.user);
});
```

Make authentication optional (populate `req.user` when a token is present, but don't
reject anonymous requests):

```typescript
app.use('/api/public', yeboid.authenticate({ optional: true }));
```

Require specific scopes on a route (`requireScopes` rejects tokens missing **any**
of the listed scopes with `403 insufficient_scope`):

```typescript
// Only tokens granted the `profile:write` scope may update a profile
app.patch('/api/profile', yeboid.requireScopes('profile:write'), handler);
```

See the [full scope list](/authentication/#available-scopes) for valid scope strings.

## Server-side login flow (OAuth 2.0 + PKCE)

When you run the login flow from your backend, the SDK generates the PKCE
`code_verifier`, `state`, and authorization URL for you. Persist the `codeVerifier` and
`state` (e.g. in the session) so you can complete the exchange on the callback.

```typescript
// 1. Start the login — redirect the user to YeboID
app.get('/auth/login', (req, res) => {
  const { url, codeVerifier, state } = yeboid.getAuthorizationUrl({
    scopes: ['openid', 'profile', 'phone'],
  });
  req.session.codeVerifier = codeVerifier;
  req.session.oauthState = state;
  res.redirect(url);
});

// 2. Handle the callback — exchange the code for tokens
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // CSRF protection: state must match what we sent
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state');
  }

  const tokens = await yeboid.exchangeCode(
    code as string,
    req.session.codeVerifier,
  );
  // tokens => { accessToken, refreshToken, idToken, expiresIn, tokenType }

  req.session.accessToken = tokens.accessToken;
  req.session.refreshToken = tokens.refreshToken;
  res.redirect('/dashboard');
});
```

## Refreshing tokens

Access tokens are short-lived (15 minutes). Use the refresh token to get a new one.
YeboID **rotates** refresh tokens — always persist the new `refreshToken` from the
response.

```typescript
const tokens = await yeboid.refreshToken(req.session.refreshToken);
req.session.accessToken = tokens.accessToken;
req.session.refreshToken = tokens.refreshToken; // store the rotated token
```

## Fetching user info

```typescript
const user = await yeboid.getUserInfo(accessToken);
// { sub, phone?, name?, handle?, scopes, email?, emailVerified?, picture? }
```

## Revoking tokens (logout)

```typescript
await yeboid.revokeToken(req.session.refreshToken);
req.session.destroy(() => res.redirect('/'));
```

## Verifying webhooks

If you subscribe to [webhooks](/webhooks), verify every delivery's signature before
trusting it. YeboID signs the **timestamp + the raw request body** with HMAC-SHA256 and
sends the result in the `X-YeboID-Signature` header as `v1=<hex>`, alongside an
`X-YeboID-Timestamp` header. You must verify against the **raw bytes** of the request
body — re-serializing the parsed JSON can change the bytes and break the check.

```typescript
import crypto from 'node:crypto';
import express from 'express';

// Capture the raw body for the webhook route
app.post(
  '/webhooks/yeboid',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.header('X-YeboID-Signature') ?? '';
    const timestamp = req.header('X-YeboID-Timestamp') ?? '';
    const rawBody = req.body.toString('utf8'); // raw Buffer -> string

    // Reject deliveries older than 5 minutes (replay protection)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) {
      return res.status(401).send('Stale timestamp');
    }

    const expected =
      'v1=' +
      crypto
        .createHmac('sha256', process.env.YEBOID_WEBHOOK_SECRET!)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    const ok =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!ok) {
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    // handle event.event ('user.created', 'user.kyc.verified', ...)
    res.sendStatus(200);
  },
);
```

See the [Webhooks guide](/webhooks) for the full event list and the exact signature
scheme.

## API surface

| Method | Description |
|--------|-------------|
| `authenticate(options?)` | Express middleware that verifies the Bearer token and sets `req.user`. |
| `requireScopes(...scopes)` | Express middleware that rejects tokens missing any of the given scopes. |
| `getAuthorizationUrl(options?)` | Build the authorization URL + PKCE `codeVerifier` + `state`. |
| `exchangeCode(code, codeVerifier)` | Exchange an authorization code for tokens. |
| `refreshToken(refreshToken)` | Exchange a refresh token for a new token set (rotated). |
| `getUserInfo(accessToken)` | Fetch the user profile from `/oauth/userinfo`. |
| `revokeToken(token)` | Revoke an access or refresh token. |
| `verifyWebhook(payload, signature, secret)` | HMAC-SHA256 check over the raw payload, returns `boolean`. Note: it does **not** incorporate the `X-YeboID-Timestamp` header, so for current YeboID deliveries verify manually as shown [above](#verifying-webhooks). |
| `refreshJWKS()` | Force-refresh the cached signing keys. |
| `clearJWKSCache()` | Clear the JWKS cache. |

## Next steps

- [OAuth 2.0 + PKCE flow in depth](/authentication/)
- [Token management & verification](/authentication/tokens)
- [OAuth / OIDC API reference](/api-reference/oauth)
- [Webhooks](/webhooks)
