/**
 * Workspaces API
 * 
 * Create and list workspaces
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { getEntitlementsForUser } from "@/lib/entitlements/service";

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse("Workspace name is required", 400);
    }

    // Check if user has Teams plan entitlement
    const entitlements = await getEntitlementsForUser(userId);
    if (!entitlements.canUseTeamSpaces) {
      return errorResponse(
        "Workspaces require a Teams plan. Upgrade to Teams to create workspaces.",
        403
      );
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        planCode: 'teams',
        billingMode: 'self_service',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Create membership for creator as owner
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'owner',
        status: 'active',
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json(
      successResponse(workspace, "Workspace created successfully"),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/workspaces
 * List user's workspaces
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getUserContext();

    const memberships = await prisma.workspaceMembership.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            planCode: true,
            billingMode: true,
            createdAt: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      planCode: m.workspace.planCode,
      billingMode: m.workspace.billingMode,
      role: m.role,
      memberCount: m.workspace._count.memberships,
      createdAt: m.workspace.createdAt,
    }));

    return NextResponse.json(
      successResponse(workspaces, "Workspaces retrieved successfully")
    );
  } catch (error) {
    return handleApiError(error);
  }
}




