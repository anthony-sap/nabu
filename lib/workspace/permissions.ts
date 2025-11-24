/**
 * Workspace Permissions
 * 
 * Role-based permission checks for workspace operations.
 * Combines entitlements with role checks.
 */

import "server-only";

import { WorkspaceRole } from "@/lib/entitlements/types";
import { Entitlements } from "@/lib/entitlements/types";

/**
 * Check if a role can manage workspace members
 */
export function canManageMembers(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a role can manage workspace integrations
 */
export function canManageIntegrations(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a role can create automations
 */
export function canCreateAutomations(role: WorkspaceRole, entitlements: Entitlements): boolean {
  if (role === 'guest') {
    return false;
  }
  return entitlements.canCreateAutomations;
}

/**
 * Check if a role can manage workspace billing
 */
export function canManageBilling(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a role can view workspace analytics
 */
export function canViewAnalytics(role: WorkspaceRole, entitlements: Entitlements): boolean {
  if (role === 'guest') {
    return false;
  }
  return entitlements.canViewAnalytics;
}

/**
 * Check if a role can edit workspace content
 */
export function canEditContent(role: WorkspaceRole): boolean {
  // All active members can edit content
  return role !== 'guest'; // Guests might have read-only access in future
}

/**
 * Check if a role can delete workspace content
 */
export function canDeleteContent(role: WorkspaceRole): boolean {
  // Only members and above can delete
  return role === 'owner' || role === 'admin' || role === 'member';
}


