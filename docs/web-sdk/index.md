# Web SDK

The official YeboID SDK for browser apps. It runs the OAuth 2.0 + PKCE
authorization-code flow entirely in the browser (no client secret), stores and silently
refreshes tokens, and gives you an authenticated `fetch`. Ships a framework-agnostic
client plus first-class React bindings.

- **Package:** [`@omevision/yeboid-web`](https://www.npmjs.com/package/@omevision/yeboid-web)
- **Source:** [omegathesecond/yeboid-web-sdk](https://github.com/omegathesecond/yeboid-web-sdk)
- **Targets:** Any bundler (Vite, Next.js, Webpack). React entry point at `@omevision/yeboid-web/react`.

## Installation

```bash
npm install @omevision/yeboid-web
```

::: warning Private package
`@omevision/yeboid-web` is published under the private `@omevision` npm scope. You need
an npm token with read access to that scope before `npm install` will succeed —
including in your CI / Pages build container. Add it to `~/.npmrc`:

```
//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxx
```
:::

::: tip Public client — no secret
Browser apps are **public clients**: they must never embed a `clientSecret`. The Web SDK
uses PKCE, so you only need your `clientId` and a registered `redirectUri`. Create an app
in the [developer portal](/register-app) to get them.
:::

## Vanilla JS / TypeScript

```typescript
import { YeboIDClient } from '@omevision/yeboid-web';

const yeboid = new YeboIDClient({
  clientId: import.meta.env.VITE_YEBOID_CLIENT_ID,
  redirectUri: `${window.location.origin}/auth/callback`,
  scope: 'openid profile phone',
});

// On your callback route: finish the login
if (YeboIDClient.isCallbackUrl(window.location)) {
  const { user } = await yeboid.handleCallback();
  console.log('Signed in as', user.name);
  window.history.replaceState({}, '', '/'); // clean ?code & ?state from the URL
}

// Trigger a login (redirects to YeboID)
document.querySelector('#login')!.addEventListener('click', () => yeboid.signIn());

// Make an authenticated request — Bearer token is attached and refreshed on 401
const res = await yeboid.fetch('https://api.myapp.com/me');

// Sign out (revokes the token and clears the SSO cookie)
await yeboid.signOut();
```

### Client options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientId` | `string` | — | **Required.** Your app's client ID. |
| `redirectUri` | `string` | — | **Required.** Must match a registered redirect URI. |
| `scope` | `string \| string[]` | `'openid profile phone email kyc'` | Requested scopes. |
| `autoRefresh` | `boolean` | `true` | Pre-emptively refresh the access token before it expires. |
| `refreshLeadSeconds` | `number` | `60` | How many seconds before expiry to refresh. |
| `storage` | `Storage` | `localStorage`-backed | Where to persist the token set. |

The SDK also accepts `authUrl`, `tokenUrl`, `userinfoUrl`, and `logoutUrl` overrides; the
defaults already point at the YeboID production endpoints, so you typically don't set them.

## React

Wrap your app in `YeboIDProvider`, then use the `useYeboID()` hook anywhere.

```tsx
// main.tsx
import { YeboIDProvider } from '@omevision/yeboid-web/react';

export function App() {
  return (
    <YeboIDProvider
      config={{
        clientId: import.meta.env.VITE_YEBOID_CLIENT_ID,
        redirectUri: `${window.location.origin}/auth/callback`,
        scope: 'openid profile phone',
      }}
    >
      <ProfileButton />
    </YeboIDProvider>
  );
}
```

```tsx
import { useYeboID } from '@omevision/yeboid-web/react';

function ProfileButton() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useYeboID();

  if (isLoading) return <span>Loading…</span>;
  if (!isAuthenticated) return <button onClick={() => signIn()}>Sign in with Yebo</button>;

  return (
    <div>
      <span>Hi, {user?.name}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

The provider automatically detects the callback URL and completes the token exchange, so
you don't need to call `handleCallback()` yourself in React.

### `useYeboID()` returns

| Field | Description |
|-------|-------------|
| `user` | The signed-in `YeboIDUserInfo`, or `null`. |
| `isAuthenticated` | `true` when a user is signed in. |
| `isLoading` | `true` while restoring/finishing a session. |
| `signIn(role?)` | Start the login redirect. |
| `signOut()` | Revoke the token and clear the session. |
| `fetch(input, init?)` | Authenticated `fetch` with auto-refresh on 401. |
| `on(handler)` | Subscribe to `login` / `logout` / `refresh` events. Returns an unsubscribe fn. |
| `client` | The underlying `YeboIDClient` instance, for advanced use. |
| `registerIntentHandler(kind, handler)` | Register a handler that runs a [pending intent](#resume-an-action-after-login) of the given `kind` once the user is authenticated. Returns an unsubscribe fn. |

### Authenticated requests in React

```tsx
const { fetch } = useYeboID();
const res = await fetch('https://api.myapp.com/orders');
const orders = await res.json();
```

## Resume an action after login

Use pending intents to capture what the user was doing before they signed in, and replay
it once they're authenticated (e.g. "add to cart" → login → cart updated). These helpers
ship from the **`/react` entry point** (`@omevision/yeboid-web/react`), not the root
package.

```typescript
import { setPendingIntent, consumePendingIntent } from '@omevision/yeboid-web/react';

// Before redirecting to login:
setPendingIntent({ kind: 'add-to-cart', productId: 'abc' });
await yeboid.signIn();

// After handleCallback() resolves:
const intent = consumePendingIntent<{ kind: string; productId: string }>();
if (intent?.kind === 'add-to-cart') addToCart(intent.productId);
```

In React, the idiomatic equivalent is `registerIntentHandler` from `useYeboID()`, which
fires automatically once the user is authenticated:

```tsx
const { registerIntentHandler } = useYeboID();

useEffect(
  () =>
    registerIntentHandler<{ kind: 'add-to-cart'; productId: string }>(
      'add-to-cart',
      (intent) => addToCart(intent.productId),
    ),
  [],
);
```

## The user object

`YeboIDUserInfo` uses standard OIDC claim names. Fields are only present when the user
granted the matching scope and the data exists:

```typescript
interface YeboIDUserInfo {
  sub: string;                      // YeboID user ID — store this as your FK
  name?: string;                    // requires `profile`
  preferred_username?: string;      // the user's handle — requires `profile`
  picture?: string;                 // requires `profile`
  phone_number?: string;            // requires `phone`
  phone_number_verified?: boolean;
  email?: string;                   // requires `email`
  email_verified?: boolean;
  kyc_status?: string;              // requires `kyc`
  country?: string;                 // ISO 3166-1 alpha-2 — requires `kyc`
  currency?: string;                // ISO 4217 — requires `kyc`
  currency_symbol?: string;         // requires `kyc`
}
```

::: tip
There is no `handle` or `phone` field — use `preferred_username` and `phone_number`. The
granted scopes are exposed on the token set (`TokenSet.scope`), not on the user object.
:::

## Next steps

- [OAuth 2.0 + PKCE flow in depth](/authentication/)
- [PKCE explained](/authentication/pkce)
- [OAuth / OIDC API reference](/api-reference/oauth)
- [Register your app](/register-app)
