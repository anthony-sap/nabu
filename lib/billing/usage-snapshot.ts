/**
 * Usage Snapshot Service
 * 
 * Captures monthly usage snapshots for workspace billing and invoicing.
 */

import "server-only";

import { prisma } from "@/lib/db";
import { getCurrentMonth } from "@/lib/usage/tracker";

/**
 * Create usage snapshot for a workspace
 */
export async function createWorkspaceUsageSnapshot(
  workspaceId: string,
  month?: string
): Promise<void> {
  const targetMonth = month || getCurrentMonth();

  // Check if snapshot already exists
  const existing = await prisma.workspaceUsageSnapshot.findUnique({
    where: {
      workspaceId_month: {
        workspaceId,
        month: targetMonth,
      },
    },
  });

  if (existing) {
    return; // Already captured
  }

  // Count active seats
  const activeMembers = await prisma.workspaceMembership.count({
    where: {
      workspaceId,
      status: 'active',
    },
  });

  // Get workspace content for usage calculation
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      memberships: {
        where: { status: 'active' },
        select: { userId: true },
      },
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const userIds = workspace.memberships.map((m) => m.userId);

  // Calculate AI actions for the month
  const aiActions = await prisma.usageLog.aggregate({
    where: {
      userId: { in: userIds },
      month: targetMonth,
      metricType: 'ai_actions',
    },
    _sum: {
      count: true,
    },
  });

  // Calculate automation runs
  const automationRuns = await prisma.usageLog.aggregate({
    where: {
      userId: { in: userIds },
      month: targetMonth,
      metricType: 'automation_runs',
    },
    _sum: {
      count: true,
    },
  });

  // Calculate storage (simplified - would need actual storage calculation)
  // For now, use note/thought count as proxy
  const notesCount = await prisma.note.count({
    where: {
      workspaceId,
      deletedAt: null,
    },
  });

  const storageGB = notesCount * 0.001; // Rough estimate: 1MB per note

  // Create snapshot
  await prisma.workspaceUsageSnapshot.create({
    data: {
      workspaceId,
      month: targetMonth,
      seats: activeMembers,
      aiActions: aiActions._sum.count || 0,
      automationRuns: automationRuns._sum.count || 0,
      storageGB,
    },
  });
}

/**
 * Get usage snapshot for a workspace
 */
export async function getWorkspaceUsageSnapshot(
  workspaceId: string,
  month?: string
) {
  const targetMonth = month || getCurrentMonth();

  return await prisma.workspaceUsageSnapshot.findUnique({
    where: {
      workspaceId_month: {
        workspaceId,
        month: targetMonth,
      },
    },
  });
}

/**
 * Get all usage snapshots for a workspace
 */
export async function getWorkspaceUsageHistory(workspaceId: string) {
  return await prisma.workspaceUsageSnapshot.findMany({
    where: { workspaceId },
    orderBy: { month: 'desc' },
  });
}




