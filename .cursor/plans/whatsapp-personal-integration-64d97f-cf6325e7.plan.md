<!-- cf6325e7-7e08-4c7c-b73b-ba11d9d4f980 eecdaecc-811f-480b-8790-f40b368a72d7 -->
# WhatsApp Personal Account Integration Plan

## Overview

Implement WhatsApp Business Cloud API integration for personal Nabu accounts. Users message the Nabu WhatsApp bot, link their phone number to their account via a secure one-time link, and subsequently all messages automatically create Thoughts in their feed with AI enrichment.

## Prerequisites (Manual Setup Required Before Implementation)

### WhatsApp Business API Setup

1. Create Meta Business Account at business.facebook.com
2. Create WhatsApp Business App in Meta Business Suite
3. Add a phone number (test number for development, real number for production)
4. Configure webhook verification token
5. Subscribe to message and status webhooks
6. Obtain credentials:

                                                                                                                                                                                                - Phone Number ID
                                                                                                                                                                                                - WhatsApp Business Account ID
                                                                                                                                                                                                - Access Token (permanent token for server)

### Environment Variables to Add

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_for_webhook_setup
WHATSAPP_WEBHOOK_SECRET=your_secret_for_signature_verification
```

## Feature Slices

### Slice 1: Database Schema and Models

#### Database Schema Extensions

**1.1 WhatsAppIntegration Model**

Location: `prisma/schema.prisma`

Add new model for tenant-level WhatsApp configuration:

```prisma
model WhatsAppIntegration {
  id                String     @id @default(cuid())
  tenantId          String?    @unique
  tenant            Tenant?    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  phoneNumberId     String     // WhatsApp Phone Number ID from Meta
  businessAccountId String     // WhatsApp Business Account ID
  phoneNumber       String     // Display number (e.g., +1234567890)
  accessToken       String     // Encrypted access token
  webhookSecret     String     // For signature verification
  mode              String     @default("personal") // "personal", "team", "both"
  isActive          Boolean    @default(true)
  
  // Audit fields
  createdAt         DateTime   @default(now())
  createdBy         String?
  updatedAt         DateTime   @updatedAt
  updatedBy         String?
  deletedAt         DateTime?
  deletedBy         String?
  
  @@index([tenantId])
  @@index([phoneNumberId])
}
```

**1.2 UserPhoneLink Model**

Location: `prisma/schema.prisma`

Maps WhatsApp phone numbers to Nabu users:

```prisma
model UserPhoneLink {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenantId        String?
  tenant          Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  phoneNumber     String    // E.164 format: +1234567890
  isActive        Boolean   @default(true)
  linkedAt        DateTime  @default(now())
  lastMessageAt   DateTime? // Track last message received
  
  // Audit fields
  createdAt       DateTime  @default(now())
  createdBy       String?
  updatedAt       DateTime  @updatedAt
  updatedBy       String?
  deletedAt       DateTime?
  deletedBy       String?
  
  @@unique([phoneNumber, tenantId])
  @@index([userId])
  @@index([tenantId])
  @@index([phoneNumber])
}
```

**1.3 WhatsAppLinkToken Model**

Location: `prisma/schema.prisma`

One-time tokens for phone number linking:

```prisma
model WhatsAppLinkToken {
  id              String    @id @default(cuid())
  token           String    @unique
  phoneNumber     String    // E.164 format
  whatsappMessageId String? // Original WhatsApp message ID
  expiresAt       DateTime  // 15 minutes from creation
  usedAt          DateTime? // Enforce one-time use
  userId          String?   // Set when used
  metadata        Json?     // Store WhatsApp context
  
  createdAt       DateTime  @default(now())
  
  @@index([token])
  @@index([phoneNumber])
  @@index([expiresAt])
}
```

**1.4 WhatsAppMessage Model**

Location: `prisma/schema.prisma`

Raw message storage for debugging and retry:

```prisma
model WhatsAppMessage {
  id                String    @id @default(cuid())
  tenantId          String?
  tenant            Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  whatsappMessageId String    @unique // WhatsApp's message ID
  fromNumber        String    // Sender phone number
  toNumber          String    // Nabu bot number
  messageType       String    // "text", "image", "audio", "document"
  content           String?   @db.Text // Text content
  mediaUrl          String?   // Media URL from WhatsApp
  mimeType          String?
  rawPayload        Json      // Full webhook payload
  processed         Boolean   @default(false)
  processedAt       DateTime?
  thoughtId         String?   // Link to created Thought
  error             String?   @db.Text
  
  createdAt         DateTime  @default(now())
  
  @@index([whatsappMessageId])
  @@index([fromNumber])
  @@index([processed])
  @@index([tenantId])
}
```

**1.5 Update Tenant Model**

Add relations:

```prisma
model Tenant {
  // ... existing fields ...
  whatsappIntegration WhatsAppIntegration?
  userPhoneLinks      UserPhoneLink[]
  whatsappMessages    WhatsAppMessage[]
}
```

**1.6 Update User Model**

Add relation:

```prisma
model User {
  // ... existing fields ...
  phoneLinks UserPhoneLink[]
}
```

#### Migration

Create migration: `prisma migrate dev --name add_whatsapp_models`

**Deliverable**: Database schema updated, migration created and applied

---

### Slice 2: WhatsApp API Client Library

#### 2.1 WhatsApp Client Library

Location: `lib/whatsapp-client.ts`

Create WhatsApp Cloud API client:

```typescript
import { env } from "@/env";

