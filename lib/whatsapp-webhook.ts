/**
 * WhatsApp Webhook Helpers
 * 
 * Functions for verifying webhook signatures and parsing WhatsApp webhook payloads
 */

import crypto from "crypto";

/**
 * Verify WhatsApp webhook signature
 * 
 * WhatsApp signs all webhook payloads with HMAC-SHA256. This function
 * verifies that the signature matches the payload to ensure authenticity.
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
 * WhatsApp webhook message structure
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

/**
 * Parse WhatsApp webhook payload and extract messages
 * 
 * WhatsApp webhook payloads can contain multiple messages across multiple entries.
 * This function extracts and normalizes all messages into a flat array.
 */
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

