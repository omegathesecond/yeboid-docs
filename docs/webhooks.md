# Webhooks

YeboID can send HTTP webhooks to your server when events occur.

## Overview

Webhooks allow your application to receive real-time notifications about:
- User registration
- KYC verification status changes
- Account updates
- Session events

## Setup

Configure webhooks in the [YeboID Dashboard](https://yeboid.com/dashboard):

1. Go to **Settings** → **Webhooks**
2. Click **Add Endpoint**
3. Enter your webhook URL
4. Select events to subscribe to
5. Copy the signing secret

## Webhook Format

All webhooks are HTTP POST requests with JSON body:

```http
POST /your-webhook-endpoint
Content-Type: application/json
X-YeboID-Signature: sha256=abc123...
X-YeboID-Timestamp: 1710770000
X-YeboID-Event: user.verified
```

### Payload Structure

```json
{
  "id": "evt_abc123",
  "type": "user.verified",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

## Verifying Signatures

Always verify webhook signatures to ensure requests are from YeboID:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const timestamp = req.headers['x-yeboid-timestamp'];
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// In your endpoint:
app.post('/webhooks/yeboid', (req, res) => {
  const signature = req.headers['x-yeboid-signature'];
  
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
  res.status(200).send('OK');
});
```

## Events

### user.created

Fired when a new user signs up.

```json
{
  "id": "evt_abc123",
  "type": "user.created",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+26878422613",
      "handle": "laslie",
      "name": "Laslie Georges Jr.",
      "created_at": "2026-03-18T20:00:00Z"
    }
  }
}
```

---

### user.updated

Fired when user profile is updated.

```json
{
  "id": "evt_abc123",
  "type": "user.updated",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user": {
      "id": "uuid",
      "handle": "laslie",
      "name": "Laslie G.",
      "avatar_url": "https://...",
      "updated_at": "2026-03-18T20:00:00Z"
    },
    "changed_fields": ["name", "avatar_url"]
  }
}
```

---

### user.deleted

Fired when user deletes their account.

```json
{
  "id": "evt_abc123",
  "type": "user.deleted",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "uuid",
    "deleted_at": "2026-03-18T20:00:00Z"
  }
}
```

---

### kyc.submitted

Fired when user submits KYC verification.

```json
{
  "id": "evt_abc123",
  "type": "kyc.submitted",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "uuid",
    "verification_id": "ver_xyz",
    "submitted_at": "2026-03-18T20:00:00Z"
  }
}
```

---

### kyc.verified

Fired when KYC verification is approved.

```json
{
  "id": "evt_abc123",
  "type": "kyc.verified",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "uuid",
    "verification_id": "ver_xyz",
    "verified_at": "2026-03-18T20:00:00Z",
    "country": "SZ",
    "documents": ["id_card"]
  }
}
```

---

### kyc.rejected

Fired when KYC verification is rejected.

```json
{
  "id": "evt_abc123",
  "type": "kyc.rejected",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "uuid",
    "verification_id": "ver_xyz",
    "rejected_at": "2026-03-18T20:00:00Z",
    "reason": "document_unclear",
    "message": "ID card photo is blurry"
  }
}
```

---

### session.created

Fired when user logs in.

```json
{
  "id": "evt_abc123",
  "type": "session.created",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "uuid",
    "session_id": "sess_xyz",
    "device_name": "iPhone 15 Pro",
    "platform": "ios",
    "ip_address": "102.xxx.xxx.xxx"
  }
}
```

---

### session.revoked

Fired when a session is revoked (logout or security).

```json
{
  "id": "evt_abc123",
  "type": "session.revoked",
  "created_at": "2026-03-18T20:00:00Z",
  "data": {
    "user_id": "uuid",
    "session_id": "sess_xyz",
    "reason": "user_logout"
  }
}
```

---

## Retry Policy

If your endpoint returns a non-2xx status code, YeboID will retry:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 24 hours |

After 6 failed attempts, the webhook is marked as failed.

## Best Practices

### 1. Respond Quickly

Return `200 OK` immediately, then process asynchronously:

```javascript
app.post('/webhooks/yeboid', (req, res) => {
  // Verify signature first
  if (!verifySignature(req.body, ...)) {
    return res.status(401).send('Invalid');
  }
  
  // Respond immediately
  res.status(200).send('OK');
  
  // Process async
  processWebhook(req.body).catch(console.error);
});
```

### 2. Handle Duplicates

Webhooks may be delivered multiple times. Use `event.id` to deduplicate:

```javascript
async function processWebhook(event) {
  // Check if already processed
  const exists = await db.webhookEvents.findOne({ id: event.id });
  if (exists) return;
  
  // Mark as processing
  await db.webhookEvents.insert({ id: event.id, status: 'processing' });
  
  // Process event...
  
  // Mark as complete
  await db.webhookEvents.update({ id: event.id }, { status: 'complete' });
}
```

### 3. Verify Signatures

**Always** verify the signature before processing:

```javascript
const signature = req.headers['x-yeboid-signature'];
const timestamp = req.headers['x-yeboid-timestamp'];

// Check timestamp to prevent replay attacks
const now = Math.floor(Date.now() / 1000);
if (Math.abs(now - parseInt(timestamp)) > 300) {
  return res.status(401).send('Timestamp too old');
}

if (!verifySignature(req.body, signature, secret)) {
  return res.status(401).send('Invalid signature');
}
```

### 4. Use HTTPS

Always use HTTPS endpoints to protect webhook data in transit.

## Testing

### Manual Testing

Use the Dashboard to send test webhooks:

1. Go to **Settings** → **Webhooks**
2. Click on your endpoint
3. Click **Send Test Event**
4. Select event type
5. Check your server logs

### Local Development

Use a tunnel service like ngrok:

```bash
ngrok http 3000
# Use the HTTPS URL as your webhook endpoint
```

## Event Log

View recent webhook deliveries in the Dashboard:

1. Go to **Settings** → **Webhooks**
2. Click on your endpoint
3. View **Recent Deliveries**

Each delivery shows:
- Event type
- Timestamp
- Response status
- Response body
- Retry attempts
