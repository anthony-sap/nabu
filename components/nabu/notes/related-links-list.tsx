"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Folder, Lightbulb, ChevronDown, ChevronRight, Link2, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MentionItem, LinkItem } from "./lexical-editor";

/**
 * Props for RelatedLinksList component
 */
interface RelatedLinksListProps {
  links: LinkItem[];  // Database links
  onDeleteLink: (noteId: string) => void;
  onAddLink: () => void;
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
 * Component to display database-linked notes with add/delete functionality
 * Auto-syncs with @mentions in editor content
 */
export function RelatedLinksList({ links, onDeleteLink, onAddLink, className }: RelatedLinksListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();

  /**
   * Handle click on link - navigate to note
   */
  const handleLinkClick = (link: LinkItem) => {
    router.push(`/notes?noteId=${link.toNoteId}`);
  };

  /**
   * Handle delete link - stop propagation to prevent navigation
   */
  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onDeleteLink(noteId);
  };

  return (
    <div className={cn("border-t border-border/50 pt-3", className)}>
      {/* Header with collapse toggle and count */}
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
          <span className="text-sm font-medium text-foreground">Linked Notes</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {links.length}
          </Badge>
        </div>
      </Button>

      {/* Links list */}
      {isExpanded && (
        <div className="space-y-2">
          {/* Add link button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddLink}
            className="w-full justify-start gap-2 h-auto py-2 border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">Add Link</span>
          </Button>

          {/* Link items */}
          {links.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              No linked notes yet. Use @mention in the editor or click "Add Link" above.
            </div>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <button
                  onClick={() => handleLinkClick(link)}
                  className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {link.toNoteTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Note
                    </div>
                  </div>
                  <Link2 className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(e, link.toNoteId)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Remove link"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}


