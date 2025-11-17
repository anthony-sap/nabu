# WhatsApp Integration Quick Reference

## Quick Start

### 1. Environment Setup

Add to `.env`:

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_secure_token
WHATSAPP_WEBHOOK_SECRET=random_secure_secret
```

### 2. Database Migration

```bash
npx prisma migrate dev --name add_whatsapp_models
npx prisma generate
```

### 3. Create Integration Record

Using Prisma Studio:

```bash
npx prisma studio
```

Or SQL:

```sql
INSERT INTO "WhatsAppIntegration" (
  id, phoneNumberId, businessAccountId, phoneNumber,
  accessToken, webhookSecret, mode, isActive, createdAt, updatedAt
) VALUES (
  'YOUR_CUID', 'PHONE_NUMBER_ID', 'BUSINESS_ACCOUNT_ID', '+1234567890',
  'ACCESS_TOKEN', 'WEBHOOK_SECRET', 'personal', true, NOW(), NOW()
);
```

## Key Components

### Webhook Flow

```
WhatsApp → /api/webhooks/whatsapp → WhatsAppMessage DB → processWhatsAppMessage()
  ↓
Is phone linked?
  NO  → Send linking message
  YES → Create Thought → Send acknowledgment
```

### Linking Flow

```
User sends message → Generate token → Send link via WhatsApp
  ↓
User clicks link → Verify token → Show confirmation page
  ↓
User confirms → Create UserPhoneLink → Send confirmation
```

## Key Files

### Libraries
- `lib/whatsapp-client.ts` - API client
- `lib/whatsapp-webhook.ts` - Webhook parsing
- `lib/whatsapp-link.ts` - Linking logic
- `lib/whatsapp-processor.ts` - Message processing

### API Routes
- `app/api/webhooks/whatsapp/route.ts` - Receive messages
- `app/api/whatsapp/link/route.ts` - Confirm linking
- `app/api/whatsapp/link/[linkId]/route.ts` - Unlink

### UI Components
- `app/nabu/whatsapp/link/[token]/page.tsx` - Link verification
- `app/(protected)/dashboard/settings/whatsapp/page.tsx` - Settings
- `components/whatsapp/link-confirm.tsx` - Confirmation UI
- `components/whatsapp/settings-form.tsx` - Settings UI

## Common Tasks

### Send a Message

```typescript
import { getWhatsAppClient } from "@/lib/whatsapp-client";

const client = await getWhatsAppClient(tenantId);
if (client) {
  await client.sendTextMessage("+1234567890", "Hello!");
}
```

### Check if Phone is Linked

```typescript
import { getLinkedUser } from "@/lib/whatsapp-link";

const user = await getLinkedUser("+1234567890", tenantId);
if (user) {
  console.log("Linked to user:", user.userId);
}
```

### Generate Link Token

```typescript
import { generateLinkToken } from "@/lib/whatsapp-link";

const token = await generateLinkToken("+1234567890", "msg_id_123");
const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/nabu/whatsapp/link/${token}`;
```

### Process a Message

```typescript
import { processWhatsAppMessage } from "@/lib/whatsapp-processor";

await processWhatsAppMessage("whatsapp_message_id");
```

## Database Models

### WhatsAppIntegration
- **Purpose**: Tenant-level configuration
- **Key Fields**: `phoneNumberId`, `accessToken`, `webhookSecret`
- **Lookup**: By `tenantId` and `isActive = true`

### UserPhoneLink
- **Purpose**: Map phones to users
- **Key Fields**: `userId`, `phoneNumber`, `isActive`
- **Lookup**: By `phoneNumber` and `tenantId`
- **Unique**: `(phoneNumber, tenantId)`

### WhatsAppLinkToken
- **Purpose**: One-time linking tokens
- **Key Fields**: `token`, `phoneNumber`, `expiresAt`, `usedAt`
- **Expiry**: 15 minutes
- **One-time**: `usedAt` must be null

### WhatsAppMessage
- **Purpose**: Raw message storage
- **Key Fields**: `whatsappMessageId`, `fromNumber`, `processed`
- **Lookup**: By `whatsappMessageId` or `processed = false`

