/**
 * Entitlements Hooks
 * 
 * Client-side hooks for accessing user entitlements.
 */

"use client";

import { useState, useEffect } from "react";
import { Entitlements } from "@/lib/entitlements/types";

/**
 * Fetch entitlements from API
 */
async function fetchEntitlements(): Promise<Entitlements> {
  const response = await fetch("/api/user/entitlements");
  
  if (!response.ok) {
    throw new Error("Failed to fetch entitlements");
  }
  
  const data = await response.json();
  return data.entitlements;
}

/**
 * Hook to access current user's entitlements
 */
export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchEntitlements()
      .then((data) => {
        if (mounted) {
          setEntitlements(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    entitlements,
    isLoading,
    error,
  };
}

/**
 * Hook to check if user can access a specific feature
 */
export function useCanAccess(feature: keyof Entitlements) {
  const { entitlements } = useEntitlements();
  
  if (!entitlements) {
    return false;
  }
  
  const value = entitlements[feature];
  return typeof value === 'boolean' ? value : false;
}

/**
 * Hook to get a limit value
 */
export function useLimit(limitType: keyof Entitlements) {
  const { entitlements } = useEntitlements();
  
  if (!entitlements) {
    return null;
  }
  
  return entitlements[limitType];
}