export interface WhatsAppTextMessage {
  to: string; // Phone number in E.164 format
  body: string;
}

export interface WhatsAppMediaMessage {
  to: string;
  type: "image" | "audio" | "document";
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
}

export class WhatsAppClient {
  private baseUrl = "https://graph.facebook.com/v18.0";
  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendTextMessage(to: string, body: string): Promise<{ messageId: string }> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return { messageId: data.messages[0].id };
  }

  /**
   * Download media from WhatsApp
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    // Get media URL
    const mediaUrl = `${this.baseUrl}/${mediaId}`;
    const response = await fetch(mediaUrl, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get media URL: ${response.statusText}`);
    }

    const { url } = await response.json();

    // Download the actual media file
    const downloadResponse = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download media: ${downloadResponse.statusText}`);
    }

    return Buffer.from(await downloadResponse.arrayBuffer());
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  }
}

/**
 * Get default WhatsApp client for the tenant
 */
export async function getWhatsAppClient(tenantId: string | null): Promise<WhatsAppClient | null> {
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      tenantId,
      isActive: true,
      deletedAt: null,
    },
  });

  if (!integration) {
    return null;
  }

  return new WhatsAppClient(
    integration.phoneNumberId,
    integration.accessToken
  );
}
```

#### 2.2 WhatsApp Webhook Verification Helper

Location: `lib/whatsapp-webhook.ts`

```typescript
import crypto from "crypto";

/**
 * Verify WhatsApp webhook signature
 */
export function verifyWhatsAppSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

/**
 * Parse WhatsApp webhook payload
 */
export interface WhatsAppWebhookMessage {
  messageId: string;
  from: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "video";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; filename: string; mime_type: string };
}

export function parseWhatsAppWebhook(payload: any): WhatsAppWebhookMessage[] {
  const messages: WhatsAppWebhookMessage[] = [];

  if (!payload.entry) return messages;

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      if (!value.messages) continue;

      for (const message of value.messages) {
        messages.push({
          messageId: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type,
          text: message.text,
          image: message.image,
          audio: message.audio,
          document: message.document,
        });
      }
    }
  }

  return messages;
}
```

**Deliverable**: WhatsApp API client library with send, receive, and media handling capabilities

---

### Slice 3: Webhook Endpoint and Message Reception

#### 3.1 WhatsApp Webhook Route

Location: `app/api/webhooks/whatsapp/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWhatsAppSignature, parseWhatsAppWebhook } from "@/lib/whatsapp-webhook";
import { env } from "@/env";

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification for WhatsApp setup
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receive inbound WhatsApp messages
 */
