/**
 * Email Templates
 * 
 * HTML email templates for various notifications.
 */

export interface InviteEmailData {
  recipientEmail: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

/**
 * Generate workspace invite email HTML
 */
export function generateInviteEmailHtml(data: InviteEmailData): string {
  const roleDescription: Record<string, string> = {
    admin: "manage members and workspace settings",
    member: "create and edit notes",
    guest: "view and comment on shared content",
  };

  const roleText = roleDescription[data.role] || "collaborate with the team";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${data.workspaceName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
    }
    h1 {
      color: #111;
      font-size: 24px;
      margin-bottom: 16px;
    }
    .workspace-name {
      color: #6366f1;
      font-weight: 600;
    }
    .role-badge {
      display: inline-block;
      background: #f3f4f6;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      color: #666;
      margin: 8px 0;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 24px 0;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .expires {
      font-size: 13px;
      color: #888;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Nabu</div>
    </div>
    
    <h1>You're Invited!</h1>
    
    <p>
      <strong>${data.inviterName}</strong> has invited you to join 
      <span class="workspace-name">${data.workspaceName}</span> on Nabu.
    </p>
    
    <p>
      As a <span class="role-badge">${data.role}</span> you'll be able to ${roleText}.
    </p>
    
    <div style="text-align: center;">
      <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
    </div>
    
    <p class="expires">
      This invite expires on ${data.expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}.
    </p>
    
    <div class="footer">
      <p>
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
      <p>
        &copy; ${new Date().getFullYear()} Nabu. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate plain text version of invite email
 */
export function generateInviteEmailText(data: InviteEmailData): string {
  return `
You're Invited to Join ${data.workspaceName} on Nabu!

${data.inviterName} has invited you to join ${data.workspaceName}.

Role: ${data.role}

Click here to accept: ${data.inviteUrl}

This invite expires on ${data.expiresAt.toLocaleDateString()}.

If you weren't expecting this invitation, you can safely ignore this email.
`.trim();
}



