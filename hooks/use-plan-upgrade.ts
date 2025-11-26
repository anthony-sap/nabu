/**
 * Plan Upgrade Hook
 * 
 * Client-side hook for upgrading user plans.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlanCode } from "@/lib/entitlements/types";

interface UpgradeOptions {
  currentPlan: PlanCode;
  availableUpgrades: PlanCode[];
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface UpgradeResult {
  previousPlan: PlanCode;
  newPlan: PlanCode;
  workspace?: {
    id: string;
    name: string;
  };
}

interface UpgradeRequest {
  targetPlan: "personal" | "teams";
  workspaceName?: string;
}

/**
 * Fetch available upgrade options for current user
 */
export function useUpgradeOptions() {
  return useQuery<UpgradeOptions>({
    queryKey: ["upgrade-options"],
    queryFn: async () => {
      const response = await fetch("/api/user/upgrade");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch upgrade options");
      }
      const result = await response.json();
      return result.data;
    },
  });
}

/**
 * Perform plan upgrade
 */
export function usePlanUpgrade() {
  const queryClient = useQueryClient();

  return useMutation<UpgradeResult, Error, UpgradeRequest>({
    mutationFn: async (request) => {
      const response = await fetch("/api/user/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upgrade plan");
      }

      return result.data;
    },
    onSuccess: () => {
      // Invalidate all entitlement-related queries
      queryClient.invalidateQueries({ queryKey: ["user-entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["upgrade-options"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}



