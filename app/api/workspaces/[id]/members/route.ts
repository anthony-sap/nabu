/**
 * Workspace Members API
 * 
 * List and manage workspace members
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { canManageMembers } from "@/lib/workspace/permissions";

/**
 * GET /api/workspaces/[id]/members
 * List workspace members
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { id: workspaceId } = await params;

    // Check if user is a member
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    // Get all members
    const members = await prisma.workspaceMembership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // Owners first
        { acceptedAt: 'asc' },
      ],
    });

    return NextResponse.json(
      successResponse(
        members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          image: m.user.image,
          role: m.role,
          status: m.status,
          acceptedAt: m.acceptedAt,
        }))
      )
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/workspaces/[id]/members
 * Update a member's role
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { id: workspaceId } = await params;
    const body = await req.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return errorResponse("Member ID and role are required", 400);
    }

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
      return errorResponse("You don't have permission to manage members", 403);
    }

    // Get target membership
    const targetMembership = await prisma.workspaceMembership.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      return errorResponse("Member not found", 404);
    }

    // Can't change owner role
    if (targetMembership.role === 'owner') {
      return errorResponse("Cannot change owner's role", 400);
    }

    // Can't promote to owner
    if (role === 'owner') {
      return errorResponse("Cannot promote to owner. Use transfer ownership instead.", 400);
    }

    // Update role
    const updated = await prisma.workspaceMembership.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json(
      successResponse({ id: updated.id, role: updated.role }, "Role updated successfully")
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/workspaces/[id]/members
 * Remove a member from workspace
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { id: workspaceId } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return errorResponse("Member ID is required", 400);
    }

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
      return errorResponse("You don't have permission to remove members", 403);
    }

    // Get target membership
    const targetMembership = await prisma.workspaceMembership.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      return errorResponse("Member not found", 404);
    }

    // Can't remove owner
    if (targetMembership.role === 'owner') {
      return errorResponse("Cannot remove workspace owner", 400);
    }

    // Remove member
    await prisma.workspaceMembership.delete({
      where: { id: memberId },
    });

    return NextResponse.json(
      successResponse(null, "Member removed successfully")
    );
  } catch (error) {
    return handleApiError(error);
  }
}



