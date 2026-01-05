/**
 * Workspace Usage API
 * 
 * User-facing API for viewing workspace usage data.
 * Requires workspace membership and appropriate permissions.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { getWorkspaceUsageHistory, getWorkspaceUsageSnapshot } from "@/lib/billing/usage-snapshot";
import { canViewAnalytics } from "@/lib/workspace/permissions";
import { getEntitlementsForUser } from "@/lib/entitlements/service";
import { getCurrentMonth } from "@/lib/usage/tracker";

/**
 * GET /api/workspaces/[id]/usage
 * Get workspace usage data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { id: workspaceId } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const includeRealtime = searchParams.get("includeRealtime") === "true";

    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      return errorResponse("You are not a member of this workspace", 403);
    }

    // Check if user can view analytics
    const entitlements = await getEntitlementsForUser(userId);
    if (!canViewAnalytics(membership.role as any, entitlements)) {
      return errorResponse("You don't have permission to view workspace analytics", 403);
    }

    // Get usage snapshot or history
    let usageData: any = null;

    if (month) {
      // Get specific month snapshot
      const snapshot = await getWorkspaceUsageSnapshot(workspaceId, month);
      if (!snapshot) {
        return errorResponse("Usage snapshot not found for this month", 404);
      }
      usageData = snapshot;
    } else {
      // Get usage history
      const history = await getWorkspaceUsageHistory(workspaceId);
      usageData = history;
    }

    // If includeRealtime is true, add current real-time stats
    if (includeRealtime) {
      const currentMonth = getCurrentMonth();
      
      // Get workspace member user IDs for usage calculation
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          memberships: {
            where: { status: 'active' },
            select: { userId: true },
          },
        },
      });

      if (workspace) {
        const userIds = workspace.memberships.map((m) => m.userId);

        // Get current month AI actions
        const aiActions = await prisma.usageLog.aggregate({
          where: {
            userId: { in: userIds },
            month: currentMonth,
            metricType: 'ai_actions',
          },
          _sum: {
            count: true,
          },
        });

        // Get current month automation runs
        const automationRuns = await prisma.usageLog.aggregate({
          where: {
            userId: { in: userIds },
            month: currentMonth,
            metricType: 'automation_runs',
          },
          _sum: {
            count: true,
          },
        });

        // Get workspace content counts
        const notesCount = await prisma.note.count({
          where: {
            workspaceId,
            deletedAt: null,
          },
        });

        const foldersCount = await prisma.folder.count({
          where: {
            workspaceId,
            deletedAt: null,
          },
        });

        const activeSeats = workspace.memberships.length;

        // Add real-time stats to response
        usageData = {
          ...usageData,
          realtime: {
            activeSeats,
            notesCount,
            foldersCount,
            aiActions: aiActions._sum.count || 0,
            automationRuns: automationRuns._sum.count || 0,
            month: currentMonth,
          },
        };
      }
    }

    return NextResponse.json(
      successResponse(usageData, month ? "Usage snapshot retrieved" : "Usage history retrieved")
    );
  } catch (error) {
    return handleApiError(error);
  }
}









