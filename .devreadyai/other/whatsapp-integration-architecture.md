# WhatsApp Integration Architecture

This document explains how the WhatsApp Business Cloud API integration works in Nabu—from webhook reception to Thought creation—so developers can understand the personal account flow and use this as a guide for implementing team/group chat functionality.

---

## Platform Responsibilities

1. **Webhook Reception** – Receive and verify inbound WhatsApp messages from Meta's Cloud API
2. **Phone Linking** – Map WhatsApp phone numbers to Nabu user accounts via secure one-time tokens
3. **Message Processing** – Transform WhatsApp messages (text, images, voice notes) into Thoughts
4. **Media Handling** – Download, store, and attach media files to Thoughts
5. **User Attribution** – Ensure messages are correctly attributed to linked users within tenant boundaries
6. **AI Enrichment** – Trigger standard Nabu AI pipelines (embeddings, tag suggestions) for WhatsApp Thoughts

---

## System Map

| Layer | Responsibilities | Key Files |
| --- | --- | --- |
| WhatsApp Cloud API | Message transport, webhook delivery | External (Meta) |
| Webhook endpoint | Signature verification, payload parsing, async processing | `app/api/webhooks/whatsapp/route.ts` |
| WhatsApp client library | Send messages, download media, API abstraction | `lib/whatsapp-client.ts` |
| Link token system | Generate/verify one-time linking tokens | `lib/whatsapp-link.ts` |
| Message processor | Create Thoughts from messages, handle media | `lib/whatsapp-processor.ts` |
| Database models | Store integrations, phone links, raw messages, tokens | `prisma/schema.prisma` |
| Settings UI | User-facing phone link management | `app/(app)/settings/whatsapp/page.tsx` |
| Frontend components | Display WhatsApp source badges, metadata | `components/nabu/thoughts/*` |

---

## 1. Infrastructure Setup

### WhatsApp Business Cloud API Configuration

**Prerequisites:**
- Meta Business Account (business.facebook.com)
- WhatsApp Business App created in Meta Business Suite
- Phone number (test number for dev, verified number for production)
- Webhook verification token and secret

**Environment Variables:**
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_secure_token_for_setup
WHATSAPP_WEBHOOK_SECRET=random_secure_secret_for_signature_verification
```

**Webhook Configuration:**
- **URL**: `https://your-domain.com/api/webhooks/whatsapp`
- **Verify Token**: Must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Subscribed Events**: `messages`, `message_status`
- **Signature Verification**: Uses HMAC-SHA256 with `WHATSAPP_WEBHOOK_SECRET`

### Database Models

**WhatsAppIntegration** (Tenant-level configuration)
- Stores WhatsApp Business API credentials per tenant
- One integration per tenant (unique `tenantId`)
- Encrypted `accessToken` (should be encrypted at rest)
- `mode` field supports "personal", "team", or "both" (future)

**UserPhoneLink** (User-to-phone mapping)
- Links WhatsApp phone numbers (E.164 format) to Nabu users
- Unique constraint: `phoneNumber` + `tenantId`
- Tracks `lastMessageAt` for activity monitoring
- Soft-deletable for unlinking without data loss

**WhatsAppLinkToken** (One-time linking tokens)
- Secure random tokens (32 bytes, base64url encoded)
- 15-minute expiration
- One-time use enforcement (`usedAt` timestamp)
- Stores WhatsApp message context in `metadata` JSON

**WhatsAppMessage** (Raw message storage)
- Stores all inbound messages for debugging and retry
- Links to created `Thought` via `thoughtId`
- `processed` flag prevents duplicate processing
- Full `rawPayload` JSON for troubleshooting

---

## 2. Webhook Reception Flow

### GET /api/webhooks/whatsapp (Verification)

When Meta first configures the webhook, it sends a GET request:
```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

**Verification Logic:**
1. Check `hub.mode === "subscribe"`
2. Verify `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Return `hub.challenge` as plain text (200 OK)

