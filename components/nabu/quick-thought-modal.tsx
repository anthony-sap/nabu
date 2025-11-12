"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Minimize2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickThought, ThoughtDraft } from "./quick-thought-context";
import { LexicalEditor } from "./notes/lexical-editor";
import { toast } from "sonner";

/**
 * Props for the QuickThoughtModal component
 */
interface QuickThoughtModalProps {
  draft: ThoughtDraft;
}

/**
 * Available folders for categorizing thoughts
 */
const folders = ["Inbox", "Work", "Personal", "Projects", "Archive"];

/**
 * Available tags for thoughts
 */
const availableTags = ["idea", "todo", "meeting", "research", "planning", "personal"];

/**
 * Quick Thought Modal Component
 * Allows users to quickly capture thoughts with folder and tag organization
 * 
 * Features:
 * - Optional title field
 * - Required content field
 * - Folder selection
 * - Tag selection (multiple)
 * - Keyboard shortcuts (Cmd+S to save, Esc to close)
 */
export function QuickThoughtModal({ draft }: QuickThoughtModalProps) {
  const { updateDraft, deleteDraft, minimizeDraft } = useQuickThought();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle keyboard shortcuts within the modal
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (draft.state !== "open") return;
      
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Esc to minimize (not close)
      if (e.key === 'Escape') {
        e.preventDefault();
        minimizeDraft(draft.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draft.state, draft.content, draft.id, minimizeDraft]);

  /**
   * Toggle tag selection
   */
  const toggleTag = (tag: string) => {
    const newTags = draft.selectedTags.includes(tag)
      ? draft.selectedTags.filter(t => t !== tag)
      : [...draft.selectedTags, tag];
    updateDraft(draft.id, { selectedTags: newTags });
  };

  /**
   * Handle saving the thought
   */
  const handleSave = async () => {
    if (!draft.content.trim() || isSaving) return;

    setIsSaving(true);

    try {
      // Prepare API payload
      const payload = {
        content: draft.content.trim(),
        source: "WEB" as const,
        suggestedTags: draft.selectedTags,
        meta: {
          title: draft.title.trim() || "Untitled",
          folder: draft.selectedFolder,
          contentState: draft.editorState || undefined, // Store Lexical state in meta
        },
      };

      // Call API to create thought
      const response = await fetch("/api/nabu/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to save thought");
      }

      // Success - close the modal
      toast.success("Thought saved successfully!");
      deleteDraft(draft.id);
    } catch (error) {
      console.error("Failed to save thought:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save thought. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={draft.state === "open"} onOpenChange={(isOpen) => {
      if (!isOpen) {
        minimizeDraft(draft.id);
      }
    }}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-6xl bg-card border-border overflow-visible" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Lightbulb className="h-5 w-5 text-primary" />
                Quick Thought
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => minimizeDraft(draft.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDraft(draft.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Capture your ideas quickly. 
              <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border">⌘+K</kbd> to open • 
              <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border">⌘+S</kbd> to save • 
              <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border">Esc</kbd> to minimize
            </p>
          </DialogHeader>

        <div className="space-y-4 py-4 overflow-visible">
          {/* Title field */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Title (optional)
            </label>
            <input
              type="text"
              placeholder="Give your thought a title..."
              value={draft.title}
              onChange={(e) => updateDraft(draft.id, { title: e.target.value })}
              className="w-full px-3 py-2 bg-muted/30 border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
            />
          </div>

          {/* Content field */}
          <div className="overflow-visible">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Content <span className="text-destructive">*</span>
            </label>
            <LexicalEditor
              value={draft.content}
              editorState={draft.editorState}
              onChange={(plainText, serializedState) => 
                updateDraft(draft.id, { 
                  content: plainText, 
                  editorState: serializedState 
                })
              }
              placeholder="What's on your mind?"
              autoFocus
              showToolbar
              className="min-h-[400px]"
            />
          </div>

          {/* Folder selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Folder
            </label>
            <div className="flex flex-wrap gap-2">
              {folders.map((folder) => (
                <Button
                  key={folder}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateDraft(draft.id, { selectedFolder: folder })}
                  className={cn(
                    "rounded-full transition-colors",
                    draft.selectedFolder === folder
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  {folder}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    "cursor-pointer transition-colors",
                    draft.selectedTags.includes(tag)
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={() => deleteDraft(draft.id)}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={!draft.content.trim() || isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Save Thought
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

