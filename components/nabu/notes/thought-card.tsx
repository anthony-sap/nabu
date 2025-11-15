"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Trash2, MoreVertical, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PromoteThoughtDialog } from "./promote-thought-dialog";

/**
 * Thought data from API (matching the database model)
 */
interface ApiThought {
  id: string;
  content: string;
  source: string;
  state: string;
  suggestedTags: string[];
  noteId?: string | null;
  note?: {
    id: string;
    title: string;
  } | null;
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
  showCheckbox?: boolean; // Show checkbox for bulk selection
  isSelected?: boolean; // Whether this thought is selected
  onToggleSelection?: (thoughtId: string) => void; // Toggle selection
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
export function ThoughtCard({ 
  thought, 
  onDeleted,
  showCheckbox = false,
  isSelected = false,
  onToggleSelection 
}: ThoughtCardProps) {
  const router = useRouter();
  const [isPromoting, setIsPromoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  
  const isPromoted = thought.state === 'PROMOTED';

  /**
   * Handle promoting thought to note with folder selection
   */
  const handlePromoteWithFolder = async (thoughtIds: string[], folderId: string | null) => {
    setIsPromoting(true);
    
    try {
      const response = await fetch(`/api/nabu/thoughts/${thoughtIds[0]}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to promote thought");
      }

      toast.success("Thought promoted to note!");
      
      // Refresh to show updated thought state
      if (onDeleted) {
        onDeleted();
      }
      
      // Navigate to the new note
      if (result.data?.note?.id) {
        router.push(`/notes?noteId=${result.data.note.id}`);
      }
    } catch (error) {
      console.error("Failed to promote thought:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to promote thought"
      );
      throw error; // Re-throw so dialog can handle it
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
    <>
      <Card 
        className={`relative transition-all duration-200 backdrop-blur-xl overflow-hidden group ${
          isPromoted
            ? "bg-muted/40 border border-border/30 opacity-75"
            : isSelected
            ? "ring-2 ring-primary border-2 border-primary/60 bg-primary/10 shadow-2xl shadow-primary/10"
            : "bg-card/90 border-2 border-border/60 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
        }`}
        onClick={() => {
          if (showCheckbox && onToggleSelection && !isPromoted) {
            onToggleSelection(thought.id);
          }
        }}
      >
        {/* Glassy shine effect - stronger for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] dark:from-white/[0.08] to-transparent pointer-events-none" />
      
      <CardContent className="relative pt-6 pb-5 px-6">
        <div className="space-y-4">
          {/* Header: Title, timestamp, and actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Checkbox in bulk mode */}
              {showCheckbox && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelection?.(thought.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-serif font-semibold text-lg text-foreground truncate">
                    {thought.meta?.title || "Untitled Thought"}
                  </h3>
                  {isPromoted && (
                    <Badge variant="outline" className="text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 flex-shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Promoted
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatTimeAgo(thought.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons - conditional based on promoted state */}
            {!showCheckbox && !isPromoted && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPromoteDialog(true);
                  }}
                  disabled={isPromoting || isDeleting}
                  className="h-8 px-3 text-xs font-medium border-primary/30 text-primary hover:text-primary hover:bg-primary/15 hover:border-primary/50 shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Promote
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      disabled={isPromoting || isDeleting}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* View Note button for promoted thoughts */}
            {!showCheckbox && isPromoted && thought.note && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/notes?noteId=${thought.note.id}`);
                }}
                className="h-8 px-3 text-xs font-medium border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
              >
                View Note
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </div>
          
          {/* Content preview with line clamping */}
          <p className="text-sm text-foreground leading-relaxed line-clamp-3">
            {thought.content}
          </p>
          
          {/* Metadata: Folder and tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Folder badge */}
            {thought.meta?.folder && (
              <Badge variant="outline" className="text-[11px] font-medium bg-muted/50 text-foreground/70 border-border">
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
                    className="text-[11px] font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
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

      {/* Promote dialog */}
      <PromoteThoughtDialog
        open={showPromoteDialog}
        onOpenChange={setShowPromoteDialog}
        thoughtIds={[thought.id]}
        thoughtPreviews={[{
          id: thought.id,
          title: thought.meta?.title || 'Untitled',
          content: thought.content,
        }]}
        onPromote={handlePromoteWithFolder}
      />
    </>
  );
}
