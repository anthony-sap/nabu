"use client";

import { QuickThoughtModal } from "./quick-thought-modal";
import { MinimizedThoughts } from "./minimized-thoughts";
import { useQuickThought } from "./quick-thought-context";

/**
 * Manager component that renders all Quick Thought modals and minimized indicators
 * Should be placed once in the layout
 */
export function QuickThoughtManager() {
  const { drafts, getOpenDraft } = useQuickThought();
  const openDraft = getOpenDraft();

  return (
    <>
      {/* Render the currently open modal */}
      {openDraft && <QuickThoughtModal draft={openDraft} />}
      
      {/* Render minimized thoughts at the bottom */}
      <MinimizedThoughts drafts={drafts.filter(d => d.state === "minimized")} />
    </>
  );
}

