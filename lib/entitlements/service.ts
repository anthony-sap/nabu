/**
 * Entitlements Service
 * 
 * Core service for resolving and checking user/workspace entitlements.
 * Converts plan configurations into actionable entitlements.
 */

import "server-only";

import { prisma } from "@/lib/db";
import { PlanCode, Entitlements, PlanConfig, EntitlementsOverride, AutomationLevel, WorkspaceRole } from "./types";
import { PLAN_CONFIGS } from "./plans";
import type { Prisma } from "@prisma/client";

/**
 * Convert plan configuration to entitlements object
 */
function planConfigToEntitlements(config: PlanConfig): Entitlements {
  return {
    // Capture & Integrations
    canUseWhatsApp: config.features.whatsappCapture,
    canUseWebhooks: config.features.webhooks,
    canUseTeamsIntegration: config.features.teamsIntegration,
    canUseEmailIngestion: config.features.emailIngestion,
    canUseCalendarIntegration: config.features.calendarIntegration,
    
    // AI Features
    canUseAiNoteChat: config.features.aiNoteChat,
    canUseAiLinkedDocs: config.features.aiLinkedDocs,
    canUseManualAiActions: config.features.aiNoteChat || config.features.aiLinkedDocs,
    aiAutomationLevel: config.features.aiAutomations,
    
    // Organization & Collaboration
    canShareNotes: true, // All plans can share notes
    canUseSharedFolders: config.features.teamSpaces,
    canUseSharedTags: config.features.teamSpaces,
    canUseRealtimeCollab: config.features.realtimeCollab,
    canUseTeamSpaces: config.features.teamSpaces,
    
    // Workflows & Admin
    canUseOutboundWebhooks: config.features.outboundWebhooks,
    canManageMembers: config.features.userManagement,
    canManageIntegrations: config.features.userManagement,
    canCreateAutomations: config.features.aiAutomations !== 'none',
    canViewAnalytics: config.features.analytics,
    
    // Limits
    maxAiActionsPerMonth: config.limits.aiActionsPerMonth,
    maxAutomationRunsPerMonth: config.limits.automationRunsPerMonth,
    maxWebhookEndpoints: config.limits.webhookEndpoints,
    maxLinkedDocsPerMonth: config.limits.linkedDocsPerMonth,
    maxSeats: config.limits.seats,
    maxStorageGB: config.limits.storageGB,
    maxNoteShareRecipients: config.limits.noteShareRecipients,
  };
}

/**
 * Apply role-based modifications to entitlements
 * 
 * For workspace members, certain capabilities are restricted by role.
 */
function applyRoleModifiers(
  entitlements: Entitlements,
  role?: WorkspaceRole
): Entitlements {
  if (!role) {
    return entitlements;
  }

  const modified = { ...entitlements };

  // Guests have limited permissions
  if (role === 'guest') {
    modified.canManageMembers = false;
    modified.canManageIntegrations = false;
    modified.canCreateAutomations = false;
  }

  // Members can't manage workspace settings
  if (role === 'member') {
    modified.canManageMembers = false;
    modified.canManageIntegrations = false;
  }

  // Owner and admin have full permissions (already set by plan)

  return modified;
}

/**
 * Apply custom entitlements override
 * 
 * Merges custom overrides on top of base entitlements.
 */
function applyOverrides(
  entitlements: Entitlements,
  overrides?: EntitlementsOverride | null
): Entitlements {
  if (!overrides) {
    return entitlements;
  }

  return {
    ...entitlements,
    ...overrides,
  };
}

/**
 * Get entitlements for a user
 * 
 * Resolves the user's plan and returns their entitlements.
 */
export async function getEntitlementsForUser(
  userId: string
): Promise<Entitlements> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Determine plan code from user.plan or Stripe subscription
  let planCode: PlanCode = (user.plan as PlanCode) || 'free';

  // If user has active Stripe subscription, check if it maps to a plan
  // This will be handled in Phase 2 when we update subscription.ts
  // For now, use the plan field directly

  const config = PLAN_CONFIGS[planCode];
  return planConfigToEntitlements(config);
}

/**
 * Get entitlements for a workspace
 * 
 * Resolves workspace plan and member role, then returns entitlements.
 */
export async function getEntitlementsForWorkspace(
  workspaceId: string,
  userId: string
): Promise<Entitlements> {
  // Query workspace and membership
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      planCode: true,
      entitlementsOverride: true,
      customPlan: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: {
      role: true,
      status: true,
    },
  });

  if (!membership || membership.status !== 'active') {
    throw new Error("User is not an active member of this workspace");
  }

  const role = membership.role as WorkspaceRole;
  const config = PLAN_CONFIGS[workspace.planCode as PlanCode] || PLAN_CONFIGS['teams'];
  let entitlements = planConfigToEntitlements(config);
  
  // Apply role modifiers
  entitlements = applyRoleModifiers(entitlements, role);
  
  // Apply custom overrides (Phase 4)
  if (workspace.customPlan && workspace.entitlementsOverride) {
    entitlements = applyOverrides(entitlements, workspace.entitlementsOverride as EntitlementsOverride);
  }
  
  return entitlements;
}

/**
 * Check if a feature is available
 */
export function canUseFeature(
  entitlements: Entitlements,
  feature: keyof Entitlements
): boolean {
  const value = entitlements[feature];
  return typeof value === 'boolean' ? value : false;
}

/**
 * Check if a limit allows the requested amount
 */
export function checkLimit(
  entitlements: Entitlements,
  limitType: keyof Entitlements,
  requested: number
): boolean {
  const limit = entitlements[limitType];
  
  if (limit === 'unmetered') {
    return true;
  }
  
  if (typeof limit === 'number') {
    return requested <= limit;
  }
  
  return false;
}

/**
 * Get remaining quota for a limit
 */
export function getRemainingQuota(
  entitlements: Entitlements,
  limitType: keyof Entitlements,
  current: number
): number | 'unmetered' {
  const limit = entitlements[limitType];
  
  if (limit === 'unmetered') {
    return 'unmetered';
  }
  
  if (typeof limit === 'number') {
    return Math.max(0, limit - current);
  }
  
  return 0;
}

