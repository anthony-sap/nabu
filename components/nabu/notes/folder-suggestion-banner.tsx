"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Folder, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Folder suggestion data structure
 */
interface FolderSuggestion {
  type: 'existing' | 'new';
  suggestions: Array<{
    folderId?: string;
    folderName: string;
    confidence: number;
    reason: string;
  }>;
  similarNotes?: Array<{
    id: string;
    title: string;
    folderId: string | null;
    folderName: string | null;
    similarity: number;
  }>;
}

/**
 * Props for FolderSuggestionBanner component
 */
interface FolderSuggestionBannerProps {
  noteId: string;
  suggestion: FolderSuggestion;
  onAccept: (folderId?: string, newFolderName?: string) => Promise<void>;
  onDismiss: () => void;
  className?: string;
}

/**
 * Folder Suggestion Banner Component
 * 
 * Displays AI-powered folder suggestions after a note is created
 * Shows either:
 * - Existing folder suggestions (if good match found)
 * - New folder name suggestion (if no good match)
 * 
 * Features:
 * - One-click accept to move note
 * - Create new folder option
 * - Shows confidence and reasoning
 * - Dismissable
 */
export function FolderSuggestionBanner({
  noteId,
  suggestion,
  onAccept,
  onDismiss,
  className
}: FolderSuggestionBannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const topSuggestion = suggestion.suggestions[0];
  const isNewFolder = suggestion.type === 'new';

  /**
   * Handle accepting a suggestion
   */
  const handleAccept = async (suggestionIndex: number = 0) => {
    const selectedSuggestion = suggestion.suggestions[suggestionIndex];
    setIsProcessing(true);

    try {
      if (isNewFolder) {
        // Create new folder and move note
        await onAccept(undefined, selectedSuggestion.folderName);
      } else {
        // Move to existing folder
        await onAccept(selectedSuggestion.folderId);
      }
    } catch (error) {
      console.error("Failed to apply folder suggestion:", error);
      toast.error("Failed to apply suggestion");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300",
        className
      )}
    >
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
      
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  {isNewFolder ? "Create a new folder?" : "Move to folder?"}
                </h3>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  AI Suggestion
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {topSuggestion.reason}
              </p>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              {suggestion.suggestions.slice(0, 3).map((sug, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedIndex(index);
                    handleAccept(index);
                  }}
                  disabled={isProcessing}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-lg border transition-all duration-200",
                    selectedIndex === index && isProcessing
                      ? "bg-primary/20 border-primary"
                      : "bg-background/60 border-border/40 hover:bg-background hover:border-primary/50",
                    isProcessing && selectedIndex !== index && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isNewFolder ? (
                      <FolderPlus className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-sm text-foreground truncate">
                        {sug.folderName}
                      </span>
                      {suggestion.suggestions.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {sug.confidence}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isProcessing && selectedIndex === index ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <span className="text-xs text-primary font-medium flex-shrink-0">
                      {isNewFolder ? "Create & Move" : "Move"}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Similar notes context (if available) */}
            {suggestion.similarNotes && suggestion.similarNotes.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">
                  Based on {suggestion.similarNotes.length} similar note{suggestion.similarNotes.length > 1 ? 's' : ''}
                </summary>
                <div className="mt-2 space-y-1 pl-4">
                  {suggestion.similarNotes.slice(0, 3).map((note) => (
                    <div key={note.id} className="flex items-center gap-2">
                      <span className="truncate">{note.title}</span>
                      {note.folderName && (
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {note.folderName}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Dismiss button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onDismiss}
            disabled={isProcessing}
            className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
export function FolderSuggestionBannerCompact({
  noteId,
  suggestion,
  onAccept,
  onDismiss,
  className
}: FolderSuggestionBannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const topSuggestion = suggestion.suggestions[0];
  const isNewFolder = suggestion.type === 'new';

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      if (isNewFolder) {
        await onAccept(undefined, topSuggestion.folderName);
      } else {
        await onAccept(topSuggestion.folderId);
      }
    } catch (error) {
      console.error("Failed to apply folder suggestion:", error);
      toast.error("Failed to apply suggestion");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isNewFolder ? (
          <FolderPlus className="h-4 w-4 text-primary flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-primary flex-shrink-0" />
        )}
        <span className="font-medium text-foreground truncate">
          {isNewFolder ? "Create folder:" : "Move to:"} {topSuggestion.folderName}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAccept}
          disabled={isProcessing}
          className="h-7 px-3 text-xs font-medium text-primary hover:bg-primary/10"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Processing...
            </>
          ) : (
            "Accept"
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          disabled={isProcessing}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

