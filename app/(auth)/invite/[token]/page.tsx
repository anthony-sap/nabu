/**
 * Workspace Invite Acceptance Page
 * 
 * Handles both authenticated and unauthenticated users:
 * - Authenticated: Shows invite details and accept button
 * - Unauthenticated: Shows invite details and redirects to login, then back here
 */

import { redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/db";
import { InviteAcceptanceForm } from "@/components/invite/InviteAcceptanceForm";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptancePage({ params }: PageProps) {
  const { token } = await params;

  // Get invite details
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          planCode: true,
        },
      },
    },
  });

  // Check if invite exists
  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-destructive">Invite Not Found</h1>
          <p className="text-muted-foreground">
            This invite link is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Check if invite is expired
  if (invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-destructive">Invite Expired</h1>
          <p className="text-muted-foreground">
            This invite has expired. Please ask the workspace admin to send a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // Check if invite was already accepted
  if (invite.acceptedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold">Invite Already Used</h1>
          <p className="text-muted-foreground">
            This invite has already been accepted.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const { isAuthenticated, getUser } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  const kindeUser = authenticated ? await getUser() : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <InviteAcceptanceForm
        token={token}
        inviteEmail={invite.email}
        workspaceName={invite.workspace.name}
        workspaceId={invite.workspace.id}
        role={invite.role}
        isAuthenticated={authenticated}
        userEmail={kindeUser?.email || null}
      />
    </div>
  );
}



