/**
 * WhatsApp Cloud API Client
 * 
 * Handles communication with WhatsApp Business Cloud API for sending
 * messages, downloading media, and managing message status.
 */

import { env } from "@/env";
import { prisma } from "@/lib/db";

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

/**
 * WhatsApp Cloud API client for sending and receiving messages
 */
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

