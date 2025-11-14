"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentClassification } from "@/lib/ai/content-classifier";

/**
 * Props for SmartInputSuggestion component
 */
interface SmartInputSuggestionProps {
  /** The classification result from content analysis */
  classification: ContentClassification;
  /** Callback when user confirms the suggestion (create as suggested type) */
  onConfirm: () => void;
  /** Callback when user overrides the suggestion (create as opposite type) */
  onOverride: () => void;
  /** Callback when user dismisses the suggestion */
  onDismiss: () => void;
  /** Optional custom className */
  className?: string;
}

/**
 * Smart Input Suggestion Banner Component
 * 
 * Displays a subtle banner suggesting whether content should be a Thought or Note
 * Appears when classification confidence is high (>70%)
 * 
 * Features:
 * - Color-coded by suggestion type (primary for note, secondary for thought)
 * - Two action buttons: confirm or override
 * - Dismiss button to hide suggestion
 * - Smooth animations
 */
export function SmartInputSuggestion({
  classification,
  onConfirm,
  onOverride,
  onDismiss,
  className
}: SmartInputSuggestionProps) {
  const isNoteSuggestion = classification.type === 'note';
  
  return (
    <div
      className={cn(
        "relative rounded-lg border p-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2",
        isNoteSuggestion
          ? "bg-primary/5 border-primary/30"
          : "bg-secondary/5 border-secondary/30",
        className
      )}
    >
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none rounded-lg" />
      
      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
            isNoteSuggestion
              ? "bg-primary/10 text-primary"
              : "bg-secondary/10 text-secondary"
          )}
        >
          {isNoteSuggestion ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Lightbulb className="h-4 w-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isNoteSuggestion
                ? "This looks like a note"
                : "This looks like a quick thought"}
            </p>
            <p className="text-xs text-muted-foreground">
              {classification.reason} • {classification.confidence}% confident
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onConfirm}
              className={cn(
                "h-7 text-xs font-medium shadow-sm",
                isNoteSuggestion
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
              )}
            >
              {isNoteSuggestion ? (
                <>
                  <FileText className="h-3 w-3 mr-1.5" />
                  Create as Note
                </>
              ) : (
                <>
                  <Lightbulb className="h-3 w-3 mr-1.5" />
                  Keep as Thought
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOverride}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {isNoteSuggestion ? "Keep as Thought" : "Create as Note"}
            </Button>
          </div>
        </div>

        {/* Dismiss button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          className="flex-shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces (e.g., within modals)
 */
export function SmartInputSuggestionCompact({
  classification,
  onConfirm,
  onOverride,
  onDismiss,
  className
}: SmartInputSuggestionProps) {
  const isNoteSuggestion = classification.type === 'note';
  
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-xs transition-all duration-200",
        isNoteSuggestion
          ? "bg-primary/5 border-primary/30 text-primary"
          : "bg-secondary/5 border-secondary/30 text-secondary",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isNoteSuggestion ? (
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <Lightbulb className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span className="font-medium truncate">
          Looks like a {isNoteSuggestion ? 'note' : 'thought'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onConfirm}
          className="h-6 px-2 text-xs font-medium hover:bg-current/10"
        >
          Yes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOverride}
          className="h-6 px-2 text-xs hover:bg-current/10"
        >
          No
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

