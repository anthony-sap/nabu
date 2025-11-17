"use client";

import { Badge } from "@/components/ui/badge";
import { X, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  id: string;
  name: string;
  color?: string | null;
  source?: "USER_ADDED" | "AI_SUGGESTED";
  confidence?: number | null;
  onRemove?: (tagId: string) => void;
  removable?: boolean;
  className?: string;
}

export function TagBadge({
  id,
  name,
  color,
  source = "USER_ADDED",
  confidence,
  onRemove,
  removable = true,
  className,
}: TagBadgeProps) {
  const isAISuggested = source === "AI_SUGGESTED";

  const badgeStyle = color
    ? {
        backgroundColor: `${color}20`,
        borderColor: color,
        color,
      }
    : {};

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "group relative gap-1.5 pr-1 pl-2 py-1 text-xs border-dashed bg-primary/5",
              className
            )}
            style={badgeStyle}
          >
            {isAISuggested && (
              <Sparkles className="h-3 w-3 text-primary" />
            )}
            <span>{name}</span>
            {removable && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(id);
                }}
                className="ml-1 rounded-sm opacity-50 group-hover:opacity-100 hover:bg-destructive/20 transition-all p-0.5 cursor-pointer"
                aria-label={`Remove ${name} tag`}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isAISuggested ? (
              <>
                <span className="font-semibold">Suggested by AI</span>
                {confidence && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({Math.round(confidence * 100)}% confidence)
                  </span>
                )}
              </>
            ) : (
              <span className="font-semibold">Added by you</span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