## Debugging

### Check Webhook Logs

```bash
# Server logs show:
# - Webhook signature verification
# - Message parsing
# - Processing errors
```

### Inspect Database

```bash
npx prisma studio

# Check:
# - WhatsAppMessage for incoming messages
# - UserPhoneLink for active links
# - WhatsAppLinkToken for token status
```

### Test Webhook Locally

Use ngrok for local testing:

```bash
ngrok http 3000
# Use ngrok URL in Meta webhook config
```

## Troubleshooting

### Webhook Verification Failed (Facebook Setup)

**Error: "The callback URL or verify token couldn't be validated"**

This happens during initial webhook setup in Facebook. Here's how to fix it:

#### Step 1: Check if your server is reachable
```bash
# Test your webhook endpoint
curl "https://your-domain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Should return: test123
```

#### Step 2: Verify environment variables
1. Check your `.env` file has:
   ```env
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_token_here
   ```
2. **Restart your server** after adding/changing .env
3. The token in Facebook MUST match your .env exactly (case-sensitive!)

#### Step 3: For local development
Use ngrok to expose your local server:
```bash
ngrok http 3000
# Use the ngrok URL: https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

#### Step 4: Check server logs
When Facebook verifies, you should see:
```
WhatsApp webhook verified
```

If you see nothing, Facebook can't reach your server.

#### Common Mistakes:
- ❌ Server not running
- ❌ Forgot to restart server after .env changes
- ❌ Typo in webhook URL
- ❌ Using HTTP instead of HTTPS
- ❌ Tokens don't match between Facebook and .env
- ❌ Firewall blocking Facebook's requests

### Message not creating Thought
1. Check `WhatsAppMessage.processed = false`
2. Check `WhatsAppMessage.error` field
3. Verify phone is linked in `UserPhoneLink`
4. Ensure `WhatsAppIntegration` record exists and is active

### Link token expired
1. Check `WhatsAppLinkToken.expiresAt`
2. User must request new link by sending another message

### Signature verification failed (after webhook is verified)

**Error: "Invalid WhatsApp webhook signature" (401)**

This means Facebook is sending messages but the signature doesn't match.

**Quick Fix:**
```env
# Use your Facebook App Secret, NOT a random string
WHATSAPP_WEBHOOK_SECRET=your_facebook_app_secret
```

**Where to find App Secret (detailed steps):**
1. Go to: https://developers.facebook.com/apps
2. Click your WhatsApp app
3. Left sidebar: Click **Settings** → **Basic**
4. Find "App Secret" row (shows dots: `••••••••••`)
5. Click **[Show]** button
6. Enter your Facebook password
7. Copy the revealed 32-character secret
8. Paste into `.env` as `WHATSAPP_WEBHOOK_SECRET`
9. Restart server

**Debug it:**
```typescript
// Add to route.ts before signature check
console.log("Signature from FB:", signature);
console.log("Secret set:", env.WHATSAPP_WEBHOOK_SECRET ? "YES" : "NO");
const expected = crypto.createHmac("sha256", env.WHATSAPP_WEBHOOK_SECRET)
  .update(body).digest("hex");
console.log("Expected:", `sha256=${expected}`);
console.log("Match:", signature === `sha256=${expected}`);
```

**Common mistakes:**
- ❌ Using verify token instead of app secret
- ❌ Using random generated string  
- ❌ Forgot to restart server
- ✅ Use Facebook App Secret

## Rate Limits

WhatsApp Cloud API (Free Tier):
- **Conversations**: 1000 per 24 hours
- **Messages**: 250 per second
- **API Calls**: 200 per hour

## Security Checklist

- [ ] Access tokens in environment variables only
- [ ] Webhook signature verification enabled
- [ ] HTTPS for webhook URL
- [ ] Link tokens expire in 15 minutes
- [ ] One-time token use enforced
- [ ] Soft deletes for audit trail

## Next Steps

After basic setup:
1. Test end-to-end flow
2. Monitor error logs
3. Set up error alerting
4. Document for your team
5. Plan media handling enhancement

