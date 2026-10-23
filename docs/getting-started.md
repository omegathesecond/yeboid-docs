# Add YeboID sign-in

Give users one account and one shared username across YeboID and Hiyebo. Your app stores the stable `sub` as its user reference. Fetch profile data from YeboID with the user's consent.

## 1. Register an application

Sign in at [YeboID](https://yeboid.com), then open [Developer Apps](https://yeboid.com/developer/apps). Create an app with the exact callback URL your app serves, for example `http://localhost:5173/auth/callback` for local development and `https://example.com/auth/callback` for production. Select `openid`, `profile`, and `offline_access` for basic sign-in.

![Create an OAuth application in YeboID](/screenshots/register-app.png)

*Local developer UI preview with synthetic example data. No real app or credentials were created for this screenshot.*

The client ID is public. Keep the client secret on your server; browser and mobile clients never receive it. [Registration details](/register-app).

## 2. Install the SDKs

```bash
npm install yeboid-web
# In your Node API project:
npm install yeboid-node
```

Public releases: Web **0.5.0**, Node **2.0.0**. Both exact versions were installed from npm using empty npm configuration and a fresh cache, without an npm token. The installed packages passed runtime and TypeScript integration checks. See [release verification](/security/release).

## 3. Add the React provider and button

```tsx
import { YeboIDProvider, YeboIDSignInButton, useYeboID } from 'yeboid-web/react';

function Account() {
  const { user, isLoading, error, retry, signOut } = useYeboID();
  if (isLoading) return <p>Loading your account…</p>;
  if (error) return <div role="alert">{error.message} <button onClick={() => void retry()}>Retry</button></div>;
  if (!user) return <YeboIDSignInButton />;
  return <p>Signed in as @{user.preferred_username} <button onClick={() => void signOut().catch(window.alert)}>Sign out</button></p>;
}

export function App() {
  return <YeboIDProvider config={{
    clientId: import.meta.env.VITE_YEBOID_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/callback`,
    scope: ['openid', 'profile', 'offline_access'],
  }}><Account /></YeboIDProvider>;
}
```

Set `VITE_YEBOID_CLIENT_ID` to the registered client ID. Serve your app on `/auth/callback` with the same provider. The provider checks OAuth state, exchanges the authorization code with PKCE, loads userinfo, removes callback credentials from the URL, and resumes token refresh. Configure your host's SPA fallback so a direct callback load does not return 404.

![YeboID hosted sign-in](/screenshots/sign-in.png)

*Real local login UI; no OTP was sent. The user completes authentication and consent on YeboID.*

## 4. Protect your API

```ts
import express from 'express';
import { YeboID, type AuthenticatedRequest } from 'yeboid-node';

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

The SDK validates RS256 signatures, issuer, audience, expiry, token purpose, and the actual `scopes` array. An ID token is not an API access token. Use `requireScopes` for authorization, and check your own resource ownership separately. Use [introspection](/node-sdk/#fresh-permission-checks) for sensitive operations that need current revocation state.

## 5. Verify the integration

- A signed-out visitor sees the sign-in button; failures are visible and retryable.
- A successful callback returns the same `sub` and `preferred_username` as YeboID. Never derive a username from a person's name.
- A token issued to a different client, an ID token, an expired token, or a missing permission is refused by your API.
- A user who declines consent sees a clear error rather than a signed-in state.
- Refresh rotates credentials without duplicate refresh requests. Failed logout remains visible.

Continue with [permissions](/permissions), [Node](/node-sdk/), [Web / React](/web-sdk/), [business accounts](/business-accounts), and [troubleshooting](/troubleshooting).

## Consent preview

The hosted screen names your app, shows the signed-in account, and lists requested permissions before approval. This screenshot uses the real local UI with synthetic fixture data.

![Hosted consent screen with profile and offline access permissions](/screenshots/consent.png)
