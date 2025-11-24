/**
 * Entitlements Middleware
 * 
 * Higher-order functions and utilities for gating API routes
 * based on entitlements.
 */

import { NextResponse } from "next/server";
import { Entitlements } from "./types";
import { canUseFeature, checkLimit } from "./service";

/**
 * Error response for missing entitlement
 */
export function createEntitlementError(
  feature: string,
  upgradeMessage?: string
): NextResponse {
  return NextResponse.json(
    {
      error: "Feature not available",
      message: upgradeMessage || `This feature requires an upgrade.`,
      feature,
    },
    { status: 403 }
  );
}

/**
 * Error response for limit exceeded
 */
export function createLimitError(
  limitType: string,
  current: number,
  max: number | 'unmetered',
  upgradeMessage?: string
): NextResponse {
  return NextResponse.json(
    {
      error: "Limit exceeded",
      message: upgradeMessage || `You have reached your limit for ${limitType}.`,
      limitType,
      current,
      max,
    },
    { status: 403 }
  );
}

/**
 * Require a specific entitlement
 * 
 * Returns a middleware function that checks if the user has the required capability.
 */
export function requireEntitlement(
  capability: keyof Entitlements,
  upgradeMessage?: string
) {
  return (entitlements: Entitlements): NextResponse | null => {
    if (!canUseFeature(entitlements, capability)) {
      return createEntitlementError(
        capability as string,
        upgradeMessage
      );
    }
    return null;
  };
}

/**
 * Require a limit check
 * 
 * Returns a middleware function that validates usage against a limit.
 */
export function requireLimit(
  limitType: keyof Entitlements,
  currentUsage: number,
  upgradeMessage?: string
) {
  return (entitlements: Entitlements): NextResponse | null => {
    if (!checkLimit(entitlements, limitType, currentUsage)) {
      const limit = entitlements[limitType];
      return createLimitError(
        limitType as string,
        currentUsage,
        typeof limit === 'number' ? limit : 'unmetered',
        upgradeMessage
      );
    }
    return null;
  };
}

/**
 * Combine multiple entitlement checks
 * 
 * All checks must pass for the request to proceed.
 */
export function requireAll(
  ...checks: Array<(entitlements: Entitlements) => NextResponse | null>
) {
  return (entitlements: Entitlements): NextResponse | null => {
    for (const check of checks) {
      const error = check(entitlements);
      if (error) {
        return error;
      }
    }
    return null;
  };
}

/**
 * Require any of the entitlements
 * 
 * At least one check must pass.
 */
export function requireAny(
  ...checks: Array<(entitlements: Entitlements) => NextResponse | null>
) {
  return (entitlements: Entitlements): NextResponse | null => {
    for (const check of checks) {
      const error = check(entitlements);
      if (!error) {
        return null; // At least one passed
      }
    }
    // All failed - return the first error
    return checks[0](entitlements);
  };
}


