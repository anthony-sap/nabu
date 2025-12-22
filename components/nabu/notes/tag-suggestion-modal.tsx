"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TagSuggestion {
  name: string;
  confidence?: number;
}

interface TagSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  suggestions: TagSuggestion[];
  onAccept: (selectedTags: string[]) => Promise<void>;
  onReject: () => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function TagSuggestionModal({
  open,
  onOpenChange,
  jobId,
  suggestions,
  onAccept,
  onReject,
  onDismiss,
}: TagSuggestionModalProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(suggestions.map((s) => s.name))
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleTag = (tagName: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagName)) {
      newSelected.delete(tagName);
    } else {
      newSelected.add(tagName);
    }
    setSelectedTags(newSelected);
  };

  const handleAcceptAll = async () => {
    if (selectedTags.size === 0) {
      toast.error("Please select at least one tag");
      return;
    }

    setIsProcessing(true);
    try {
      await onAccept(Array.from(selectedTags));
      toast.success(`${selectedTags.size} tag(s) added successfully`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error accepting tags:", error);
      toast.error("Failed to add tags");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    setIsProcessing(true);
    try {
      await onReject();
      toast.info("Tag suggestions rejected");
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting tags:", error);
      toast.error("Failed to reject tags");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    setIsProcessing(true);
    try {
      await onDismiss();
      toast.info("Tag suggestions dismissed");
      onOpenChange(false);
    } catch (error) {
      console.error("Error dismissing tags:", error);
      toast.error("Failed to dismiss tags");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Suggested Tags
          </DialogTitle>
          <DialogDescription>
            AI has suggested the following tags for this content. Select the
            ones you want to add.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {suggestions.map((suggestion) => {
            const isSelected = selectedTags.has(suggestion.name);
            return (
              <button
                key={suggestion.name}
                onClick={() => toggleTag(suggestion.name)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className="gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {suggestion.name}
                  </Badge>
                  {suggestion.confidence && suggestion.confidence > 0.7 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={isProcessing}
          >
            Dismiss
          </Button>
          <Button
            variant="outline"
            onClick={handleRejectAll}
            disabled={isProcessing}
          >
            Reject All
          </Button>
          <Button
            onClick={handleAcceptAll}
            disabled={isProcessing || selectedTags.size === 0}
          >
            Add Selected ({selectedTags.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


