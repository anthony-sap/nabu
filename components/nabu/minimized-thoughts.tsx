"use client";

import { Button } from "@/components/ui/button";
import { Lightbulb, Maximize2, X } from "lucide-react";
import { useQuickThought, ThoughtDraft } from "./quick-thought-context";

/**
 * Props for MinimizedThoughts component
 */
interface MinimizedThoughtsProps {
  drafts: ThoughtDraft[];
}

/**
 * Displays all minimized thought drafts as a stack at the bottom of the screen
 */
export function MinimizedThoughts({ drafts }: MinimizedThoughtsProps) {
  const { openDraft, deleteDraft } = useQuickThought();

  if (drafts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 max-w-xs">
      {drafts.map((draft, index) => {
        const previewText = draft.title || draft.content.slice(0, 30) || "Quick Thought";
        const shouldTruncate = (draft.title || draft.content).length > 30;

        return (
          <div
            key={draft.id}
            className="animate-in slide-in-from-bottom-5"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="bg-card border border-primary/40 rounded-lg shadow-lg shadow-primary/10 p-3 flex items-center gap-2 group hover:border-primary/60 transition-all">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openDraft(draft.id)}
                className="flex-1 justify-start gap-2 h-auto py-2 px-2 hover:bg-primary/5"
              >
                <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {previewText}
                  {shouldTruncate && "..."}
                </span>
              </Button>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openDraft(draft.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Restore"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteDraft(draft.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