This confirms to Meta that Nabu owns the webhook endpoint.

### POST /api/webhooks/whatsapp (Message Reception)

**Signature Verification:**
```typescript
const signature = req.headers.get("x-hub-signature-256");
verifyWhatsAppSignature(body, signature, WHATSAPP_WEBHOOK_SECRET)
```

Uses HMAC-SHA256 to verify payload integrity. Invalid signatures return 401.

**Quick Response Pattern:**
WhatsApp requires responses within 5 seconds. The webhook:
1. Verifies signature
2. Parses payload
3. **Immediately returns 200 OK** (doesn't await processing)
4. Processes messages asynchronously in background

**Payload Structure:**
```json
{
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "PHONE_NUMBER_ID",
          "display_phone_number": "+1234567890"
        },
        "messages": [{
          "id": "MESSAGE_ID",
          "from": "SENDER_PHONE_NUMBER",
          "timestamp": "1234567890",
          "type": "text|image|audio|document",
          "text": { "body": "..." },
          "image": { "id": "...", "mime_type": "..." },
          ...
        }]
      }
    }]
  }]
}
```

**Processing Steps:**
1. Parse webhook payload → extract `WhatsAppWebhookMessage[]`
2. For each message:
   - Store raw message in `WhatsAppMessage` table
   - Set `processed = false`
   - Enqueue for async processing (or process immediately)
3. Return success response

---

## 3. Phone Number Linking Flow

### Initial Message from Unlinked Number

**Flow:**
```
User sends message → Webhook receives → Check UserPhoneLink
  ↓ (not found)
Generate WhatsAppLinkToken → Send linking message via WhatsApp
  ↓
User clicks link → Verify token → Show confirmation page
  ↓
User confirms → Create UserPhoneLink → Send confirmation
```

**Token Generation** (`lib/whatsapp-link.ts`):
- Generates secure random token: `crypto.randomBytes(32).toString("base64url")`
- Expires in 15 minutes
- Stores `phoneNumber`, `whatsappMessageId`, `metadata`
- Returns token for URL construction

**Linking Message:**
```
👋 Welcome to Nabu!

To start capturing thoughts via WhatsApp, please link this number to your account:

https://nabu.app/whatsapp/link/TOKEN

This link expires in 15 minutes.
```

**Link Verification Page** (`app/(app)/whatsapp/link/[token]/page.tsx`):
1. Verify token exists and not expired
2. Check if user is authenticated (redirect to login if not)
3. Show confirmation UI with phone number
4. On confirm → call `/api/whatsapp/link` POST

**Linking API** (`app/api/whatsapp/link/route.ts`):
1. Verify token validity
2. Mark token as used (`usedAt = now()`)
3. Create/update `UserPhoneLink` record
4. Send confirmation message via WhatsApp: "✅ Successfully linked!"

**Security Considerations:**
- Tokens are single-use (checked via `usedAt`)
- Tokens expire after 15 minutes
- Phone numbers are normalized to E.164 format
- Tenant isolation enforced via `tenantId`

---

## 4. Message Processing Pipeline

### Processing Flow

**Entry Point:** `lib/whatsapp-processor.ts` → `processWhatsAppMessage()`

**Steps:**
1. Load `WhatsAppMessage` from database
2. Check if already processed (`processed === true`) → skip
3. Look up `UserPhoneLink` by `fromNumber` + `tenantId`
4. **If not linked:**
   - Generate link token
   - Send linking instructions
   - Mark message as processed
   - Return early
5. **If linked:**
   - Extract message content (text, media URL, etc.)
   - Handle media attachments (download, store)
   - Create `Thought` with WhatsApp metadata
   - Link attachments to Thought
   - Enqueue embedding jobs
   - Update `lastMessageAt` on `UserPhoneLink`
   - Send acknowledgment: "✓ Captured"
   - Mark message as processed

### Thought Creation

**Thought Fields:**
```typescript
{
  userId: linkedUser.userId,
  tenantId: tenantId,
  content: messageText || "[Media attachment]",
  source: "WHATSAPP",
  state: "NEW",
  meta: {
    whatsappMessageId: message.whatsappMessageId,
    whatsappPhoneId: message.toNumber,
    whatsappChatId: message.fromNumber,
    whatsappChatType: "personal", // Always "personal" for personal accounts
    whatsappSenderNumber: message.fromNumber,
    whatsappTimestamp: message.rawPayload.timestamp,
  }
}
```

**Media Handling:**
- **Images**: Download via WhatsApp API, upload to storage, create `Attachment` record
- **Voice Notes**: Download audio, transcribe (future), create `Attachment` with transcription
- **Documents**: Download, store, create `Attachment` record
- Media URLs are stored temporarily; actual download happens asynchronously

**AI Enrichment:**
- Standard `enqueueThoughtEmbeddingJobs()` called for text content > 50 chars
- Tag suggestions triggered via existing pipeline
- Embeddings generated via existing chunking system

---

## 5. WhatsApp API Client Library

### WhatsAppClient Class (`lib/whatsapp-client.ts`)

**Methods:**

**sendTextMessage(to, body)**
- Sends text message via WhatsApp Cloud API
- Endpoint: `POST /v18.0/{phoneNumberId}/messages`
- Returns `{ messageId }` from response

**downloadMedia(mediaId)**
- Two-step process:
  1. Get media URL: `GET /v18.0/{mediaId}`
  2. Download actual file: `GET {mediaUrl}` with auth header
- Returns `Buffer` of media file

**markAsRead(messageId)**
- Marks message as read (optional acknowledgment)
- Endpoint: `POST /v18.0/{phoneNumberId}/messages` with `status: "read"`

**getWhatsAppClient(tenantId)**
- Factory function that loads `WhatsAppIntegration` for tenant
- Returns `WhatsAppClient` instance or `null` if not configured
- Handles encryption/decryption of access token

### Webhook Helpers (`lib/whatsapp-webhook.ts`)

**verifyWhatsAppSignature(payload, signature, secret)**
- Computes HMAC-SHA256 of payload
- Compares with `x-hub-signature-256` header
- Uses `crypto.timingSafeEqual()` to prevent timing attacks

**parseWhatsAppWebhook(payload)**
- Extracts messages from nested webhook structure
- Normalizes to `WhatsAppWebhookMessage[]` array
- Handles multiple entries and changes

---

## 6. Settings UI and Management

### Settings Page (`app/(app)/settings/whatsapp/page.tsx`)

**Displays:**
- Bot phone number (from `WhatsAppIntegration`)
- List of linked phone numbers (`UserPhoneLink[]`)
- Last message timestamp per link
- Unlink button per phone number

**Features:**
- Shows "Not Configured" if no `WhatsAppIntegration` exists
- Privacy notice about data handling
- Instructions for first-time setup

### Unlink Flow

**API:** `DELETE /api/whatsapp/link/[linkId]`

**Logic:**
1. Verify ownership (user owns the link)
2. Soft delete `UserPhoneLink`:
   - Set `isActive = false`
   - Set `deletedAt = now()`
   - Set `deletedBy = userId`
3. Future messages from that number will trigger linking flow again

**Note:** Historical Thoughts remain linked to the user; only future messages require re-linking.

---

## 7. Frontend Integration

### Thought Display

**Source Badge:**
WhatsApp Thoughts display a badge in the feed:
```tsx
{thought.source === "WHATSAPP" && (
  <Badge variant="outline">
    <Icons.messageCircle className="h-3 w-3" />
    WhatsApp
  </Badge>
)}
```

**Metadata Display:**
In thought detail view, show WhatsApp-specific metadata:
- Sender phone number (masked for privacy)
- Original WhatsApp timestamp
- Media attachments with previews

### Feed Filtering

WhatsApp Thoughts appear in standard feed with source filter support:
- Filter by source: "All Sources", "WhatsApp", "Web", etc.
- Search works identically (keyword + semantic via embeddings)
- Tag suggestions work identically
- Promotion to Notes works identically

---

## 8. Error Handling and Edge Cases

### Unknown Phone Number
- **Behavior**: Send linking instructions
- **Message**: Welcome message with link token
- **No Thought Created**: Until phone is linked

### Expired Link Token
- **Behavior**: Show "Invalid Link" page
- **User Action**: Request new link from bot
- **Security**: Tokens cannot be reused

### Already Linked Number
- **Behavior**: Process message immediately
- **No Linking Message**: Skip token generation
- **Thought Created**: Normal flow

### Media Download Failure
- **Behavior**: Create Thought with placeholder text
- **Attachment**: Created with temporary URL reference
- **Retry**: Can be implemented via background job
- **Error Logging**: Stored in `WhatsAppMessage.error` field

### Duplicate Message Processing
- **Prevention**: `processed` flag on `WhatsAppMessage`
- **Idempotency**: Check `processed === true` before processing
- **WhatsApp Retries**: WhatsApp may resend webhooks; idempotency prevents duplicates

### Integration Not Configured
- **Behavior**: Log error, don't process
- **User Impact**: Messages are stored but not processed
- **Admin Action**: Configure `WhatsAppIntegration` record

---

## 9. Security and Privacy

### Webhook Security
- **Signature Verification**: Mandatory HMAC-SHA256 verification
- **HTTPS Only**: All webhooks must use HTTPS
- **Token Validation**: Link tokens verified before use

### Data Privacy
- **Tenant Isolation**: All queries scoped by `tenantId`
- **User Isolation**: Messages only visible to linked user
- **Soft Deletes**: Phone links soft-deleted, not hard-deleted
- **Access Token Encryption**: Should be encrypted at rest (implementation detail)

### Phone Number Handling
- **E.164 Format**: Normalized to international format (+1234567890)
- **No Storage of Contacts**: Only phone numbers, not contact names
- **Masking in UI**: Phone numbers can be masked for display

---

## 10. Database Schema Reference

### WhatsAppIntegration
```prisma
model WhatsAppIntegration {
  id                String     @id @default(cuid())
  tenantId          String?    @unique
  phoneNumberId     String     // WhatsApp Phone Number ID
  businessAccountId String     // WhatsApp Business Account ID
  phoneNumber       String     // Display number (+1234567890)
  accessToken       String     // Encrypted access token
  webhookSecret     String     // For signature verification
  mode              String     @default("personal")
  isActive          Boolean    @default(true)
  // Audit fields...
}
```

### UserPhoneLink
```prisma
model UserPhoneLink {
  id              String    @id @default(cuid())
  userId          String
  tenantId        String?
  phoneNumber     String    // E.164 format
  isActive        Boolean   @default(true)
  linkedAt        DateTime  @default(now())
  lastMessageAt   DateTime?
  // Audit fields...
  
  @@unique([phoneNumber, tenantId])
}
```

### WhatsAppLinkToken
```prisma
model WhatsAppLinkToken {
  id                String    @id @default(cuid())
  token             String    @unique
  phoneNumber       String
  whatsappMessageId String?
  expiresAt         DateTime
  usedAt            DateTime?
  userId            String?
  metadata          Json?
  createdAt         DateTime  @default(now())
}
```

### WhatsAppMessage
```prisma
model WhatsAppMessage {
  id                String    @id @default(cuid())
  tenantId          String?
  whatsappMessageId String    @unique
  fromNumber        String
  toNumber          String
  messageType       String    // "text", "image", "audio", "document"
  content           String?   @db.Text
  mediaUrl          String?
  mimeType          String?
  rawPayload        Json
  processed         Boolean   @default(false)
  processedAt       DateTime?
  thoughtId         String?
  error             String?   @db.Text
  createdAt         DateTime  @default(now())
}
```

---

## 11. Extending for Teams Integration

### Key Differences for Teams

**Current (Personal):**
- One `UserPhoneLink` per phone number
- Messages create Thoughts for single user
- `whatsappChatType: "personal"` in Thought meta

**Future (Teams):**
- `WhatsAppGroupMapping` model for group configuration
- Messages create Thoughts for team workspace
- `whatsappChatType: "group"` in Thought meta
- Group linking flow (admin sends `/link` command)
- Processing modes: per-message, clustered, digest

### Architecture Extensions Needed

**1. Group Detection:**
- Detect group vs. personal chat in webhook payload
- `value.metadata.phone_number_id` identifies bot
- `value.messages[].from` identifies sender
- Group chats have `value.context` with group ID

**2. Group Mapping:**
- New model: `WhatsAppGroupMapping`
- Links `whatsappChatId` (group ID) to team workspace
- Stores processing mode, default folder, default tags
- Admin configuration UI

**3. Message Routing:**
- Check if message is from group (`whatsappChatType`)
- Look up `WhatsAppGroupMapping` instead of `UserPhoneLink`
- Route to team processing pipeline
- Apply group defaults (folder, tags)

**4. Processing Modes:**
- **Per Message**: Current personal flow (one Thought per message)
- **Clustered**: Group messages by time window, create Conversation Thought
- **Digest**: Aggregate messages, generate daily summary Thought/Note

**5. User Attribution:**
- Group messages: `userId` from sender mapping or system user
- Store sender info in `meta.whatsappSenderName`
- Team members see all group Thoughts (workspace access)

### Implementation Guide

When implementing teams:

1. **Extend Webhook Parser:**
   - Detect group context from payload
   - Extract group ID from `value.context.group_id`
   - Set `chatType: "group" | "personal"`

2. **Update Message Processor:**
   - Branch on `chatType`
   - Personal: Use existing `UserPhoneLink` lookup
   - Group: Use `WhatsAppGroupMapping` lookup
   - Route to appropriate processing pipeline

3. **Create Group Mapping Flow:**
   - Admin sends `/link` command in group
   - Bot replies with one-time link
   - Admin configures: folder, tags, processing mode
   - Save `WhatsAppGroupMapping` record

4. **Implement Processing Modes:**
   - Per message: Reuse personal flow
   - Clustered: New `clusterWhatsappMessages()` function
   - Digest: New `generateWhatsappDailyDigest()` function

5. **Update Thought Creation:**
   - Set `whatsappChatType: "group"`
   - Apply group defaults (folder, tags)
   - Set `userId` appropriately (sender or system)

---

## 12. File Reference

**Core Libraries:**
- `lib/whatsapp-client.ts` - WhatsApp Cloud API client
- `lib/whatsapp-webhook.ts` - Webhook parsing and verification
- `lib/whatsapp-link.ts` - Phone linking token management
- `lib/whatsapp-processor.ts` - Message processing and Thought creation

**API Routes:**
- `app/api/webhooks/whatsapp/route.ts` - Webhook endpoint (GET verification, POST messages)
- `app/api/whatsapp/link/route.ts` - Confirm phone linking (POST)
- `app/api/whatsapp/link/[linkId]/route.ts` - Unlink phone number (DELETE)

**UI Components:**
- `app/(app)/whatsapp/link/[token]/page.tsx` - Link verification page
- `app/(app)/settings/whatsapp/page.tsx` - Settings page
- `components/whatsapp/link-confirm.tsx` - Confirmation UI
- `components/whatsapp/settings-form.tsx` - Settings form component

**Database:**
- `prisma/schema.prisma` - All WhatsApp models
- `prisma/migrations/*/add_whatsapp_models` - Migration files

**Documentation:**
- `.devreadyai/planning/whatsapp-integration.md` - Original PRD
- `.devreadyai/other/whatsapp-integration-architecture.md` - This file
- `.devreadyai/completed-features/whatsapp-personal-integration-implementation.md` - Implementation details

---

## 13. Testing Checklist

### Webhook Verification
- [ ] GET request with correct token returns challenge
- [ ] GET request with wrong token returns 403
- [ ] POST request with valid signature processes messages
- [ ] POST request with invalid signature returns 401

### Phone Linking
- [ ] Unknown number receives linking message
- [ ] Link token expires after 15 minutes
- [ ] Link token can only be used once
- [ ] Linking creates UserPhoneLink record
- [ ] Confirmation message sent via WhatsApp

### Message Processing
- [ ] Text message creates Thought
- [ ] Image message creates Thought with attachment
- [ ] Voice note creates Thought with audio attachment
- [ ] Multiple messages from same number work
- [ ] Duplicate webhook doesn't create duplicate Thoughts

### Settings UI
- [ ] Settings page shows linked numbers
- [ ] Unlink removes phone link
- [ ] Unlinked number requires re-linking
- [ ] Privacy notice displays correctly

### Error Handling
- [ ] Invalid token shows error page
- [ ] Expired token shows error page
- [ ] Media download failure doesn't crash processing
- [ ] Missing integration shows "Not Configured" message

---

## 14. Design Decisions

### Why One-Time Tokens?
- **Security**: Prevents token reuse attacks
- **Expiration**: Limits window for unauthorized access
- **Audit Trail**: `usedAt` timestamp provides audit log
- **User Experience**: 15 minutes is reasonable for linking flow

### Why Store Raw Messages?
- **Debugging**: Full payload helps troubleshoot issues
- **Retry**: Can reprocess failed messages
- **Analytics**: Track message patterns and volumes
- **Compliance**: May need to retain for legal reasons

### Why Async Processing?
- **WhatsApp Requirements**: Must respond within 5 seconds
- **Media Downloads**: Can take time, shouldn't block webhook
- **Scalability**: Can process messages in parallel
- **Resilience**: Failed processing doesn't break webhook

### Why Soft Deletes?
- **Data Retention**: Historical Thoughts remain linked
- **Audit Compliance**: Track when links were removed
- **User Experience**: Can restore links if needed
- **Consistency**: Matches Nabu's soft-delete pattern

### Why E.164 Format?
- **Standardization**: International phone number standard
- **Validation**: Easier to validate and normalize
- **WhatsApp Requirement**: WhatsApp uses E.164 format
- **Database Efficiency**: Consistent format enables better indexing

---

## 15. Future Enhancements

### Media Transcription
- Voice notes → text transcription via OpenAI Whisper
- Images → OCR text extraction
- Store transcription in `Attachment.extractedText`
- Use transcription for Thought content and embeddings

### Bi-directional Messaging
- Reply to Thoughts from Nabu UI
- Send messages via WhatsApp API
- Thread conversations
- Status tracking (sent, delivered, read)

### Advanced Media Support
- Video messages
- Document types (PDF, Word, etc.)
- Location sharing
- Contact cards

### Analytics Dashboard
- Messages per day/week/month
- Most active users
- Media vs. text ratio
- Link conversion rate

---

## Conclusion

The WhatsApp personal integration provides a complete flow for capturing Thoughts via WhatsApp. The architecture is designed to be extensible for teams functionality, with clear separation between personal and group message handling. Key principles:

- **Security First**: Signature verification, token validation, tenant isolation
- **Async Processing**: Quick webhook responses, background processing
- **User Experience**: Simple linking flow, clear error messages
- **Extensibility**: Ready for teams integration with minimal refactoring

When implementing teams, follow the patterns established here and extend the message processor to handle group contexts and processing modes.

