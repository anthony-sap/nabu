import "server-only";

import { Attachment, Message, ServerClient } from "postmark";

import { env } from "@/env";

// Lazy initialization to avoid errors when API key is missing or invalid
let emailClient: ServerClient | null = null;

function getEmailClient(): ServerClient | null {
  // Only initialize if we have a valid API key (not "test" or empty)
  if (!emailClient && env.POSTMARK_API_KEY && env.POSTMARK_API_KEY !== "test" && env.POSTMARK_API_KEY !== "local") {
    try {
      emailClient = new ServerClient(env.POSTMARK_API_KEY);
    } catch (error) {
      console.error("[Email] Failed to initialize Postmark client:", error);
      return null;
    }
  }
  return emailClient;
}

export { getEmailClient };

export enum EMAIL_TEMPLATES {
  NEW_USER = "user-invitation",
  TWO_FA = "two-fa-verification-code",
}

export interface SendEmailProps {
  recipient: string;
  subject: string;
  templateAlias?: string;
  templateData?: { [key: string]: any };
  htmlBody?: string;
  attachments?: Attachment[];
}

export const sendEmail = async (props: SendEmailProps) => {
  const {
    recipient,
    subject,
    templateAlias,
    templateData,
    htmlBody,
    attachments,
  } = props;

  // Test mode or missing credentials - log instead of sending
  if (!env.POSTMARK_API_KEY || env.POSTMARK_API_KEY === "test" || env.POSTMARK_API_KEY === "local" || !env.EMAIL_FROM) {
    console.log("=== EMAIL LOG (TEST MODE) ===");
    console.log("To:", recipient);
    console.log("From:", env.EMAIL_FROM || "noreply@localhost");
    console.log("Subject:", subject);
    if (templateAlias) {
      console.log("Template Alias:", templateAlias);
      console.log("Template Data:", templateData);
    } else {
      console.log("HTML Body:", htmlBody);
    }
    console.log("=============================");
    return { MessageID: "test-message-id" };
  }

  // Get email client (lazy initialization)
  const client = getEmailClient();
  if (!client) {
    console.error("[Email] Postmark client not initialized. Check POSTMARK_API_KEY.");
    console.log("[Email] Email would have been sent to:", recipient);
    console.log("[Email] Subject:", subject);
    return;
  }

  try {
    let result;

    if (templateAlias) {
      // Use Postmark template
      result = await client.sendEmailWithTemplate({
        From: env.EMAIL_FROM,
        To: recipient,
        TemplateAlias: templateAlias,
        TemplateModel: templateData || {},
        Attachments: attachments,
      });
    } else {
      // Use HTML content
      const payload: Message = {
        From: env.EMAIL_FROM,
        To: recipient,
        Subject: subject,
        HtmlBody: htmlBody || "",
        Attachments: attachments,
      };
      result = await client.sendEmail(payload);
    }

    return result;
  } catch (e) {
    console.error("[Email] Error sending email:", e);
    throw e;
  }
};
