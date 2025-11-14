"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Thought data from API (matching the database model)
 */
interface ApiThought {
  id: string;
  content: string;
  source: string;
  state: string;
  suggestedTags: string[];
  meta: {
    title?: string;
    folder?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Props for the ThoughtCard component
 */
interface ThoughtCardProps {
  thought: ApiThought;
  onDeleted?: () => void; // Callback after successful deletion
}

/**
 * Format time ago from timestamp
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Card component for displaying a captured thought in the activity feed
 * 
 * Features:
 * - Hover actions bar with promote, delete
 * - Click to expand (future: show modal)
 * - Shows title, timestamp, content preview, folder, and tags
 */
export function ThoughtCard({ thought, onDeleted }: ThoughtCardProps) {
  const router = useRouter();
  const [isPromoting, setIsPromoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle promoting thought to note
   */
  const handlePromote = async () => {
    setIsPromoting(true);
    
    try {
      const response = await fetch(`/api/nabu/thoughts/${thought.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to promote thought");
      }

      toast.success("Thought promoted to note!");
      
      // Navigate to the new note
      if (result.data?.note?.id) {
        router.push(`/notes?noteId=${result.data.note.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to promote thought:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to promote thought"
      );
    } finally {
      setIsPromoting(false);
    }
  };

  /**
   * Handle deleting thought
   */
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this thought?")) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/nabu/thoughts/${thought.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete thought");
      }

      toast.success("Thought deleted");
      
      // Call callback to refresh the list
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete thought:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete thought"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="relative bg-background/60 border-border/40 hover:border-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/5 backdrop-blur-md overflow-hidden group">
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
      
      <CardContent className="relative pt-6 pb-5 px-6">
        <div className="space-y-4">
          {/* Header: Title, timestamp, and actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-lg text-foreground mb-1.5 truncate">
                {thought.meta?.title || "Untitled Thought"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimeAgo(thought.createdAt)}</span>
              </div>
            </div>

            {/* Action buttons - visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePromote}
                disabled={isPromoting || isDeleting}
                className="h-8 px-3 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                {isPromoting ? (
                  "Promoting..."
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Promote
                  </>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    disabled={isPromoting || isDeleting}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Content preview with line clamping */}
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {thought.content}
          </p>
          
          {/* Metadata: Folder and tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Folder badge */}
            {thought.meta?.folder && (
              <Badge variant="outline" className="text-[11px] font-normal bg-muted/30 text-muted-foreground">
                {thought.meta.folder}
              </Badge>
            )}

            {/* Tags */}
            {thought.suggestedTags && thought.suggestedTags.length > 0 && (
              <>
                {thought.suggestedTags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-[11px] font-normal bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    #{tag}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
