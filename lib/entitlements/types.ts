/**
 * Entitlements and Tiers Type Definitions
 * 
 * Defines the core types for the entitlement system including plan codes,
 * entitlements, and configuration structures.
 */

/**
 * Plan code identifiers
 */
export type PlanCode = 'free' | 'personal' | 'teams';

/**
 * Automation level for AI-powered automations
 */
export type AutomationLevel = 'none' | 'basic' | 'advanced';

/**
 * Billing mode for workspaces
 */
export type BillingMode = 'self_service' | 'offline_invoice';

/**
 * Workspace member role
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

/**
 * Workspace membership status
 */
export type MembershipStatus = 'pending' | 'active' | 'deactivated';

/**
 * Feature capabilities - boolean flags for what a user/workspace can do
 */
export interface Entitlements {
  // Capture & Integrations
  canUseWhatsApp: boolean;
  canUseWebhooks: boolean;
  canUseTeamsIntegration: boolean;
  canUseEmailIngestion: boolean;
  canUseCalendarIntegration: boolean;
  
  // AI Features
  canUseAiNoteChat: boolean;
  canUseAiLinkedDocs: boolean;
  canUseManualAiActions: boolean; // Summarize, expand, questions, etc.
  aiAutomationLevel: AutomationLevel;
  
  // Organization & Collaboration
  canShareNotes: boolean;
  canUseSharedFolders: boolean;
  canUseSharedTags: boolean;
  canUseRealtimeCollab: boolean;
  canUseTeamSpaces: boolean;
  
  // Workflows & Admin
  canUseOutboundWebhooks: boolean;
  canManageMembers: boolean;
  canManageIntegrations: boolean;
  canCreateAutomations: boolean;
  canViewAnalytics: boolean;
  
  // Limits (numbers or 'unmetered')
  maxAiActionsPerMonth: number | 'unmetered';
  maxAutomationRunsPerMonth: number | 'unmetered';
  maxWebhookEndpoints: number | 'unmetered';
  maxLinkedDocsPerMonth: number | 'unmetered';
  maxSeats: number | 'unmetered';
  maxStorageGB: number | 'unmetered';
  
  // Note sharing limits
  maxNoteShareRecipients: number | 'unmetered';
}

/**
 * Plan configuration structure
 */
export interface PlanConfig {
  code: PlanCode;
  name: string;
  description: string;
  features: {
    whatsappCapture: boolean;
    webhooks: boolean;
    teamsIntegration: boolean;
    emailIngestion: boolean;
    calendarIntegration: boolean;
    aiNoteChat: boolean;
    aiLinkedDocs: boolean;
    aiAutomations: AutomationLevel;
    realtimeCollab: boolean;
    teamSpaces: boolean;
    outboundWebhooks: boolean;
    userManagement: boolean;
    analytics: boolean;
  };
  limits: {
    aiActionsPerMonth: number | 'unmetered';
    automationRunsPerMonth: number | 'unmetered';
    webhookEndpoints: number | 'unmetered';
    linkedDocsPerMonth: number | 'unmetered';
    seats: number | 'unmetered';
    storageGB: number | 'unmetered';
    noteShareRecipients: number | 'unmetered';
  };
}

/**
 * Custom entitlements override for enterprise workspaces
 */
export interface EntitlementsOverride extends Partial<Entitlements> {
  // Allows partial overrides of any entitlement
}

/**
 * Actor context - represents who is making the request
 */
export interface ActorContext {
  type: 'user' | 'workspace';
  id: string;
  userId: string; // The user making the request
  workspaceId?: string; // If workspace context
  role?: WorkspaceRole; // If workspace context
}

/**
 * Entitlements context - combines actor with entitlements
 */
export interface EntitlementsContext {
  actor: ActorContext;
  entitlements: Entitlements;
  planCode: PlanCode;
}


