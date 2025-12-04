/**
 * Entitlements Context
 * 
 * Server-side helpers for attaching entitlements to request context.
 * Used in API routes and server components.
 */

import "server-only";

import { getCurrentUser } from "@/lib/session";
import { getUserContext } from "@/lib/nabu-helpers";
import { ActorContext, EntitlementsContext, Entitlements } from "./types";
import { getEntitlementsForUser, getEntitlementsForWorkspace } from "./service";

/**
 * Resolve actor context from request
 * 
 * Determines if the request is in personal or workspace context.
 */
export async function resolveActor(
  workspaceId?: string
): Promise<ActorContext | null> {
  const user = await getCurrentUser();
  
  if (!user || !user.id) {
    return null;
  }

  if (workspaceId) {
    // Workspace context - query membership role
    const { prisma } = await import("@/lib/db");
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (!membership || membership.status !== 'active') {
      return null; // User is not an active member
    }

    return {
      type: 'workspace',
      id: workspaceId,
      userId: user.id,
      workspaceId,
      role: membership.role as 'owner' | 'admin' | 'member' | 'guest',
    };
  }

  // Personal context
  return {
    type: 'user',
    id: user.id,
    userId: user.id,
  };
}

/**
 * Get entitlements context for current request
 * 
 * Returns the actor and their entitlements.
 */
export async function getEntitlementsContext(
  workspaceId?: string
): Promise<EntitlementsContext | null> {
  const actor = await resolveActor(workspaceId);
  
  if (!actor) {
    return null;
  }

  let entitlements: Entitlements;
  let planCode: 'free' | 'personal' | 'teams';

  if (actor.type === 'workspace' && actor.workspaceId) {
    entitlements = await getEntitlementsForWorkspace(
      actor.workspaceId,
      actor.userId
    );
    planCode = 'teams'; // Workspaces are always Teams plan
  } else {
    entitlements = await getEntitlementsForUser(actor.userId);
    
    // Determine plan code from entitlements
    // This is a simple heuristic - in practice, we'd store it
    if (entitlements.canUseTeamSpaces) {
      planCode = 'teams';
    } else if (entitlements.canUseWhatsApp || entitlements.canUseWebhooks) {
      planCode = 'personal';
    } else {
      planCode = 'free';
    }
  }

  return {
    actor,
    entitlements,
    planCode,
  };
}

/**
 * Get entitlements for current user (personal context)
 * 
 * Convenience function for personal context only.
 */
export async function getCurrentUserEntitlements(): Promise<Entitlements | null> {
  try {
    const { userId } = await getUserContext();
    return await getEntitlementsForUser(userId);
  } catch {
    return null;
  }
}

