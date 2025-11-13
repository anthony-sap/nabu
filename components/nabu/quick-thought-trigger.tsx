"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { useQuickThought } from "./quick-thought-context";

/**
 * Quick Thought Trigger Component
 * Displays a button in the header that opens the quick thought modal
 * Includes keyboard shortcut (Cmd/Ctrl + K)
 */
export function QuickThoughtTrigger() {
  const { createDraft } = useQuickThought();

  /**
   * Handle global keyboard shortcut (Cmd/Ctrl + K)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open quick thought
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        createDraft();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createDraft]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={createDraft}
      className="w-full justify-start gap-2 border-primary/40 text-muted-foreground hover:text-foreground hover:bg-primary/5 hover:border-primary/60 transition-all duration-200"
    >
      <Lightbulb className="h-4 w-4 text-primary" />
      <span className="flex-1 text-left">Quick thought...</span>
      <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}

