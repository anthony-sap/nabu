/**
 * Send Workspace Invite Email
 */

import "server-only";

import { sendEmail } from "@/lib/email";
import { generateInviteEmailHtml, InviteEmailData } from "./templates";

interface SendInviteEmailParams {
  recipientEmail: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteToken: string;
  expiresAt: Date;
}

/**
 * Send a workspace invitation email
 */
export async function sendInviteEmail(params: SendInviteEmailParams) {
  const {
    recipientEmail,
    workspaceName,
    inviterName,
    role,
    inviteToken,
    expiresAt,
  } = params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

  const emailData: InviteEmailData = {
    recipientEmail,
    workspaceName,
    inviterName,
    role,
    inviteUrl,
    expiresAt,
  };

  const htmlBody = generateInviteEmailHtml(emailData);

  try {
    const result = await sendEmail({
      recipient: recipientEmail,
      subject: `You're invited to join ${workspaceName} on Nabu`,
      htmlBody,
    });

    console.log(`[Email] Invite email sent to ${recipientEmail}`, result);
    return { success: true, messageId: result?.MessageID };
  } catch (error) {
    console.error(`[Email] Failed to send invite email to ${recipientEmail}:`, error);
    return { success: false, error };
  }
}