export async function POST(req: NextRequest) {
  try {
    // Verify signature
    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!signature || !verifyWhatsAppSignature(body, signature, env.WHATSAPP_WEBHOOK_SECRET)) {
      console.error("Invalid WhatsApp webhook signature");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(body);
    
    // Quick response to WhatsApp (must respond within 5 seconds)
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Process messages asynchronously
    // Don't await - process in background
    processWhatsAppWebhook(payload).catch((error) => {
      console.error("Error processing WhatsApp webhook:", error);
    });

    return response;
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Process webhook payload asynchronously
 */
async function processWhatsAppWebhook(payload: any): Promise<void> {
  const messages = parseWhatsAppWebhook(payload);

  for (const message of messages) {
    // Store raw message for processing
    await prisma.whatsAppMessage.create({
      data: {
        whatsappMessageId: message.messageId,
        fromNumber: message.from,
        toNumber: payload.entry[0]?.changes[0]?.value?.metadata?.phone_number_id || "",
        messageType: message.type,
        content: message.text?.body || message.image?.caption || null,
        mediaUrl: null, // Will be populated during processing
        mimeType: message.image?.mime_type || message.audio?.mime_type || null,
        rawPayload: message,
        processed: false,
      },
    });

    // Enqueue for processing
    // For now, process immediately. Later can use queue system.
    await processWhatsAppMessage(message.messageId);
  }
}

/**
 * Process a single WhatsApp message
 */
async function processWhatsAppMessage(whatsappMessageId: string): Promise<void> {
  // Implementation in next slice
  console.log(`Processing WhatsApp message: ${whatsappMessageId}`);
}
```

**Deliverable**: Webhook endpoint that receives and stores WhatsApp messages

---

### Slice 4: Phone Number Linking Flow

#### 4.1 Link Token Generation Helper

Location: `lib/whatsapp-link.ts`

```typescript
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { env } from "@/env";

/**
 * Generate a secure linking token for a phone number
 */
export async function generateLinkToken(
  phoneNumber: string,
  whatsappMessageId?: string
): Promise<string> {
  // Generate secure random token
  const token = crypto.randomBytes(32).toString("base64url");
  
  // Token expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.whatsAppLinkToken.create({
    data: {
      token,
      phoneNumber,
      whatsappMessageId,
      expiresAt,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    },
  });

  return token;
}

/**
 * Verify and consume a link token
 */
export async function verifyLinkToken(token: string): Promise<{
  valid: boolean;
  phoneNumber?: string;
  tokenId?: string;
}> {
  const linkToken = await prisma.whatsAppLinkToken.findUnique({
    where: { token },
  });

  if (!linkToken) {
    return { valid: false };
  }

  // Check if already used
  if (linkToken.usedAt) {
    return { valid: false };
  }

  // Check if expired
  if (linkToken.expiresAt < new Date()) {
    return { valid: false };
  }

  return {
    valid: true,
    phoneNumber: linkToken.phoneNumber,
    tokenId: linkToken.id,
  };
}

/**
 * Mark token as used and link phone to user
 */
export async function linkPhoneToUser(
  tokenId: string,
  userId: string,
  tenantId: string | null
): Promise<void> {
  const token = await prisma.whatsAppLinkToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    throw new Error("Token not found");
  }

  // Mark token as used
  await prisma.whatsAppLinkToken.update({
    where: { id: tokenId },
    data: {
      usedAt: new Date(),
      userId,
    },
  });

  // Create or update phone link
  await prisma.userPhoneLink.upsert({
    where: {
      phoneNumber_tenantId: {
        phoneNumber: token.phoneNumber,
        tenantId: tenantId,
      },
    },
    create: {
      userId,
      tenantId,
      phoneNumber: token.phoneNumber,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    },
    update: {
      userId,
      isActive: true,
      updatedBy: userId,
    },
  });
}

/**
 * Check if phone number is linked to a user
 */
export async function getLinkedUser(
  phoneNumber: string,
  tenantId: string | null
): Promise<{ userId: string; tenantId: string | null } | null> {
  const link = await prisma.userPhoneLink.findFirst({
    where: {
      phoneNumber,
      tenantId,
      isActive: true,
      deletedAt: null,
    },
  });

  if (!link) {
    return null;
  }

  return {
    userId: link.userId,
    tenantId: link.tenantId,
  };
}
```

#### 4.2 Link Verification Page

Location: `app/(app)/whatsapp/link/[token]/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { verifyLinkToken } from "@/lib/whatsapp-link";
import { WhatsAppLinkConfirm } from "@/components/whatsapp/link-confirm";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function WhatsAppLinkPage({ params }: PageProps) {
  const { token } = await params;
  const { getUser, isAuthenticated } = getKindeServerSession();

  // Verify token
  const verification = await verifyLinkToken(token);

  if (!verification.valid) {
    return (
      <div className="container max-w-md mx-auto mt-20 p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
        <p className="text-gray-600">
          This WhatsApp linking link is invalid or has expired. Please request a new link from the bot.
        </p>
      </div>
    );
  }

  // Check if authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    // Redirect to login with return URL
    redirect(`/login?returnUrl=/whatsapp/link/${token}`);
  }

  const user = await getUser();

  return (
    <WhatsAppLinkConfirm
      token={token}
      phoneNumber={verification.phoneNumber!}
      userId={user!.id}
    />
  );
}
```

#### 4.3 Link Confirmation Component

Location: `components/whatsapp/link-confirm.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface WhatsAppLinkConfirmProps {
  token: string;
  phoneNumber: string;
  userId: string;
}

