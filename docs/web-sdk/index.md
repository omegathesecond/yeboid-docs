# @omevision/yeboid-web

YeboID sign-in for browsers and React. Version 0.5.0 targets public npm distribution. PKCE, OAuth state validation, rotating refresh, single-flight retries, and visible errors are included. No client secret belongs in a browser.

```bash
npm install @omevision/yeboid-web
```

## React: provider and sign-in button

```tsx
import { YeboIDProvider, YeboIDSignInButton, useYeboID } from '@omevision/yeboid-web/react';

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

Register your exact callback in [Developer Apps](https://yeboid.com/developer/apps). Serve the provider on that callback and configure your SPA fallback. No API origin/endpoint overrides are needed for production. The React entry is optional; the root SDK does not depend on a React runtime.

## Framework-independent client

```ts
import { YeboIDClient } from '@omevision/yeboid-web';
const identity = new YeboIDClient({ clientId: 'YOUR_CLIENT_ID',
  redirectUri: `${window.location.origin}/auth/callback`,
  scope: ['openid', 'profile', 'offline_access'] });
if (YeboIDClient.isCallbackUrl(window.location)) {
  const { user } = await identity.handleCallback();
  window.history.replaceState({}, '', '/');
  console.log(user.sub, user.preferred_username);
}
// On an explicit user action:
// await identity.signIn();
// const response = await identity.fetch('https://YOUR_TRUSTED_API.example/me');
// await identity.signOut();
```

Attach access tokens only to your own trusted API. Enforce authorization on the server with `@omevision/yeboid-node`; browser state and the returned ID token are not server authorization checks.

## Permissions, errors, and business context

Start with `openid profile offline_access`. Phone, email, identity documents, and business context require their own consented scopes. `preferred_username` is the shared YeboID/Hiyebo username. Keep `sub` as the stable identity reference.

`useYeboID()` exposes `error`, `retry()`, and `resetError()`. `YeboIDSignInButton` renders sign-in failures in an alert and accepts an `onError` callback. Logout/refresh/network errors propagate; do not fabricate a successful login. The default storage is localStorage, so use a strong CSP and prevent XSS in your application. Never put client secrets in that storage.

Scope types include `business`, `business:kyc`, and `business:manage`. Business context never replaces the human subject. `IntrospectionResult` scope helpers require an active token. Public exports include the business claim types, typed errors, and storage helpers.

See [quickstart](https://docs.yeboid.com/getting-started), [permissions](https://docs.yeboid.com/permissions), [troubleshooting](https://docs.yeboid.com/troubleshooting), and [source](https://github.com/omegathesecond/yeboid-web-sdk). Publishing availability is verified separately from a successful build. MIT license.
