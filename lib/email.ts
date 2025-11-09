import "server-only";

import { Attachment, Message, ServerClient } from "postmark";

import { env } from "@/env";

const emailClient = new ServerClient(env.POSTMARK_API_KEY);

export { emailClient };

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

  if (!env.POSTMARK_API_KEY || !env.EMAIL_FROM) {
    console.error("Missing postmark credentials");
    console.log("sendEmail->props->", props);
    return;
  }

  // If API key is "test", log instead of sending
  if (env.POSTMARK_API_KEY === "test") {
    console.log("=== EMAIL LOG (TEST MODE) ===");
    console.log("To:", recipient);
    console.log("From:", env.EMAIL_FROM);
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

  try {
    let result;

    if (templateAlias) {
      // Use Postmark template
      result = await emailClient.sendEmailWithTemplate({
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
      result = await emailClient.sendEmail(payload);
    }

    return result;
  } catch (e) {
    console.error(e);
  }
};