export function WhatsAppLinkConfirm({ token, phoneNumber, userId }: WhatsAppLinkConfirmProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to link phone number");
      }

      // Success - redirect to thoughts page
      router.push("/nabu/thoughts?linked=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-20 p-6">
      <Card className="p-6">
        <div className="flex items-center justify-center mb-6">
          <Icons.logo className="h-12 w-12" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Link WhatsApp Number</h1>
        
        <p className="text-center text-gray-600 mb-6">
          Confirm linking <strong>{phoneNumber}</strong> to your Nabu account.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            After linking, all messages sent from this WhatsApp number to the Nabu bot will automatically create Thoughts in your feed.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Link
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push("/nabu")}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

#### 4.4 Link API Endpoint

Location: `app/api/whatsapp/link/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { verifyLinkToken, linkPhoneToUser } from "@/lib/whatsapp-link";
import { getWhatsAppClient } from "@/lib/whatsapp-client";
import { getUserContext } from "@/lib/nabu-helpers";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    // Get authenticated user
    const { userId, tenantId } = await getUserContext();

    // Verify token
    const verification = await verifyLinkToken(token);

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Link phone to user
    await linkPhoneToUser(verification.tokenId!, userId, tenantId);

    // Send confirmation message via WhatsApp
    const client = await getWhatsAppClient(tenantId);
    if (client) {
      await client.sendTextMessage(
        verification.phoneNumber!,
        "✅ Successfully linked! You can now send messages to capture thoughts in Nabu."
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error linking phone:", error);
    return NextResponse.json(
      { error: "Failed to link phone number" },
      { status: 500 }
    );
  }
}
```

**Deliverable**: Complete phone number linking flow with token generation, verification, and user confirmation

---

### Slice 5: Message Processing and Thought Creation

#### 5.1 Message Processor Implementation

Location: `lib/whatsapp-processor.ts`

