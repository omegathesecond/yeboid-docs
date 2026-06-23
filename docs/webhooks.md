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
delivery to a subscription.

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

## Verifying signatures

YeboID signs **`${timestamp}.${rawBody}`** with HMAC-SHA256 using your subscription's
signing secret, hex-encodes it, and prefixes it with `v1=`. Verify against the **raw
request body bytes** — parsing and re-serializing the JSON can change the bytes and break
the check.

```javascript
const crypto = require('crypto');

function verifySignature(rawBody, signatureHeader, timestamp, secret) {
  const expected =
    'v1=' +
    crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

  // Constant-time comparison
  return (
    signatureHeader.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
  );
}

// Express — note express.raw() so req.body is the raw Buffer
app.post(
  '/webhooks/yeboid',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.header('X-YeboID-Signature') ?? '';
    const timestamp = req.header('X-YeboID-Timestamp') ?? '';
    const rawBody = req.body.toString('utf8');

    // Reject deliveries more than 5 minutes old (replay protection)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) {
      return res.status(401).send('Stale timestamp');
    }

    if (!verifySignature(rawBody, signature, timestamp, WEBHOOK_SECRET)) {
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    res.status(200).send('OK'); // respond fast, then process async
    handleEvent(event).catch(console.error);
  },
);
```

::: tip Node.js SDK
The [Node.js SDK](/node-sdk/#verifying-webhooks) shows the same verification inline. YeboID
enforces a **300-second** timestamp tolerance on its side too, and your endpoint should do
the same to guard against replays.
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
