/**
 * Usage Tracker
 * 
 * Tracks usage metrics for entitlements and billing.
 * Handles monthly rollover and quota checking.
 */

import "server-only";

import { prisma } from "@/lib/db";

/**
 * Metric types that can be tracked
 */
export type MetricType = 
  | 'ai_actions'
  | 'automation_runs'
  | 'webhook_calls'
  | 'linked_docs';

/**
 * Get current month string in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get usage for a specific metric in the current month
 */
export async function getUsage(
  userId: string,
  tenantId: string | null,
  metricType: MetricType,
  month?: string
): Promise<number> {
  const targetMonth = month || getCurrentMonth();

  const usage = await prisma.usageLog.findUnique({
    where: {
      userId_tenantId_month_metricType: {
        userId,
        tenantId: tenantId || '',
        month: targetMonth,
        metricType,
      },
    },
    select: {
      count: true,
    },
  });

  return usage?.count || 0;
}

/**
 * Increment usage for a metric
 * 
 * Creates or updates the usage log for the current month.
 */
export async function incrementUsage(
  userId: string,
  tenantId: string | null,
  metricType: MetricType,
  amount: number = 1
): Promise<void> {
  const month = getCurrentMonth();

  await prisma.usageLog.upsert({
    where: {
      userId_tenantId_month_metricType: {
        userId,
        tenantId: tenantId || '',
        month,
        metricType,
      },
    },
    create: {
      userId,
      tenantId: tenantId || undefined,
      month,
      metricType,
      count: amount,
      createdBy: userId,
    },
    update: {
      count: {
        increment: amount,
      },
      updatedBy: userId,
    },
  });
}

/**
 * Get all usage metrics for a user in the current month
 */
export async function getAllUsage(
  userId: string,
  tenantId: string | null,
  month?: string
): Promise<Record<MetricType, number>> {
  const targetMonth = month || getCurrentMonth();

  const usageLogs = await prisma.usageLog.findMany({
    where: {
      userId,
      tenantId: tenantId || null,
      month: targetMonth,
    },
  });

  const result: Record<MetricType, number> = {
    ai_actions: 0,
    automation_runs: 0,
    webhook_calls: 0,
    linked_docs: 0,
  };

  for (const log of usageLogs) {
    if (log.metricType in result) {
      result[log.metricType as MetricType] = log.count;
    }
  }

  return result;
}

/**
 * Check if usage is within limit
 */
export async function checkUsageLimit(
  userId: string,
  tenantId: string | null,
  metricType: MetricType,
  limit: number | 'unmetered',
  currentUsage?: number
): Promise<{ allowed: boolean; current: number; remaining: number | 'unmetered' }> {
  if (limit === 'unmetered') {
    return {
      allowed: true,
      current: currentUsage || await getUsage(userId, tenantId, metricType),
      remaining: 'unmetered',
    };
  }

  const current = currentUsage || await getUsage(userId, tenantId, metricType);
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current < limit,
    current,
    remaining,
  };
}




