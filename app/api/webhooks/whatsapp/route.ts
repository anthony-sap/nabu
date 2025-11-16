/**
 * WhatsApp Webhook Endpoint
 * 
 * Receives incoming messages from WhatsApp Business Cloud API
 * - GET: Webhook verification during setup
 * - POST: Receive and process incoming messages
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWhatsAppSignature, parseWhatsAppWebhook } from "@/lib/whatsapp-webhook";
import { processWhatsAppMessage } from "@/lib/whatsapp-processor";
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

