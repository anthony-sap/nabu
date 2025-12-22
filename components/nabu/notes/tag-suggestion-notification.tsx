"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TagSuggestionNotificationProps {
  suggestedTagsCount: number;
  onOpenModal: () => void;
  onDismiss?: () => Promise<void>;
  className?: string;
}

export function TagSuggestionNotification({
  suggestedTagsCount,
  onOpenModal,
  onDismiss,
  className,
}: TagSuggestionNotificationProps) {
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (dismissed || suggestedTagsCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 animate-pulse",
        className
      )}
    >
      <Badge
        variant="secondary"
        className="gap-1.5 cursor-pointer hover:bg-primary/20 transition-colors"
        onClick={onOpenModal}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        <span>
          Tags suggested ({suggestedTagsCount})
        </span>
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-6 w-6 p-0"
        onClick={async () => {
          if (onDismiss) {
            await onDismiss();
          }
          setDismissed(true);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}


