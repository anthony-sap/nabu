/**
 * Search State Storage Utility
 * 
 * Manages persistence of search state to localStorage:
 * - Search query
 * - Search results
 * - Active filters
 * 
 * Preserves search context between dialog open/close
 */

import { SearchResult, SearchFilters } from "./types-search";

/**
 * Complete search state
 */
export interface SearchState {
  query: string;
  results: SearchResult[];
  filters: SearchFilters;
  timestamp: string; // When the search was performed
  version: number; // Schema version
}

const STORAGE_VERSION = 1;
const STORAGE_KEY_PREFIX = "nabu-search-state";

/**
 * Search state storage utility functions
 */
export const SearchStateStorage = {
  /**
   * Get localStorage key for search state
   * Can be scoped per user if userId provided
   */
  getKey: (userId?: string): string => {
    return userId ? `${STORAGE_KEY_PREFIX}-${userId}` : STORAGE_KEY_PREFIX;
  },

  /**
   * Save search state to localStorage
   */
  save: (state: Omit<SearchState, "timestamp" | "version">, userId?: string): void => {
    try {
      const key = SearchStateStorage.getKey(userId);
      const stateToSave: SearchState = {
        ...state,
        timestamp: new Date().toISOString(),
        version: STORAGE_VERSION,
      };
      localStorage.setItem(key, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save search state to localStorage:", error);
      // Handle quota exceeded errors gracefully
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, clearing search state");
        SearchStateStorage.clear(userId);
      }
    }
  },

  /**
   * Load search state from localStorage
   */
  load: (userId?: string): SearchState | null => {
    try {
      const key = SearchStateStorage.getKey(userId);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;

      const state = JSON.parse(stored) as SearchState;

      // Validate version
      if (state.version !== STORAGE_VERSION) {
        console.warn("Search state version mismatch, clearing old data");
        SearchStateStorage.clear(userId);
        return null;
      }

      return state;
    } catch (error) {
      console.error("Failed to load search state from localStorage:", error);
      return null;
    }
  },

  /**
   * Clear search state from localStorage
   */
  clear: (userId?: string): void => {
    try {
      const key = SearchStateStorage.getKey(userId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to clear search state:", error);
    }
  },
};

