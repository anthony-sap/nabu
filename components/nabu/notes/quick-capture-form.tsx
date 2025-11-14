"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { LexicalEditor } from "./lexical-editor";
import { SmartInputSuggestion } from "./smart-input-suggestion";
import { analyzeContentIntent, shouldShowSuggestion, ContentClassification } from "@/lib/ai/content-classifier";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Form component for quickly capturing new thoughts
 * 
 * Features:
 * - Smart intent detection (Thought vs Note)
 * - Real-time content analysis
 * - Suggestion banner when confidence is high
 * - Database-backed storage via API
 * - Keyboard shortcuts for improved UX:
 *   - Enter in title field moves focus to content
 *   - Cmd/Ctrl + Enter in content saves the thought
 */
export function QuickCaptureForm() {
  const router = useRouter();
  const [newThought, setNewThought] = useState({ 
    title: "", 
    content: "",
    editorState: "" 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [classification, setClassification] = useState<ContentClassification | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [wasPasted, setWasPasted] = useState(false);
  const [userOverrideType, setUserOverrideType] = useState<'thought' | 'note' | null>(null);

  /**
   * Analyze content in real-time with debouncing
   */
  useEffect(() => {
    // Don't analyze empty content
    if (!newThought.content.trim() && !newThought.title.trim()) {
      setClassification(null);
      setShowSuggestion(false);
      return;
    }

    // Debounce analysis by 500ms
    const timer = setTimeout(() => {
      const result = analyzeContentIntent(
        newThought.content,
        newThought.title,
        wasPasted
      );
      setClassification(result);
      setShowSuggestion(shouldShowSuggestion(result));
      
      // Reset paste flag after analysis
      if (wasPasted) {
        setWasPasted(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newThought.content, newThought.title, wasPasted]);

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
      
      // Refresh the page to show new thought
      router.refresh();
    } catch (error) {
      console.error("Failed to save thought:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save thought"
      );
    } finally {
      setIsSaving(false);
    }
  }, [newThought, router]);

  /**
   * Handles creating as a Note (alternative path)
   */
  const handleCreateAsNote = useCallback(async () => {
    if (!newThought.content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        title: newThought.title.trim() || "Untitled",
        content: newThought.content.trim(),
        contentState: newThought.editorState || undefined,
      };

      const response = await fetch("/api/nabu/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to create note");
      }

      toast.success("Note created!");
      
      // Reset form
      setNewThought({ title: "", content: "", editorState: "" });
      setClassification(null);
      setShowSuggestion(false);
      setUserOverrideType(null);
      
      // Navigate to the new note
      if (result.data?.note?.id) {
        router.push(`/notes?noteId=${result.data.note.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create note"
      );
    } finally {
      setIsSaving(false);
    }
  }, [newThought, router]);

  /**
   * Handles the main save action (respects user override or suggestion)
   */
  const handleSave = () => {
    if (!newThought.title.trim() && !newThought.content.trim()) {
      return;
    }

    // If user explicitly overrode, use that
    if (userOverrideType === 'note') {
      handleCreateAsNote();
    } else if (userOverrideType === 'thought') {
      handleSaveAsThought();
    }
    // If showing suggestion, use the suggested type
    else if (classification && showSuggestion) {
      if (classification.type === 'note') {
        handleCreateAsNote();
      } else {
        handleSaveAsThought();
      }
    }
    // Default: save as thought (low friction)
    else {
      handleSaveAsThought();
    }
  };

  /**
   * Detect paste events
   */
  const handlePaste = () => {
    setWasPasted(true);
  };

  return (
    <div className="relative space-y-4 p-6 rounded-xl bg-background/60 border border-border/40 shadow-xl shadow-primary/5 backdrop-blur-md overflow-hidden">
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
      <div className="relative space-y-4">
        <div className="space-y-3">
          {/* Title input field - larger and more prominent */}
          <input
            type="text"
            placeholder="Thought title..."
            value={newThought.title}
            onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
            disabled={isSaving}
            className="w-full px-4 py-2.5 bg-background/60 border border-border/40 rounded-lg text-base font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('thought-content')?.focus();
              }
            }}
          />
          
          {/* Content editor */}
          <div onPaste={handlePaste}>
            <LexicalEditor
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
            />
          </div>

          {/* Smart suggestion banner */}
          {classification && showSuggestion && !userOverrideType && (
            <SmartInputSuggestion
              classification={classification}
              onConfirm={() => {
                setUserOverrideType(classification.type);
                setShowSuggestion(false);
              }}
              onOverride={() => {
                setUserOverrideType(classification.type === 'note' ? 'thought' : 'note');
                setShowSuggestion(false);
              }}
              onDismiss={() => {
                setShowSuggestion(false);
              }}
            />
          )}
        </div>
        
        {/* Action bar with keyboard shortcut hint and save button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted/60 rounded text-[10px] border border-border/30 backdrop-blur">⌘</kbd>
            <kbd className="px-2 py-1 bg-muted/60 rounded text-[10px] border border-border/30 backdrop-blur ml-1">Enter</kbd>
            <span className="ml-2">to save</span>
          </p>
          <div className="flex items-center gap-2">
            {userOverrideType && (
              <span className="text-xs text-muted-foreground">
                Will create as {userOverrideType === 'note' ? 'Note' : 'Thought'}
              </span>
            )}
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={(!newThought.title.trim() && !newThought.content.trim()) || isSaving}
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
    </div>
  );
}
