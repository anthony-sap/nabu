/**
 * Admin Workspace Usage API
 * 
 * Internal admin API for viewing workspace usage data (Phase 4)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { getWorkspaceUsageHistory, getWorkspaceUsageSnapshot } from "@/lib/billing/usage-snapshot";

/**
 * Check if user is admin
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { roles: true },
  });

  if (!dbUser || !dbUser.roles.includes('ADMIN')) {
    throw new Error("Forbidden: Admin access required");
  }
}

/**
 * GET /api/admin/workspaces/[id]/usage
 * Get workspace usage data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: workspaceId } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    if (month) {
      // Get specific month snapshot
      const snapshot = await getWorkspaceUsageSnapshot(workspaceId, month);
      if (!snapshot) {
        return errorResponse("Usage snapshot not found for this month", 404);
      }
      return NextResponse.json(successResponse(snapshot, "Usage snapshot retrieved"));
    }

    // Get usage history
    const history = await getWorkspaceUsageHistory(workspaceId);
    return NextResponse.json(successResponse(history, "Usage history retrieved"));
  } catch (error) {
    return handleApiError(error);
  }
}


