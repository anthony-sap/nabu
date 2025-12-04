/**
 * Plan Configurations
 * 
 * Defines the base plan configurations for Free, Personal, and Teams tiers.
 * Based on the entitlements-tiers.md specification.
 */

import { PlanConfig, PlanCode } from './types';

/**
 * Base plan configurations
 * 
 * These define what each tier includes by default.
 * Custom plans (Phase 4) can override these via entitlementsOverride.
 */
export const PLAN_CONFIGS: Record<PlanCode, PlanConfig> = {
  free: {
    code: 'free',
    name: 'Free',
    description: 'Capture & Find - Solo use, great capture + powerful search',
    features: {
      whatsappCapture: false,
      webhooks: false,
      teamsIntegration: false,
      emailIngestion: false,
      calendarIntegration: false,
      aiNoteChat: false,
      aiLinkedDocs: false,
      aiAutomations: 'none',
      realtimeCollab: false,
      teamSpaces: false,
      outboundWebhooks: false,
      userManagement: false,
      analytics: false,
    },
    limits: {
      aiActionsPerMonth: 20, // Small trial pack
      automationRunsPerMonth: 0,
      webhookEndpoints: 0,
      linkedDocsPerMonth: 0,
      seats: 1,
      storageGB: 1,
      noteShareRecipients: 5, // Limited recipients
    },
  },
  
  personal: {
    code: 'personal',
    name: 'Personal',
    description: 'Connected Brain - Power user tier with integrations and AI',
    features: {
      whatsappCapture: true,
      webhooks: true,
      teamsIntegration: false,
      emailIngestion: false,
      calendarIntegration: false,
      aiNoteChat: true,
      aiLinkedDocs: true,
      aiAutomations: 'basic',
      realtimeCollab: false,
      teamSpaces: false,
      outboundWebhooks: false,
      userManagement: false,
      analytics: true, // Per-user stats
    },
    limits: {
      aiActionsPerMonth: 1000,
      automationRunsPerMonth: 300,
      webhookEndpoints: 3,
      linkedDocsPerMonth: 200,
      seats: 1,
      storageGB: 10,
      noteShareRecipients: 'unmetered',
    },
  },
  
  teams: {
    code: 'teams',
    name: 'Teams',
    description: 'Shared Brain & Workflows - For teams with collaboration and advanced features',
    features: {
      whatsappCapture: true,
      webhooks: true,
      teamsIntegration: true,
      emailIngestion: true,
      calendarIntegration: true,
      aiNoteChat: true,
      aiLinkedDocs: true,
      aiAutomations: 'advanced',
      realtimeCollab: true,
      teamSpaces: true,
      outboundWebhooks: true,
      userManagement: true,
      analytics: true, // Workspace analytics
    },
    limits: {
      aiActionsPerMonth: 10000, // Pooled quota
      automationRunsPerMonth: 'unmetered',
      webhookEndpoints: 'unmetered',
      linkedDocsPerMonth: 'unmetered',
      seats: 'unmetered', // Priced per user
      storageGB: 'unmetered',
      noteShareRecipients: 'unmetered',
    },
  },
};

/**
 * Get plan configuration by code
 */
export function getPlanConfig(code: PlanCode): PlanConfig {
  return PLAN_CONFIGS[code];
}

/**
 * Get all plan codes
 */
export function getAllPlanCodes(): PlanCode[] {
  return Object.keys(PLAN_CONFIGS) as PlanCode[];
}


