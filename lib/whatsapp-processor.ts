/**
 * WhatsApp Message Processor
 * 
 * Processes incoming WhatsApp messages and converts them into Thoughts
 * with proper user attribution and AI enrichment.
 */

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

