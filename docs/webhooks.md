# Webhooks

YeboID can send HTTP webhooks to your server when events occur — so you can keep your
copy of `yeboid_user_id` → app state in sync without polling.

## Overview

Subscribe an HTTPS endpoint to one or more event types. When a subscribed event fires,
YeboID `POST`s a signed JSON payload to your URL. You verify the signature, then process
the event.

## Subscribe to webhooks

Create a subscription with an authenticated request to the API (you must be signed in to
YeboID as the owner of the app):

```bash
POST https://api.yeboid.com/webhooks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/yeboid",
  "events": ["user.kyc.verified", "user.updated"]
}
```

The response includes the **signing secret** — it is shown **once**, so store it
securely:

```json
{
  "success": true,
  "data": {
    "id": "whk_abc123",
    "url": "https://yourapp.com/webhooks/yeboid",
    "events": ["user.kyc.verified", "user.updated"],
    "secret": "whsec_8f3c...store-this-now"
  }
}
```

Use `GET /webhooks/events` to fetch the list of available event names programmatically,
`GET /webhooks` to list your subscriptions, `PATCH /webhooks/:id` to change the URL or
events, and `DELETE /webhooks/:id` to remove one. `POST /webhooks/test` sends a test
delivery to a subscription, and [`GET /webhooks/:id/events`](#delivery-log) reads back the
delivery log.

## Webhook format

Every delivery is an HTTP `POST` with a JSON body and signature headers:

```http
POST /your-webhook-endpoint
Content-Type: application/json
X-YeboID-Signature: v1=3045b1c9...
X-YeboID-Timestamp: 1710770000
X-YeboID-Event: user.kyc.verified
X-YeboID-Delivery-ID: dlv_abc123
```

### Payload structure

```json
{
  "id": "evt_abc123",
  "event": "user.kyc.verified",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

The event type is the **`event`** field (and the `X-YeboID-Event` header).

Webhook URLs must use **HTTPS** and resolve to public addresses. Plaintext HTTP, internal addresses and redirects are refused both when configuring a subscription and when sending it.

## Verifying signatures

YeboID signs **`${timestamp}.${rawBody}`** with HMAC-SHA256 using your subscription's
signing secret, hex-encodes it, and prefixes it with `v1=`. Verify against the **raw
request body bytes** — parsing and re-serializing the JSON can change the bytes and break
the check.

```ts
import { YeboID } from '@omevision/yeboid-node';
const identity = new YeboID({ clientId: process.env.YEBOID_CLIENT_ID! });

// Register this before express.json(). `inbox` is your durable queue/storage.
app.post('/webhooks/yeboid', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    if (!identity.verifyWebhook(req.body,
      req.get('X-YeboID-Signature') ?? '', process.env.YEBOID_WEBHOOK_SECRET!,
      req.get('X-YeboID-Timestamp') ?? '')) return res.sendStatus(401);
    const event = JSON.parse(req.body.toString('utf8'));
    await inbox.storeOnce(event.id, event);
    res.sendStatus(200);
  } catch (error) { next(error); }
});
```

::: tip Node.js SDK
The [Node.js SDK](/node-sdk/#verify-webhooks) implements strict signature and timestamp checks with a **300-second** replay window. Your application must store each event ID durably before acknowledging it so retries cannot apply the same change twice.
:::

## Events

Subscribe to any of these event names:

| Event | Fires when |
|-------|------------|
| `user.created` | A new user signs up. |
| `user.updated` | A user's profile is updated. |
| `user.deleted` | A user deletes their account. |
| `user.kyc.submitted` | A user submits KYC verification. |
| `user.kyc.verified` | A user's KYC is approved. |
| `user.kyc.rejected` | A user's KYC is rejected. |
| `app.authorized` | A user authorizes (consents to) your app. |
| `app.revoked` | A user disconnects your app. |
| `session.created` | A user signs in. |
| `session.destroyed` | A user's session ends (logout or revocation). |

### Which events you actually receive {#delivery-scope}

Subscribing is not the same as receiving. YeboID is the PII boundary for every Yebo
product, so it will not stream a user's events to an app that user never connected.
Every delivery is authorized against the subscribing app before it is sent, and an event
that cannot be authorized is delivered to **no one** rather than broadcast.

| Events | You receive them for |
|--------|----------------------|
| `user.created`, `user.updated`, `user.deleted`, `session.created`, `session.destroyed` | Users who hold a **live grant** for your app — they signed in with YeboID and have not disconnected you. |
| `user.kyc.submitted`, `user.kyc.verified`, `user.kyc.rejected` | Users whose live grant **also carries a `kyc` or `kyc:full` scope**. Requesting the scope at authorize time is what opens this stream. |
| `app.authorized`, `app.revoked` | Only your own app — these are never broadcast to anyone else. |

Two consequences worth designing around:

- **`user.created` is not a global signup feed.** It fires for a user only once your app
  holds a grant for them, so treat it as "a user connected and is new to you", not as
  "someone, somewhere, signed up for YeboID".
- **`app.revoked` still reaches you.** It fires as the grant is being torn down, and is
  deliberately exempt from the grant check so you are told to stop using tokens you can
  no longer refresh.

::: warning Subscribed but receiving nothing?
The usual cause is the gate above rather than a broken endpoint — most often KYC events
without a `kyc` scope on the grant. Check the [delivery log](#delivery-log): a request
that was never authorized produces no delivery attempt at all, whereas a delivered-but-
failing endpoint shows attempts with error responses. Use
`POST /webhooks/test` (see [Local development](#local-development)) to confirm the
endpoint itself is reachable.
:::

### Example payloads

`user.kyc.verified`:

```json
{
  "id": "evt_abc123",
  "event": "user.kyc.verified",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "usr_abc123",
    "verification_id": "ver_xyz",
    "verified_at": "2026-03-18T20:00:00Z",
    "country": "SZ"
  }
}
```

`user.updated`:

```json
{
  "id": "evt_def456",
  "event": "user.updated",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "usr_abc123",
    "changed_fields": ["name", "avatar_url"]
  }
}
```

`user.deleted`:

```json
{
  "id": "evt_ghi789",
  "event": "user.deleted",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "usr_abc123",
    "deleted_at": "2026-03-18T20:00:00Z"
  }
}
```

## Retry policy

If your endpoint doesn't return a 2xx status (or the request fails), YeboID retries with
backoff:

| Attempt | Delay after previous |
|---------|----------------------|
| 1 | immediate |
| 2 | 1 minute |
| 3 | 5 minutes |

Delivery is attempted at most **3 times** (with a 30-second request timeout). After the
final attempt fails, the delivery is marked failed. Make your handler **idempotent** and
deduplicate on the event `id`, since a delivery can arrive more than once.

## Delivery log

To debug deliveries, read back the recorded events:

```bash
GET https://api.yeboid.com/webhooks/:id/events?status=FAILED&limit=50
Authorization: Bearer <access_token>
```

`:id` is one of your subscription IDs — it is used to prove you own the app.

::: warning Results are app-scoped, not subscription-scoped
Despite the path, the response contains events for **every subscription belonging to
that app**, not only the subscription in the URL. Filter by `subscriptionId` client-side
if you need a single subscription's history.
:::

| Query param | Values | Default |
|-------------|--------|---------|
| `status` | `PENDING`, `DELIVERED`, `FAILED` | all statuses |
| `limit` | 1–100 (values above 100 are clamped) | 50 |

Events come back newest-first:

```json
{
  "success": true,
  "events": [
    {
      "id": "evt_abc123",
      "subscriptionId": "whk_abc123",
      "event": "user.kyc.verified",
      "payload": { "...": "..." },
      "status": "FAILED",
      "attempts": 3,
      "lastAttemptAt": "2026-03-18T20:05:00.000Z",
      "nextRetryAt": null,
      "createdAt": "2026-03-18T20:00:00.000Z"
    }
  ]
}
```

A `status` of `FAILED` with `attempts: 3` means the delivery is terminal — it will not be
retried again.

## Best practices

### Respond quickly

Return `200 OK` as soon as you've verified the signature, then process asynchronously — a
slow handler can trip the 30-second timeout and trigger a retry.

### Handle duplicates

```javascript
async function handleEvent(event) {
  const exists = await db.webhookEvents.findOne({ id: event.id });
  if (exists) return; // already processed
  await db.webhookEvents.insert({ id: event.id, status: 'processing' });
  // ... process event.event / event.data ...
  await db.webhookEvents.update({ id: event.id }, { status: 'complete' });
}
```

### Always verify the signature

Reject any request whose `X-YeboID-Signature` doesn't match, and any whose
`X-YeboID-Timestamp` is outside the 300-second window.

### Use HTTPS

Webhook URLs must be HTTPS so payloads are encrypted in transit.

## Local development

Expose your local server with a tunnel and point a subscription at the public URL:

```bash
ngrok http 3000
# Subscribe https://<id>.ngrok.io/webhooks/yeboid via POST /webhooks
```

Then trigger a test delivery with `POST /webhooks/test`.
