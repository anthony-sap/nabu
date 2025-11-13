"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Folder, Lightbulb, ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MentionItem } from "./lexical-editor";

/**
 * Props for RelatedLinksList component
 */
interface RelatedLinksListProps {
  mentions: MentionItem[];
  className?: string;
}

/**
 * Get icon component based on mention type
 */
function getMentionIcon(type: string) {
  switch (type) {
    case "note":
      return FileText;
    case "folder":
      return Folder;
    case "thought":
      return Lightbulb;
    default:
      return FileText;
  }
}

/**
 * Get display label for mention type
 */
function getMentionTypeLabel(type: string): string {
  switch (type) {
    case "note":
      return "Note";
    case "folder":
      return "Folder";
    case "thought":
      return "Thought";
    default:
      return "Item";
  }
}

/**
 * Component to display a list of related links from @mentions
 * Shows all unique mentions in a collapsible section with navigation
 */
export function RelatedLinksList({ mentions, className }: RelatedLinksListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();

  // Don't render if no mentions
  if (!mentions || mentions.length === 0) {
    return null;
  }

  /**
   * Handle click on mention link
   */
  const handleMentionClick = (mention: MentionItem) => {
    switch (mention.type) {
      case "note":
        router.push(`/nabu/notes?noteId=${mention.id}`);
        break;
      case "thought":
        router.push(`/nabu/notes?thoughtId=${mention.id}`);
        break;
      case "folder":
        // For folders, we could navigate to a folder view if implemented
        // For now, just log it
        console.log("Navigate to folder:", mention.id);
        break;
    }
  };

  return (
    <div className={cn("border-t border-border/50 pt-3", className)}>
      {/* Header with collapse toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between hover:bg-muted/50 px-2 py-1 h-auto mb-2"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Related Links</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {mentions.length}
          </Badge>
        </div>
      </Button>

      {/* Mention list */}
      {isExpanded && (
        <div className="space-y-2">
          {mentions.map((mention, index) => {
            const Icon = getMentionIcon(mention.type);
            const typeLabel = getMentionTypeLabel(mention.type);
            
            return (
              <button
                key={`${mention.id}-${index}`}
                onClick={() => handleMentionClick(mention)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-left cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {mention.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {typeLabel}
                  </div>
                </div>
                <Link2 className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

