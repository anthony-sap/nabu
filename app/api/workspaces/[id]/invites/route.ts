/**
 * Workspace Invites API
 * 
 * Create and manage workspace invites
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { getEntitlementsForWorkspace } from "@/lib/entitlements/service";
import { canManageMembers } from "@/lib/workspace/permissions";
import crypto from "crypto";

/**
 * POST /api/workspaces/[id]/invites
 * Create a workspace invite
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { id: workspaceId } = await params;
    const body = await req.json();
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string') {
      return errorResponse("Email is required", 400);
    }

    // Check permissions
    const entitlements = await getEntitlementsForWorkspace(workspaceId, userId);
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || !canManageMembers(membership.role as any)) {
      return errorResponse("You don't have permission to invite members", 403);
    }

    // Check seat limit (Phase 4)
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (workspace && entitlements.maxSeats !== 'unmetered') {
      const currentSeats = workspace._count.memberships;
      if (typeof entitlements.maxSeats === 'number' && currentSeats >= entitlements.maxSeats) {
        return errorResponse(
          `Workspace has reached its seat limit (${entitlements.maxSeats}). Contact support to increase your limit.`,
          403
        );
      }
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: email.toLowerCase().trim(),
        role: role as 'admin' | 'member' | 'guest',
        token,
        expiresAt,
        createdById: userId,
      },
    });

    // TODO: Send email with invite link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invites/${token}`;

    return NextResponse.json(
      successResponse(
        {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          token: invite.token,
          inviteUrl,
          expiresAt: invite.expiresAt,
        },
        "Invite created successfully"
      ),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/workspaces/[id]/invites
 * List workspace invites
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { id: workspaceId } = await params;

    // Check permissions
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || !canManageMembers(membership.role as any)) {
      return errorResponse("You don't have permission to view invites", 403);
    }

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      successResponse(invites, "Invites retrieved successfully")
    );
  } catch (error) {
    return handleApiError(error);
  }
}


