# User Management

Manage user profiles, settings, and account data.

## User Object

```json
{
  "id": "usr_abc123def456",
  "phone": "+26878422613",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://api.yeboid.com/avatars/usr_abc123.jpg",
  "kyc_status": "VERIFIED",
  "kyc_country": "SZ",
  "kyc_birthday": "1990-05-15",
  "kyc_verified_at": "2024-01-15T10:30:00Z",
  "created_at": "2023-06-01T08:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "metadata": {}
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique user identifier |
| `phone` | string | Phone number (E.164 format) |
| `name` | string | Display name |
| `email` | string | Email address |
| `avatar_url` | string | Profile picture URL |
| `kyc_status` | string | `NONE`, `PENDING`, `VERIFIED`, `REJECTED` |
| `kyc_country` | string | ISO 3166-1 alpha-2 country code |
| `kyc_birthday` | string | Date of birth (YYYY-MM-DD) |
| `kyc_verified_at` | string | ISO 8601 timestamp |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `metadata` | object | Custom key-value data |

## Get Current User

Retrieve the authenticated user's profile.

```
GET /api/v1/users/me
```

**Request:**

```bash
curl https://api.yeboid.com/api/v1/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response:**

```json
{
  "id": "usr_abc123def456",
  "phone": "+26878422613",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://api.yeboid.com/avatars/usr_abc123.jpg",
  "kyc_status": "VERIFIED",
  "kyc_country": "SZ",
  "created_at": "2023-06-01T08:00:00Z"
}
```

## Update Profile

Update the authenticated user's profile.

```
PATCH /api/v1/users/me
```

**Request:**

```bash
curl -X PATCH https://api.yeboid.com/api/v1/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

**Updatable Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | 1-100 characters |
| `email` | string | Must be valid email |
| `metadata` | object | Custom data (max 10KB) |

**Response:**

```json
{
  "id": "usr_abc123def456",
  "phone": "+26878422613",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "updated_at": "2024-02-28T14:30:00Z"
}
```

## Upload Avatar

Upload or update the user's profile picture.

```
POST /api/v1/users/me/avatar
```

**Request:**

```bash
curl -X POST https://api.yeboid.com/api/v1/users/me/avatar \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "avatar=@profile.jpg"
```

**Requirements:**

- Formats: JPEG, PNG, WebP
- Max size: 5MB
- Recommended: 256x256 or larger (will be resized)

**Response:**

```json
{
  "avatar_url": "https://api.yeboid.com/avatars/usr_abc123_v2.jpg"
}
```

## Delete Avatar

Remove the user's profile picture.

```
DELETE /api/v1/users/me/avatar
```

**Request:**

```bash
curl -X DELETE https://api.yeboid.com/api/v1/users/me/avatar \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Update Metadata

Store custom data on the user profile.

```
PATCH /api/v1/users/me/metadata
```

**Request:**

```bash
curl -X PATCH https://api.yeboid.com/api/v1/users/me/metadata \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "notifications": true,
      "theme": "dark"
    },
    "tier": "premium"
  }'
```

**Response:**

```json
{
  "metadata": {
    "preferences": {
      "notifications": true,
      "theme": "dark"
    },
    "tier": "premium"
  }
}
```

::: tip
Metadata is useful for storing app-specific user preferences without managing a separate database.
:::

## Delete Account

Permanently delete the user's account.

```
DELETE /api/v1/users/me
```

**Request:**

```bash
curl -X DELETE https://api.yeboid.com/api/v1/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

::: danger
This action is irreversible. All user data will be permanently deleted.
:::

## Server-to-Server: Get User by ID

For server-side applications with an API key.

```
GET /api/v1/users/:id
```

**Request:**

```bash
curl https://api.yeboid.com/api/v1/users/usr_abc123def456 \
  -H "Authorization: Bearer SERVER_API_KEY"
```

**Response:**

```json
{
  "id": "usr_abc123def456",
  "phone": "+26878422613",
  "name": "John Doe",
  "kyc_status": "VERIFIED",
  "kyc_country": "SZ",
  "created_at": "2023-06-01T08:00:00Z"
}
```

## Server-to-Server: Search Users

Search users by phone number.

```
GET /api/v1/users?phone=:phone
```

**Request:**

```bash
curl "https://api.yeboid.com/api/v1/users?phone=%2B26878422613" \
  -H "Authorization: Bearer SERVER_API_KEY"
```

**Response:**

```json
{
  "data": [
    {
      "id": "usr_abc123def456",
      "phone": "+26878422613",
      "name": "John Doe",
      "kyc_status": "VERIFIED"
    }
  ],
  "has_more": false
}
```

## Errors

| Code | Description |
|------|-------------|
| `user_not_found` | User doesn't exist |
| `invalid_email` | Email format is invalid |
| `email_taken` | Email is already in use |
| `file_too_large` | Avatar exceeds 5MB |
| `invalid_file_type` | Avatar must be JPEG, PNG, or WebP |
