/**
 * Contract Service
 * 
 * Manages workspace contracts and seat enforcement (Phase 4)
 */

import "server-only";

import { prisma } from "@/lib/db";
import { getEntitlementsForWorkspace } from "@/lib/entitlements/service";

/**
 * Check if workspace can add more members
 */
export async function canAddMember(
  workspaceId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number | 'unmetered' }> {
  const entitlements = await getEntitlementsForWorkspace(workspaceId, userId);
  
  if (entitlements.maxSeats === 'unmetered') {
    return {
      allowed: true,
      current: 0,
      limit: 'unmetered',
    };
  }

  const currentSeats = await prisma.workspaceMembership.count({
    where: {
      workspaceId,
      status: 'active',
    },
  });

  const limit = entitlements.maxSeats;
  if (typeof limit === 'number') {
    return {
      allowed: currentSeats < limit,
      reason: currentSeats >= limit 
        ? `Workspace has reached its seat limit (${limit}). Contact support to increase your limit.`
        : undefined,
      current: currentSeats,
      limit,
    };
  }

  return {
    allowed: true,
    current: currentSeats,
    limit: 'unmetered',
  };
}

/**
 * Get contract information for a workspace
 */
export async function getWorkspaceContract(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      billingMode: true,
      customPlan: true,
      contractSeats: true,
      contractStart: true,
      contractEnd: true,
      paymentTermsDays: true,
      billingCompanyName: true,
      billingContactEmail: true,
      billingAddress: true,
      _count: {
        select: {
          memberships: true,
        },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  return {
    ...workspace,
    currentSeats: workspace._count.memberships,
  };
}