```typescript
import { prisma } from "@/lib/db";
import { getLinkedUser, generateLinkToken } from "@/lib/whatsapp-link";
import { getWhatsAppClient } from "@/lib/whatsapp-client";
import { enqueueThoughtEmbeddingJobs } from "@/lib/embeddings";
import { env } from "@/env";

/**
 * Process a WhatsApp message and create a Thought
 */
export async function processWhatsAppMessage(whatsappMessageId: string): Promise<void> {
  // Get message from database
  const message = await prisma.whatsAppMessage.findUnique({
    where: { whatsappMessageId },
  });

  if (!message || message.processed) {
    return;
  }

  try {
    // Get tenant from integration (for now, use null for single-tenant)
    const tenantId = message.tenantId;

    // Check if phone number is linked
    const linkedUser = await getLinkedUser(message.fromNumber, tenantId);

    if (!linkedUser) {
      // Phone not linked - send linking instructions
      await handleUnlinkedNumber(message.fromNumber, whatsappMessageId, tenantId);
      
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      return;
    }

    // Create Thought from message
    const thought = await createThoughtFromMessage(message, linkedUser.userId, tenantId);

    // Mark as processed
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        processed: true,
        processedAt: new Date(),
        thoughtId: thought.id,
      },
    });

    // Update last message timestamp
    await prisma.userPhoneLink.updateMany({
      where: {
        phoneNumber: message.fromNumber,
        tenantId,
      },
      data: {
        lastMessageAt: new Date(),
      },
    });

    // Send acknowledgment (optional)
    const client = await getWhatsAppClient(tenantId);
    if (client) {
      await client.sendTextMessage(
        message.fromNumber,
        "✓ Captured"
      );
    }

  } catch (error) {
    console.error(`Error processing WhatsApp message ${whatsappMessageId}:`, error);
    
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Handle message from unlinked phone number
 */
async function handleUnlinkedNumber(
  phoneNumber: string,
  whatsappMessageId: string,
  tenantId: string | null
): Promise<void> {
  // Generate link token
  const token = await generateLinkToken(phoneNumber, whatsappMessageId);

  // Send linking instructions
  const linkUrl = `${env.NEXT_PUBLIC_APP_URL}/whatsapp/link/${token}`;
  
  const client = await getWhatsAppClient(tenantId);
  if (!client) {
    console.error("No WhatsApp client available");
    return;
  }

  await client.sendTextMessage(
    phoneNumber,
    `👋 Welcome to Nabu!\n\nTo start capturing thoughts via WhatsApp, please link this number to your account:\n\n${linkUrl}\n\nThis link expires in 15 minutes.`
  );
}

/**
 * Create a Thought from a WhatsApp message
 */
async function createThoughtFromMessage(
  message: any,
  userId: string,
  tenantId: string | null
): Promise<any> {
  const messageType = message.messageType;
  let content = message.content || "";
  let attachmentId: string | null = null;

  // Handle media attachments
  if (messageType === "image" || messageType === "audio" || messageType === "document") {
    const attachment = await handleMediaAttachment(message, userId, tenantId);
    attachmentId = attachment?.id || null;
    
    // For voice notes, use transcription as content
    if (messageType === "audio" && attachment?.extractedText) {
      content = attachment.extractedText;
    }
  }

  // Create Thought
  const thought = await prisma.thought.create({
    data: {
      userId,
      tenantId,
      content: content || "[Media attachment]",
      source: "WHATSAPP",
      state: "NEW",
      meta: {
        whatsappMessageId: message.whatsappMessageId,
        whatsappPhoneId: message.toNumber,
        whatsappChatId: message.fromNumber,
        whatsappChatType: "personal",
        whatsappSenderNumber: message.fromNumber,
        whatsappTimestamp: message.rawPayload.timestamp,
      },
      createdBy: userId,
      updatedBy: userId,
    },
  });

  // Link attachment if created
  if (attachmentId) {
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { thoughtId: thought.id },
    });
  }

  // Enqueue embedding generation
  if (content && content.length > 50) {
    await enqueueThoughtEmbeddingJobs(
      thought.id,
      content,
      userId,
      tenantId
    ).catch(error => {
      console.error("Failed to enqueue embedding jobs:", error);
    });
  }

  return thought;
}

/**
 * Handle media attachments (images, voice notes, documents)
 */
async function handleMediaAttachment(
  message: any,
  userId: string,
  tenantId: string | null
): Promise<any | null> {
  try {
    const mediaId = message.rawPayload.image?.id || 
                    message.rawPayload.audio?.id || 
                    message.rawPayload.document?.id;

    if (!mediaId) {
      return null;
    }

    const client = await getWhatsAppClient(tenantId);
    if (!client) {
      return null;
    }

    // Download media
    const mediaBuffer = await client.downloadMedia(mediaId);

    // Upload to storage (reuse existing attachment upload logic)
    // For now, create attachment record with placeholder URL
    const filename = message.rawPayload.document?.filename || 
                    `whatsapp_${message.messageType}_${Date.now()}`;

    const attachment = await prisma.attachment.create({
      data: {
        tenantId,
        fileName: filename,
        fileUrl: `whatsapp://media/${mediaId}`, // Temporary - will be replaced with actual storage URL
        mimeType: message.mimeType || "application/octet-stream",
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // TODO: Upload mediaBuffer to Supabase storage and update fileUrl
    // For MVP, we store the media ID reference

    return attachment;
  } catch (error) {
    console.error("Error handling media attachment:", error);
    return null;
  }
}
```

#### 5.2 Update Webhook to Use Processor

Location: `app/api/webhooks/whatsapp/route.ts`

Update the `processWhatsAppMessage` function to import and use the processor:

```typescript
import { processWhatsAppMessage as processMessage } from "@/lib/whatsapp-processor";

