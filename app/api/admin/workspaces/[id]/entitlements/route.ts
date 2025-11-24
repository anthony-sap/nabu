/**
 * Admin Workspace Entitlements API
 * 
 * Internal admin API for managing workspace entitlements (Phase 4)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { EntitlementsOverride } from "@/lib/entitlements/types";

/**
 * Check if user is admin
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check if user has ADMIN role
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { roles: true },
  });

  if (!dbUser || !dbUser.roles.includes('ADMIN')) {
    throw new Error("Forbidden: Admin access required");
  }
}

/**
 * GET /api/admin/workspaces/[id]/entitlements
 * Get workspace entitlements
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: workspaceId } = await params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        planCode: true,
        billingMode: true,
        customPlan: true,
        entitlementsOverride: true,
        contractSeats: true,
        contractStart: true,
        contractEnd: true,
      },
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return NextResponse.json(
      successResponse(workspace, "Workspace entitlements retrieved")
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/workspaces/[id]/entitlements
 * Update workspace entitlements
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: workspaceId } = await params;
    const body = await req.json();

    const {
      entitlementsOverride,
      contractSeats,
      contractStart,
      contractEnd,
      paymentTermsDays,
      billingCompanyName,
      billingContactEmail,
      billingAddress,
      customPlan,
    } = body;

    // Validate entitlements override
    if (entitlementsOverride && typeof entitlementsOverride !== 'object') {
      return errorResponse("entitlementsOverride must be an object", 400);
    }

    const updateData: any = {};

    if (entitlementsOverride !== undefined) {
      updateData.entitlementsOverride = entitlementsOverride as EntitlementsOverride;
    }

    if (contractSeats !== undefined) {
      updateData.contractSeats = contractSeats;
    }

    if (contractStart !== undefined) {
      updateData.contractStart = contractStart ? new Date(contractStart) : null;
    }

    if (contractEnd !== undefined) {
      updateData.contractEnd = contractEnd ? new Date(contractEnd) : null;
    }

    if (paymentTermsDays !== undefined) {
      updateData.paymentTermsDays = paymentTermsDays;
    }

    if (billingCompanyName !== undefined) {
      updateData.billingCompanyName = billingCompanyName;
    }

    if (billingContactEmail !== undefined) {
      updateData.billingContactEmail = billingContactEmail;
    }

    if (billingAddress !== undefined) {
      updateData.billingAddress = billingAddress;
    }

    if (customPlan !== undefined) {
      updateData.customPlan = customPlan;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    });

    return NextResponse.json(
      successResponse(workspace, "Workspace entitlements updated")
    );
  } catch (error) {
    return handleApiError(error);
  }
}


