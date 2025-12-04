/**
 * AI Quota Tracker
 * 
 * Tracks and validates AI action usage against entitlements.
 * Used before executing AI operations like summarization, chat, etc.
 */

import "server-only";

import { getEntitlementsForUser } from "@/lib/entitlements/service";
import { incrementUsage, checkUsageLimit, getUsage } from "@/lib/usage/tracker";
import { getUserContext } from "@/lib/nabu-helpers";

/**
 * AI action types that count against quota
 */
export type AiActionType = 
  | 'summarize'
  | 'expand'
  | 'questions'
  | 'extract_tasks'
  | 'chat'
  | 'linked_doc';

/**
 * Check if user can perform an AI action
 * 
 * Returns whether the action is allowed and current usage info.
 */
export async function checkAiQuota(
  userId: string,
  tenantId: string | null,
  actionType: AiActionType = 'summarize'
): Promise<{
  allowed: boolean;
  current: number;
  limit: number | 'unmetered';
  remaining: number | 'unmetered';
  error?: string;
}> {
  const entitlements = await getEntitlementsForUser(userId);

  // Check if manual AI actions are enabled
  if (!entitlements.canUseManualAiActions) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      error: "AI actions are not available on your current plan. Upgrade to Personal to use AI features.",
    };
  }

  // Check quota
  const quotaCheck = await checkUsageLimit(
    userId,
    tenantId,
    'ai_actions',
    entitlements.maxAiActionsPerMonth
  );

  return {
    allowed: quotaCheck.allowed,
    current: quotaCheck.current,
    limit: entitlements.maxAiActionsPerMonth,
    remaining: quotaCheck.remaining,
    error: quotaCheck.allowed 
      ? undefined 
      : `You've reached your AI action limit (${entitlements.maxAiActionsPerMonth}/month). Upgrade your plan for more.`,
  };
}

/**
 * Record an AI action usage
 * 
 * Call this after successfully completing an AI action.
 */
export async function recordAiAction(
  userId: string,
  tenantId: string | null,
  actionType: AiActionType = 'summarize'
): Promise<void> {
  await incrementUsage(userId, tenantId, 'ai_actions', 1);
}

/**
 * Check AI quota for current user
 * 
 * Convenience function that gets user context automatically.
 */
export async function checkCurrentUserAiQuota(
  actionType: AiActionType = 'summarize'
): Promise<{
  allowed: boolean;
  current: number;
  limit: number | 'unmetered';
  remaining: number | 'unmetered';
  error?: string;
}> {
  const { userId, tenantId } = await getUserContext();
  return checkAiQuota(userId, tenantId, actionType);
}