async function processWhatsAppMessage(whatsappMessageId: string): Promise<void> {
  await processMessage(whatsappMessageId);
}
```

**Deliverable**: Message processing pipeline that creates Thoughts from WhatsApp messages with proper user attribution

---

### Slice 6: Settings UI and Integration Management

#### 6.1 WhatsApp Settings Page

Location: `app/(app)/settings/whatsapp/page.tsx`

```typescript
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { WhatsAppSettingsForm } from "@/components/whatsapp/settings-form";

export default async function WhatsAppSettingsPage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  const user = await getUser();
  
  // Get user's phone links
  const phoneLinks = await prisma.userPhoneLink.findMany({
    where: {
      userId: user!.id,
      deletedAt: null,
    },
    orderBy: {
      linkedAt: "desc",
    },
  });

  // Get tenant's WhatsApp integration
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      tenantId: user!.tenantId || null,
      deletedAt: null,
    },
  });

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-2">WhatsApp Integration</h1>
      <p className="text-gray-600 mb-8">
        Manage your WhatsApp connection to capture thoughts on the go.
      </p>

      <WhatsAppSettingsForm
        phoneLinks={phoneLinks}
        integration={integration}
        botNumber={integration?.phoneNumber}
      />
    </div>
  );
}
```

#### 6.2 Settings Form Component

Location: `components/whatsapp/settings-form.tsx`

```typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { formatDistanceToNow } from "date-fns";

interface WhatsAppSettingsFormProps {
  phoneLinks: any[];
  integration: any;
  botNumber?: string;
}

