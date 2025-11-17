/**
 * Folder State Storage Utility
 * 
 * Manages persistence of folder navigation state to localStorage:
 * - Expanded folder IDs
 * - Cached notes for folders with TTL
 * 
 * Scoped per user to support multi-user browsers
 */

import { NoteItem } from "./types";

/**
 * Cache entry for folder notes with expiration
 */
interface FolderNotesCache {
  notes: NoteItem[];
  timestamp: string;
  expiresAt: string;
}

/**
 * Complete folder navigation state
 */
export interface FolderNavigationState {
  expandedFolderIds: string[];
  loadedNotesCache: Record<string, FolderNotesCache>;
  version: number; // Schema version for future migrations
}

const STORAGE_VERSION = 1;
const DEFAULT_TTL_MINUTES = 30;

/**
 * Folder state storage utility functions
 */
export const FolderStateStorage = {
  /**
   * Get localStorage key for user's folder state
   */
  getKey: (userId: string): string => {
    return `nabu-folder-nav-${userId}`;
  },

  /**
   * Save complete folder navigation state
   */
  save: (userId: string, state: FolderNavigationState): void => {
    try {
      const key = FolderStateStorage.getKey(userId);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save folder state to localStorage:", error);
      // Handle quota exceeded errors gracefully
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, clearing old folder state");
        FolderStateStorage.clear(userId);
      }
    }
  },

  /**
   * Load folder navigation state from localStorage
   */
  load: (userId: string): FolderNavigationState | null => {
    try {
      const key = FolderStateStorage.getKey(userId);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;

      const state = JSON.parse(stored) as FolderNavigationState;

      // Validate version
      if (state.version !== STORAGE_VERSION) {
        console.warn("Folder state version mismatch, clearing old data");
        FolderStateStorage.clear(userId);
        return null;
      }

      return state;
    } catch (error) {
      console.error("Failed to load folder state from localStorage:", error);
      return null;
    }
  },

  /**
   * Save only the expanded folder IDs
   */
  saveExpandedFolders: (userId: string, folderIds: string[]): void => {
    try {
      const currentState = FolderStateStorage.load(userId) || {
        expandedFolderIds: [],
        loadedNotesCache: {},
        version: STORAGE_VERSION,
      };

      currentState.expandedFolderIds = folderIds;
      FolderStateStorage.save(userId, currentState);
    } catch (error) {
      console.error("Failed to save expanded folders:", error);
    }
  },

  /**
   * Cache notes for a specific folder with expiration
   */
  saveFolderNotes: (
    userId: string,
    folderId: string,
    notes: NoteItem[],
    ttlMinutes: number = DEFAULT_TTL_MINUTES
  ): void => {
    try {
      const currentState = FolderStateStorage.load(userId) || {
        expandedFolderIds: [],
        loadedNotesCache: {},
        version: STORAGE_VERSION,
      };

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

      currentState.loadedNotesCache[folderId] = {
        notes,
        timestamp: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      FolderStateStorage.save(userId, currentState);
    } catch (error) {
      console.error("Failed to save folder notes cache:", error);
    }
  },

  /**
   * Get cached notes for a folder if not expired
   */
  getFolderNotes: (userId: string, folderId: string): NoteItem[] | null => {
    try {
      const state = FolderStateStorage.load(userId);
      if (!state) return null;

      const cached = state.loadedNotesCache[folderId];
      if (!cached) return null;

      // Check if cache is expired
      const now = new Date();
      const expiresAt = new Date(cached.expiresAt);

      if (now > expiresAt) {
        console.log(`Cache expired for folder ${folderId}`);
        return null;
      }

      return cached.notes;
    } catch (error) {
      console.error("Failed to get cached folder notes:", error);
      return null;
    }
  },

  /**
   * Clear all folder state for a user
   */
  clear: (userId: string): void => {
    try {
      const key = FolderStateStorage.getKey(userId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to clear folder state:", error);
    }
  },

  /**
   * Remove expired entries from cache
   */
  cleanupExpired: (userId: string): void => {
    try {
      const state = FolderStateStorage.load(userId);
      if (!state) return;

      const now = new Date();
      const cleanedCache: Record<string, FolderNotesCache> = {};

      Object.entries(state.loadedNotesCache).forEach(([folderId, cache]) => {
        const expiresAt = new Date(cache.expiresAt);
        if (now <= expiresAt) {
          cleanedCache[folderId] = cache;
        }
      });

      state.loadedNotesCache = cleanedCache;
      FolderStateStorage.save(userId, state);
    } catch (error) {
      console.error("Failed to cleanup expired cache:", error);
    }
  },
};

