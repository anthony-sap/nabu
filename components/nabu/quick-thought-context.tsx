"use client";

import { createContext, useContext, useState, ReactNode } from "react";

/**
 * Individual thought draft state
 */
export interface ThoughtDraft {
  id: string;
  title: string;
  content: string;
  selectedFolder: string;
  selectedTags: string[];
  state: "open" | "minimized";
}

/**
 * Context value type
 */
interface QuickThoughtContextValue {
  drafts: ThoughtDraft[];
  createDraft: () => void;
  updateDraft: (id: string, updates: Partial<ThoughtDraft>) => void;
  deleteDraft: (id: string) => void;
  openDraft: (id: string) => void;
  minimizeDraft: (id: string) => void;
  getOpenDraft: () => ThoughtDraft | undefined;
}

const QuickThoughtContext = createContext<QuickThoughtContextValue | undefined>(undefined);

/**
 * Provider component for managing multiple thought drafts
 */
export function QuickThoughtProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<ThoughtDraft[]>([]);

  /**
   * Create a new draft and open it
   */
  const createDraft = () => {
    const newDraft: ThoughtDraft = {
      id: `draft-${Date.now()}`,
      title: "",
      content: "",
      selectedFolder: "Inbox",
      selectedTags: [],
      state: "open",
    };

    // Close any currently open draft
    setDrafts(prev => [
      ...prev.map(d => ({ ...d, state: "minimized" as const })),
      newDraft
    ]);
  };

  /**
   * Update a draft's content or state
   */
  const updateDraft = (id: string, updates: Partial<ThoughtDraft>) => {
    setDrafts(prev => prev.map(draft => 
      draft.id === id ? { ...draft, ...updates } : draft
    ));
  };

  /**
   * Delete a draft completely
   */
  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== id));
  };

  /**
   * Open a specific draft (minimizes others)
   */
  const openDraft = (id: string) => {
    setDrafts(prev => prev.map(draft => ({
      ...draft,
      state: draft.id === id ? "open" : "minimized"
    })));
  };

  /**
   * Minimize a specific draft
   */
  const minimizeDraft = (id: string) => {
    setDrafts(prev => prev.map(draft =>
      draft.id === id ? { ...draft, state: "minimized" as const } : draft
    ));
  };

  /**
   * Get the currently open draft
   */
  const getOpenDraft = () => {
    return drafts.find(d => d.state === "open");
  };

  return (
    <QuickThoughtContext.Provider
      value={{
        drafts,
        createDraft,
        updateDraft,
        deleteDraft,
        openDraft,
        minimizeDraft,
        getOpenDraft,
      }}
    >
      {children}
    </QuickThoughtContext.Provider>
  );
}

/**
 * Hook to use the quick thought context
 */
export function useQuickThought() {
  const context = useContext(QuickThoughtContext);
  if (!context) {
    throw new Error("useQuickThought must be used within QuickThoughtProvider");
  }
  return context;
}