export function WhatsAppSettingsForm({ phoneLinks, integration, botNumber }: WhatsAppSettingsFormProps) {
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

  const handleUnlink = async (linkId: string) => {
    if (!confirm("Are you sure you want to unlink this phone number?")) {
      return;
    }

    setIsUnlinking(linkId);

    try {
      const response = await fetch(`/api/whatsapp/link/${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unlink");
      }

      window.location.reload();
    } catch (error) {
      alert("Failed to unlink phone number");
    } finally {
      setIsUnlinking(null);
    }
  };

  if (!integration) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Icons.alertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">WhatsApp Not Configured</h3>
          <p className="text-gray-600">
            WhatsApp integration is not yet set up for your account. Contact your administrator to enable this feature.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Nabu WhatsApp Bot</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Bot Number:</strong> {botNumber || "Not configured"}
          </p>
          <p className="text-sm text-blue-800">
            Save this number as a contact and send a message to start capturing thoughts via WhatsApp.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Add the bot number to your WhatsApp contacts</li>
            <li>Send your first message</li>
            <li>Click the link to link your phone number</li>
            <li>Start capturing thoughts instantly!</li>
          </ol>
        </div>
      </Card>

      {/* Linked Numbers */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Linked Phone Numbers</h2>

        {phoneLinks.length === 0 ? (
          <div className="text-center py-8">
            <Icons.smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No phone numbers linked yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Message the bot to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {phoneLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Icons.smartphone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{link.phoneNumber}</p>
                    <p className="text-xs text-gray-500">
                      Linked {formatDistanceToNow(new Date(link.linkedAt), { addSuffix: true })}
                      {link.lastMessageAt && (
                        <> • Last message {formatDistanceToNow(new Date(link.lastMessageAt), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {link.isActive ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(link.id)}
                    disabled={isUnlinking === link.id}
                  >
                    {isUnlinking === link.id ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Privacy Notice */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Icons.lock className="h-4 w-4" />
          Privacy & Security
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• All messages are encrypted in transit and at rest</li>
          <li>• Your WhatsApp messages are private to your account only</li>
          <li>• You can unlink your phone number at any time</li>
          <li>• Message history remains in your Nabu account after unlinking</li>
        </ul>
      </Card>
    </div>
  );
}
```

#### 6.3 Unlink API Endpoint

Location: `app/api/whatsapp/link/[linkId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/nabu-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const { userId } = await getUserContext();

    // Verify ownership
    const link = await prisma.userPhoneLink.findFirst({
      where: {
        id: linkId,
        userId,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Phone link not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.userPhoneLink.update({
      where: { id: linkId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking phone:", error);
    return NextResponse.json(
      { error: "Failed to unlink phone number" },
      { status: 500 }
    );
  }
}
```

**Deliverable**: User-facing settings page for managing WhatsApp phone number links

---

### Slice 7: Frontend Feed Integration

#### 7.1 Update Thought Display to Show WhatsApp Source

Location: `components/nabu/thoughts/thought-card.tsx` (if exists, or create)

Add WhatsApp badge/icon to thought cards:

```typescript
import { Icons } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";

// In the thought card component, add source indicator:
{thought.source === "WHATSAPP" && (
  <Badge variant="outline" className="flex items-center gap-1">
    <Icons.messageCircle className="h-3 w-3" />
    WhatsApp
  </Badge>
)}
```

#### 7.2 Add WhatsApp Metadata Display

Location: Component that displays thought details

Show WhatsApp-specific metadata when available:

```typescript
{thought.meta?.whatsappSenderNumber && (
  <div className="text-xs text-gray-500 mt-2">
    From: {thought.meta.whatsappSenderNumber}
  </div>
)}
```

#### 7.3 Update Thoughts List Filter

Location: Thoughts list component (existing)

Add WhatsApp to source filter if not already present:

```typescript
const sources = [
  { value: "all", label: "All Sources" },
  { value: "WEB", label: "Web" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TELEGRAM", label: "Telegram" },
  // ... other sources
];
```

**Deliverable**: Frontend components display WhatsApp-sourced thoughts with appropriate badges and metadata

---

### Slice 8: Testing and Documentation

#### 8.1 Environment Setup Documentation

Location: `.devreadyai/other/whatsapp-setup.md`

Create comprehensive setup guide:

```markdown
# WhatsApp Integration Setup Guide

## Prerequisites

1. Meta Business Account
2. WhatsApp Business App
3. Verified phone number

## Step 1: Meta Business Account Setup

[Detailed steps...]

## Step 2: Configure Webhook

[Detailed steps...]

## Step 3: Environment Variables

[List of all required env vars...]

## Step 4: Database Migration

[Migration commands...]

## Step 5: Testing

[Test scenarios...]
```

#### 8.2 Manual Testing Checklist

Create testing checklist:

- [ ] Webhook verification works
- [ ] Unknown number receives linking message
- [ ] Link token generation and validation
- [ ] User can link phone number
- [ ] Text message creates Thought
- [ ] Image message creates Thought with attachment
- [ ] Voice note creates Thought with transcription
- [ ] Multiple messages from same number work
- [ ] Unlink removes access
- [ ] Settings page displays correctly

#### 8.3 Integration Test Script

Location: `app/api/webhooks/whatsapp/__tests__/webhook.test.ts`

Create basic integration tests for webhook processing.

**Deliverable**: Complete documentation and testing checklist for WhatsApp integration

---

## Environment Variables Summary

Add to `.env`:

```env
# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_secure_token_for_setup
WHATSAPP_WEBHOOK_SECRET=random_secure_secret_for_signature_verification
```

Add to `env.ts`:

```typescript
server: {
  // ... existing vars
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(1),
},
runtimeEnv: {
  // ... existing vars
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET,
},
```

## Success Criteria

- Users can link their WhatsApp number via one-time link
- Text messages create Thoughts in user's feed
- Images and voice notes attach to Thoughts
- AI enrichment (embeddings, tags) works for WhatsApp Thoughts
- Settings page allows managing phone links
- Webhook handles all message types gracefully
- Security: signature verification, token validation, soft deletes

## Future Enhancements (Out of Scope)

- Team/group chat support
- Message clustering and digests
- Advanced media transcription (OCR, advanced audio)
- Bi-directional messaging (reply from Nabu)
- WhatsApp Business templates
- Analytics dashboard

### To-dos

- [ ] Complete WhatsApp Business API setup with Meta and configure environment variables
- [ ] Create and apply database migrations for WhatsApp models (WhatsAppIntegration, UserPhoneLink, WhatsAppLinkToken, WhatsAppMessage)
- [ ] Implement WhatsApp Cloud API client library with send, receive, and media download capabilities
- [ ] Create webhook endpoint for receiving WhatsApp messages with signature verification
- [ ] Implement phone number linking flow with token generation, verification page, and confirmation UI
- [ ] Build message processor that creates Thoughts from WhatsApp messages with media handling
- [ ] Create settings page for users to view and manage their linked WhatsApp numbers
- [ ] Update frontend to display WhatsApp source badges and metadata in thought cards
- [ ] Write setup documentation and create testing checklist for WhatsApp integration