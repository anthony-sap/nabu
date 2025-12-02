"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { LexicalEditor } from "./lexical-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Props for QuickCaptureForm
 */
interface QuickCaptureFormProps {
  onSaved?: () => void; // Callback when thought is successfully saved
}

/**
 * Form component for quickly capturing new thoughts
 * 
 * Features:
 * - Simple, minimal UI for quick thought capture
 * - Database-backed storage via API
 * - Keyboard shortcuts: Cmd/Ctrl + Enter to save
 */
export function QuickCaptureForm({ onSaved }: QuickCaptureFormProps = {}) {
  const router = useRouter();
  const [newThought, setNewThought] = useState({ 
    title: "", 
    content: "",
    editorState: "" 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // Key to force editor remount

  /**
   * Handles saving as a Thought (default behavior)
   */
  const handleSaveAsThought = useCallback(async () => {
    if (!newThought.content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        content: newThought.content.trim(),
        source: "WEB" as const,
        suggestedTags: [],
        meta: {
          title: newThought.title.trim() || "Untitled",
          contentState: newThought.editorState || undefined,
        },
      };

      const response = await fetch("/api/nabu/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to save thought");
      }

      toast.success("Thought saved!");
      
      // Reset form
      setNewThought({ title: "", content: "", editorState: "" });
      setClassification(null);
      setShowSuggestion(false);
      setUserOverrideType(null);
      
      // Force editor to remount by changing key
      setEditorKey(prev => prev + 1);
      
      // Call the onSaved callback to refresh the feed
      if (onSaved) {
        onSaved();
      } else {
        // Fallback to router refresh if no callback provided
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save thought:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save thought"
      );
    } finally {
      setIsSaving(false);
    }
  }, [newThought, router, onSaved]);

  return (
    <div className="relative space-y-4 p-6 rounded-xl bg-background/60 border border-border/40 shadow-xl shadow-primary/5 backdrop-blur-md overflow-hidden">
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
      <div className="relative space-y-4">
        <div className="space-y-3">
          {/* Title input field - hidden for thoughts (kept in DB for future use) */}
          <input
            type="text"
            placeholder="Thought title..."
            value={newThought.title}
            onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
            disabled={isSaving}
            className="hidden"
          />
          
          {/* Content editor - simple for quick thought capture */}
          <div>
            <LexicalEditor
              key={editorKey}
              value={newThought.content}
              editorState={newThought.editorState}
              onChange={(plainText, serializedState) => 
                setNewThought({ 
                  ...newThought, 
                  content: plainText,
                  editorState: serializedState 
                })
              }
              placeholder="What's on your mind?"
              className="min-h-[100px]"
              disabled={isSaving}
              showToolbar={false}
            />
          </div>
        </div>
        
        {/* Action bar with keyboard shortcut hint and save button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted/60 rounded text-[10px] border border-border/30 backdrop-blur">⌘</kbd>
            <kbd className="px-2 py-1 bg-muted/60 rounded text-[10px] border border-border/30 backdrop-blur ml-1">Enter</kbd>
            <span className="ml-2">to save</span>
          </p>
          <Button 
            size="sm" 
            onClick={handleSaveAsThought}
            disabled={!newThought.content.trim() || isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary/25 transition-all duration-200"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Capture
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
