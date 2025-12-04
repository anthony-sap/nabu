/**
 * Invite Acceptance API
 * 
 * Validate and accept workspace invites
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { syncUser } from "@/lib/user-sync";

/**
 * GET /api/invites/[token]
 * Validate invite token
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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

    if (!invite) {
      return errorResponse("Invite not found", 404);
    }

    if (invite.acceptedAt) {
      return errorResponse("This invite has already been accepted", 400);
    }

    if (invite.expiresAt < new Date()) {
      return errorResponse("This invite has expired", 400);
    }

    return NextResponse.json(
      successResponse({
        email: invite.email,
        role: invite.role,
        workspace: invite.workspace,
      }, "Invite is valid")
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/invites/[token]
 * Accept invite
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const kindeUser = await getCurrentUser();
    if (!kindeUser || !kindeUser.email) {
      return errorResponse("You must be logged in to accept an invite", 401);
    }

    const { token } = await params;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    });

    if (!invite) {
      return errorResponse("Invite not found", 404);
    }

    if (invite.acceptedAt) {
      return errorResponse("This invite has already been accepted", 400);
    }

    if (invite.expiresAt < new Date()) {
      return errorResponse("This invite has expired", 400);
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== kindeUser.email.toLowerCase()) {
      return errorResponse(
        `This invite was sent to ${invite.email}, but you're logged in as ${kindeUser.email}`,
        403
      );
    }

    // Ensure user exists in database (sync if needed)
    // This handles the case where user exists in Kinde but not in our database
    try {
      await syncUser(kindeUser);
      console.log(`[InviteAccept] User synced to database: ${kindeUser.email}`);
    } catch (syncError: any) {
      console.error(`[InviteAccept] Failed to sync user: ${kindeUser.email}`, syncError);
      // If sync fails, we can't proceed - return error with helpful message
      return errorResponse(
        `Failed to sync user account: ${syncError?.message || 'Unknown error'}. Please try logging out and logging back in, or contact support.`,
        500
      );
    }

    // Verify user exists in database before creating membership
    const dbUser = await prisma.user.findUnique({
      where: { id: kindeUser.id },
      select: { id: true },
    });

    if (!dbUser) {
      return errorResponse(
        "User account not found in database. Please try logging out and logging back in.",
        500
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: kindeUser.id,
        },
      },
    });

    if (existingMembership) {
      // Mark invite as accepted anyway
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return errorResponse("You are already a member of this workspace", 400);
    }

    // Create membership
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: kindeUser.id,
        role: invite.role as 'owner' | 'admin' | 'member' | 'guest',
        status: 'active',
        acceptedAt: new Date(),
      },
    });

    // Mark invite as accepted
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json(
      successResponse(
        {
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspace.name,
        },
        "Invite accepted successfully"
      )
    );
  } catch (error) {
    return handleApiError(error);
  }
}




