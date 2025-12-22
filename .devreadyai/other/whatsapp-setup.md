# WhatsApp Integration Setup Guide

## Overview

This guide walks you through setting up the WhatsApp Business Cloud API integration for Nabu. Users will be able to send messages to a WhatsApp bot number, link their phone to their Nabu account, and automatically create Thoughts from their messages.

## Quick Troubleshooting

Having issues? Jump to these common problems:

- **[Webhook verification failed](#66-troubleshooting-webhook-verification)** - Can't verify webhook in Facebook
- **[Signature verification failed](#signature-verification-failed-after-webhook-is-set-up)** - Getting 401 errors after webhook is set up
- **[Messages not creating Thoughts](#messages-not-creating-thoughts)** - Webhook works but no Thoughts appear

## Prerequisites

Before starting, you'll need:

1. **Meta Business Account** - Create one at [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business App** - Set up in Meta Business Suite
3. **Verified Phone Number** - For the WhatsApp bot (test number for development, real number for production)
4. **Public webhook URL** - Your Nabu instance must be publicly accessible for Meta to send webhooks

## Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create Account"
3. Follow the setup wizard to create your business account
4. Verify your business details

## Step 2: Create WhatsApp Business App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in app details:
   - **App Name**: "Nabu WhatsApp Bot" (or your preferred name)
   - **App Contact Email**: Your business email
   - **Business Account**: Select your business account from Step 1
5. Click "Create App"

## Step 3: Add WhatsApp to Your App

1. In your app dashboard, find "WhatsApp" product
2. Click "Set up" to add WhatsApp to your app
3. You'll be taken to the WhatsApp setup page

## Step 4: Configure Phone Number

### For Testing (Development)

1. In WhatsApp setup, you'll see a test phone number provided by Meta
2. Add your personal phone number as a test recipient
3. Send a test message to verify it works
4. Note down the **Phone Number ID** (you'll need this later)

### For Production

1. Click "Add Phone Number"
2. Verify your business phone number
3. Complete the verification process
4. Note down the **Phone Number ID**

## Step 5: Get Access Tokens

### Temporary Access Token (for testing)

1. In WhatsApp setup, copy the temporary access token
2. This expires after 24 hours - use only for initial testing

### Permanent Access Token (for production)

1. Go to "App Settings" → "Basic"
2. Copy your **App ID** and **App Secret**
3. Go to "System Users" in Business Settings
4. Create a new system user (e.g., "Nabu Bot")
5. Assign the system user to your WhatsApp app
6. Generate a permanent access token with these permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
7. Save this token securely - you cannot retrieve it again

## Step 6: Configure Webhook

### 6.1 Get Your Webhook Credentials

You need two different credentials for webhook setup:

#### 1. Verify Token (for webhook setup)
Generate a random secure string - this is YOUR choice:

```bash
# On Linux/Mac/Git Bash
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or in PowerShell (Windows)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**Example output:**
```
a3f5c8b2e1d4f9a7c6b5e8d2f1a4c7b9e5d8f2a1c4b7e9d3f6a8c5b2e1d4f7a9
```

#### 2. Webhook Secret (for message signature verification)
**Use your Facebook App Secret** - get it from Facebook:

1. **Go to Facebook Developers**: https://developers.facebook.com/apps
2. **Click on your WhatsApp app** (the one you created for Nabu)
3. **In the left sidebar, click "Settings"**
4. **Click "Basic"** (first option under Settings)
5. **Find the "App Secret" row** in the table
   - You'll see: `App Secret: ••••••••••••••••••••••••••••••••`
6. **Click the "Show" button** next to the dots
7. **Enter your Facebook password** when prompted
8. **Copy the revealed secret** (looks like: `1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d`)

**Visual Guide:**
```
Before clicking Show:
App Secret: ••••••••••••••••••••••••••••••••  [Show] ← Click this

After clicking Show and entering password:
App Secret: 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d  [Hide] ← Copy this!
```

**IMPORTANT:** 
- The **Verify Token** is a random string you create
- The **Webhook Secret** is your **Facebook App Secret** (from Settings → Basic)
- Save both - you'll need them for your `.env` file

### 6.2 Configure Environment Variables FIRST

**Before adding the webhook in Facebook**, add these to your `.env` file:

```env
# Random string you generated in step 6.1.1
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_verify_token

# Your Facebook App Secret from step 6.1.2 (Settings → Basic)
WHATSAPP_WEBHOOK_SECRET=your_facebook_app_secret
```

**Example:**
```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=a3f5c8b2e1d4f9a7c6b5e8d2f1a4c7b9e5d8f2a1c4b7e9d3f6a8c5b2e1d4f7a9
WHATSAPP_WEBHOOK_SECRET=1234567890abcdef1234567890abcdef  # Your actual Facebook App Secret
```

⚠️ **Common Mistake:** Don't use a random string for `WHATSAPP_WEBHOOK_SECRET` - it MUST be your Facebook App Secret!

**Then restart your Nabu server** - this is critical! The environment variables must be loaded.

### 6.3 Ensure Your Server is Publicly Accessible

Facebook must be able to reach your webhook endpoint to verify it.

**For Local Development:**
Use ngrok to expose your local server:
```bash
ngrok http 3000
# You'll get a URL like: https://abc123.ngrok-free.app
```

Your webhook URL will be: `https://abc123.ngrok-free.app/api/webhooks/whatsapp`

**For Production:**
- Ensure your domain is publicly accessible
- Must use HTTPS (not HTTP)
- No firewall blocking Facebook's IPs
- Server must be running and healthy

**Test Your Endpoint:**
```bash
# Replace with your actual URL and token
curl "https://your-domain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"

# If working, should return: test123
```

### 6.4 Add Webhook URL to Meta

1. In your WhatsApp app dashboard, go to "WhatsApp" → "Configuration"
2. Click "Edit" next to "Webhook"
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/webhooks/whatsapp
   ```
   ⚠️ **For ngrok**: Use `https://YOUR_NGROK_ID.ngrok-free.app/api/webhooks/whatsapp`
   
4. Enter the **Verify Token** - must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` from your `.env`
5. Click "Verify and Save"

### 6.5 What Happens During Verification

When you click "Verify and Save":

1. **Facebook sends a GET request** to your webhook URL:
   ```
   GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING
   ```

2. **Your Nabu endpoint checks:**
   - If `hub.mode === "subscribe"`
   - If `hub.verify_token === WHATSAPP_WEBHOOK_VERIFY_TOKEN` (from your .env)
   - If they match, returns the `hub.challenge` string

3. **Facebook verifies** the response matches the challenge

### 6.6 Troubleshooting Webhook Verification

If you get an error during verification:

**Error: "The callback URL or verify token couldn't be validated"**

Possible causes:
1. **Server not accessible**
   - Check if your URL is publicly reachable
   - Test with curl (see step 6.3)
   - For local dev, ensure ngrok is running

2. **Tokens don't match**
   - Verify `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`
   - Ensure you're using the EXACT SAME token in Facebook
   - Tokens are case-sensitive!

3. **Server not running**
   - Start your Nabu server: `npm run dev`
   - Check logs for errors

4. **Environment variables not loaded**
   - Restart your server after adding `.env` variables
   - Verify variables are loaded: `console.log(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)`

5. **Wrong endpoint**
   - URL must end with `/api/webhooks/whatsapp`
   - Check for typos
   - Must use HTTPS in production

**Check Your Server Logs:**
When Facebook verifies, you should see:
```
WhatsApp webhook verified
```

If you see nothing, Facebook isn't reaching your server.

### 6.7 Subscribe to Webhook Events

1. After webhook is verified, click "Manage"
2. Subscribe to these webhook fields:
   - `messages` - Receive incoming messages
3. Save changes

## Step 7: Complete Environment Variables

At this point, you should have all these variables in your `.env` file:

```env
# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_from_step_4
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_from_step_5
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_verify_token_from_step_6
WHATSAPP_WEBHOOK_SECRET=your_facebook_app_secret_from_step_6
```

**Complete Example:**
```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBO7ZBrl4M...  # Long token from Step 5
WHATSAPP_WEBHOOK_VERIFY_TOKEN=a3f5c8b2e1d4f9a7c6b5e8d2f1a4c7b9e5d8f2a1c4b7e9d3f6a8c5b2e1d4f7a9
WHATSAPP_WEBHOOK_SECRET=1234567890abcdef1234567890abcdef  # Facebook App Secret
```

**Double-check:**
- ✅ `WHATSAPP_ACCESS_TOKEN` = Permanent token from System User (Step 5)
- ✅ `WHATSAPP_WEBHOOK_VERIFY_TOKEN` = Random string you generated
- ✅ `WHATSAPP_WEBHOOK_SECRET` = Facebook App Secret (Settings → Basic)
- ✅ Server has been restarted after adding/updating variables

### Where to find your Business Account ID:

1. Go to Meta Business Suite
2. Click on your business name (top left)
3. Go to "Business Settings" → "Business Info"
4. Copy the "Business ID"

## Step 8: Database Migration

Run the database migration to add WhatsApp tables:

```bash
npx prisma migrate dev --name add_whatsapp_models
```

This creates the following tables:
- `WhatsAppIntegration` - Tenant-level WhatsApp configuration
- `UserPhoneLink` - Maps phone numbers to users
- `WhatsAppLinkToken` - One-time linking tokens
- `WhatsAppMessage` - Raw message storage

## Step 9: Create WhatsApp Integration Record

You need to create a record in the `WhatsAppIntegration` table for your tenant:

```sql
INSERT INTO "WhatsAppIntegration" (
  "id",
  "tenantId",
  "phoneNumberId",
  "businessAccountId",
  "phoneNumber",
  "accessToken",
  "webhookSecret",
  "mode",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'cuid_here', -- Generate a CUID
  NULL, -- Or your tenantId if multi-tenant
  'YOUR_PHONE_NUMBER_ID',
  'YOUR_BUSINESS_ACCOUNT_ID',
  '+1234567890', -- Your bot's display number
  'YOUR_ACCESS_TOKEN',
  'YOUR_WEBHOOK_SECRET',
  'personal',
  true,
  NOW(),
  NOW()
);
```

Or use Prisma Studio:

```bash
npx prisma studio
```

## Step 10: Test the Integration

### 10.1 Send a Test Message

1. Save your bot phone number in your contacts
2. Send a message to the bot on WhatsApp
3. You should receive a response with a linking URL

### 10.2 Link Your Phone Number

1. Click the link sent by the bot
2. Log in to your Nabu account (if not already logged in)
3. Confirm the phone linking
4. You should see a success message

### 10.3 Send Another Message

1. Send another message to the bot
2. Check your Nabu Thoughts feed
3. The message should appear as a new Thought with a WhatsApp badge

### 10.4 Manage Settings

1. Go to Settings → WhatsApp in your Nabu account
2. View your linked phone numbers
3. Test unlinking and relinking

## Troubleshooting

### Signature Verification Failed (After Webhook is Set Up)

**Error: "Invalid WhatsApp webhook signature" (401 Unauthorized)**

This happens when Facebook sends actual messages/events after webhook verification passes. It's a different security check.

#### What's Happening

When Facebook sends POST requests (messages):
1. Facebook signs the request body with your **webhook secret** using HMAC-SHA256
2. Facebook sends the signature in the `x-hub-signature-256` header  
3. Your Nabu server verifies the signature matches using `WHATSAPP_WEBHOOK_SECRET`
4. If they don't match → 401 error

#### Solution: Use Your App Secret

The webhook secret should be your **Facebook App Secret**, not the verify token.

**Step 1: Get Your App Secret from Facebook**

1. **Go to**: https://developers.facebook.com/apps
2. **Click your WhatsApp app** in the list
3. **In left sidebar**: Click **"Settings"** → **"Basic"**
4. **Find "App Secret" row** in the table (shows dots: `••••••••••••••••••`)
5. **Click "Show"** button
6. **Enter your Facebook password** to verify
7. **Copy the secret** that appears (32-character string like `1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d`)

**Screenshot location:**
```
Facebook App Dashboard
  → Settings (left sidebar)
    → Basic (first option)
      → Look for "App Secret" row
        → Click [Show] button
          → Copy the revealed secret
```

**Step 2: Update Your .env**
```env
# Use your App Secret here, NOT a random string
WHATSAPP_WEBHOOK_SECRET=your_facebook_app_secret_here
```

**Step 3: Restart Your Server**
```bash
# Stop and restart
npm run dev
```

**Step 4: Test Again**
Send a test message from Facebook.

#### Debug the Issue

Add temporary debug logging to see what's happening:

In `app/api/webhooks/whatsapp/route.ts`, add before the signature check:

```typescript
// Debug logging (remove after fixing)
console.log("=== WhatsApp Webhook Debug ===");
console.log("Signature from Facebook:", signature);
console.log("Secret from env:", env.WHATSAPP_WEBHOOK_SECRET ? "SET (length: " + env.WHATSAPP_WEBHOOK_SECRET.length + ")" : "NOT SET");

const expectedSig = crypto.createHmac("sha256", env.WHATSAPP_WEBHOOK_SECRET)
  .update(body)
  .digest("hex");
console.log("Expected signature:", `sha256=${expectedSig}`);
console.log("Matches:", signature === `sha256=${expectedSig}`);
console.log("=== End Debug ===");
```

This shows:
- If the secret is set
- What signature Facebook sent vs what you calculated
- If they match

#### Common Issues

1. **Using wrong secret**
   - ❌ Using a random generated string
   - ❌ Using the verify token
   - ✅ Use your **Facebook App Secret**

2. **Secret not set**
   - Check `.env` file exists and is loaded
   - Restart server after changes
   - Verify with: `console.log(process.env.WHATSAPP_WEBHOOK_SECRET)`

3. **Secret has typo**
   - Copy-paste from Facebook directly
   - No extra spaces or line breaks
   - Check for hidden characters

4. **Wrong App Secret**
   - Make sure you're using the secret from the correct Facebook app
   - Double-check you're in the right app dashboard

#### Temporary Workaround (TESTING ONLY)

⚠️ **DO NOT USE IN PRODUCTION** - Only for debugging locally

You can temporarily disable signature verification to test the message flow:

```typescript
// In app/api/webhooks/whatsapp/route.ts
// COMMENT OUT the signature check temporarily:

// if (!signature || !verifyWhatsAppSignature(body, signature, env.WHATSAPP_WEBHOOK_SECRET)) {
//   console.error("Invalid WhatsApp webhook signature");
//   return new NextResponse("Unauthorized", { status: 401 });
// }
console.log("⚠️ SIGNATURE CHECK DISABLED - TESTING ONLY");
```

This lets you verify the rest of the flow works. **Re-enable before deploying to production!**

### Webhook Not Receiving Messages

1. **Check webhook URL is publicly accessible**
   - Use a tool like [webhook.site](https://webhook.site) to test
   - Ensure your server is not behind a firewall

2. **Verify webhook subscriptions**
   - Go to WhatsApp → Configuration → Webhook
   - Ensure `messages` field is subscribed

3. **Check server logs**
   - Look for incoming POST requests
   - Check for any error messages

### Messages Not Creating Thoughts

1. **Check database logs**
   ```bash
   # Look for WhatsAppMessage records
   npx prisma studio
   ```

2. **Check for errors in message processing**
   - Look at server logs for errors
   - Check `WhatsAppMessage.error` field

3. **Verify phone is linked**
   - Check `UserPhoneLink` table
   - Ensure `isActive` is true and `deletedAt` is null

### Link Token Expired

- Link tokens expire after 15 minutes
- User must request a new link by sending another message
- Check `WhatsAppLinkToken.expiresAt` field

## Security Considerations

1. **Never commit access tokens to git**
   - Use environment variables only
   - Add `.env` to `.gitignore`

2. **Rotate tokens regularly**
   - Generate new access tokens every 3-6 months
   - Update in both `.env` and database

3. **Validate webhook signatures**
   - Always verify `x-hub-signature-256` header
   - Use timing-safe comparison (already implemented)

4. **Use HTTPS**
   - Webhook URL must use HTTPS in production
   - Get an SSL certificate (Let's Encrypt is free)

## Rate Limits

WhatsApp Cloud API has rate limits:
- **Conversations**: 1000 per 24 hours (for free tier)
- **Messages**: 250 per second
- **API calls**: 200 per hour

Monitor your usage in Meta Business Suite.

## Production Checklist

Before going live:

- [ ] Permanent access token generated and configured
- [ ] Production phone number verified and configured
- [ ] Webhook URL uses HTTPS
- [ ] Database migration applied
- [ ] WhatsAppIntegration record created
- [ ] Environment variables set correctly
- [ ] Test messaging flow end-to-end
- [ ] Rate limits understood and monitored
- [ ] Error logging and monitoring set up
- [ ] Access tokens stored securely

## Support

For WhatsApp API issues:
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)

For Nabu-specific issues:
- Check server logs
- Review database records
- Contact your Nabu administrator

## Next Steps

Once WhatsApp integration is working:

1. **Train your team** on how to use it
2. **Monitor usage** and adjust rate limits if needed
3. **Add more features**:
   - Voice note transcription
   - Image OCR
   - Group chat support
   - Bi-directional messaging

