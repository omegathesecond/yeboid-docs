# Business accounts

A person has one identity and can belong to multiple businesses. Business context is explicit: `sub` stays the person; `business_id` and `business_role` identify the business context. Never replace a person ID with a business ID in your user table.

## Permissions and roles

Request `business` to list memberships and exchange a person access token for business context. Third-party apps receive only businesses selected during consent. `business:kyc` reveals legal identity only to an `OWNER` or `ADMIN`. `business:manage` permits management with a **person** token and the required role.

| Action | Role |
| --- | --- |
| Read membership/business profile | OWNER, ADMIN, MEMBER |
| Change profile/handle, invite or remove ordinary members | OWNER, ADMIN |
| Change roles, transfer ownership, delete business | OWNER |

Suspended businesses refuse management writes. A removed member loses business access when membership is rechecked. Business tokens never administer `/businesses/*`; obtain a person token for management.

## Exchange a token

```bash
curl https://api.yeboid.com/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=urn:ietf:params:oauth:grant-type:token-exchange' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'subject_token=PERSON_ACCESS_TOKEN' \
  --data-urlencode 'business_id=BUSINESS_ID'
```

Only an authenticated confidential client can receive a refresh credential from this exchange. Public clients receive business access context without a durable business refresh credential. Membership, application allowlists, consent, and suspension are checked again during relevant refresh/introspection/userinfo operations.

Use the resulting Bearer access token with `/oauth/userinfo`. `businesses` contains memberships; `business` describes the selected context. The SDK exports `BusinessRole`, `BusinessMembership`, and `BusinessInfo` types. Store business references without duplicating personal identity data.
