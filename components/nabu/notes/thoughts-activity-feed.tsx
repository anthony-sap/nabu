"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Lightbulb, MoreVertical, FileText, CheckSquare, Square, Loader2, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickCaptureForm } from "./quick-capture-form";
import { ThoughtCard } from "./thought-card";
import { PromoteThoughtDialog } from "./promote-thought-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Thought data from API
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
 * Thoughts Activity Feed Component
 * Displays recent thoughts from the API with tags
 */
interface ThoughtsActivityFeedProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function ThoughtsActivityFeed({ activeTab, onTabChange }: ThoughtsActivityFeedProps = {}) {
  const [thoughts, setThoughts] = useState<ApiThought[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedThoughtIds, setSelectedThoughtIds] = useState<Set<string>>(new Set());
  const [showBulkPromoteDialog, setShowBulkPromoteDialog] = useState(false);
  const [showPromoted, setShowPromoted] = useState(false);

  /**
   * Load thoughts from API with filter
   */
  useEffect(() => {
    const loadThoughts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/nabu/thoughts?includePromoted=${showPromoted}`);
        
        if (!response.ok) {
          // Read the actual error message from the API response body
          let errorMessage = `Failed to fetch thoughts (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            // Include additional context if available
            if (errorData.message && errorData.error !== errorData.message) {
              errorMessage = `${errorData.error || errorMessage} - ${errorData.message}`;
            }
            // Log detailed error information for debugging
            console.error("Thoughts API error:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData.error,
              message: errorData.message,
              fullResponse: errorData,
            });
          } catch (parseError) {
            // If response is not JSON, try to get status text
            errorMessage = response.statusText || errorMessage;
            console.error("Failed to parse error response:", {
              status: response.status,
              statusText: response.statusText,
              parseError,
            });
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.thoughts)) {
          // Sort by createdAt, newest first (API already sorts, but double-check)
          const sorted = data.data.thoughts.sort((a: ApiThought, b: ApiThought) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setThoughts(sorted);
        } else {
          throw new Error("Invalid response format from server");
        }
      } catch (err) {
        console.error("Failed to load thoughts:", err);
        setError(err instanceof Error ? err.message : "Failed to load thoughts");
      } finally {
        setIsLoading(false);
      }
    };

    loadThoughts();
  }, [showPromoted]); // Reload when filter changes

  const router = useRouter();

  /**
   * Refresh thoughts list (e.g., after deletion)
   */
  const refreshThoughts = () => {
    const loadThoughts = async () => {
      try {
        const response = await fetch(`/api/nabu/thoughts?includePromoted=${showPromoted}`);
        
        if (!response.ok) {
          // Read the actual error message from the API response body
          let errorMessage = `Failed to fetch thoughts (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            // Include additional context if available
            if (errorData.message && errorData.error !== errorData.message) {
              errorMessage = `${errorData.error || errorMessage} - ${errorData.message}`;
            }
            // Log detailed error information for debugging
            console.error("Thoughts API error (refresh):", {
              status: response.status,
              statusText: response.statusText,
              error: errorData.error,
              message: errorData.message,
              fullResponse: errorData,
            });
          } catch (parseError) {
            // If response is not JSON, try to get status text
            errorMessage = response.statusText || errorMessage;
            console.error("Failed to parse error response (refresh):", {
              status: response.status,
              statusText: response.statusText,
              parseError,
            });
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.thoughts)) {
          const sorted = data.data.thoughts.sort((a: ApiThought, b: ApiThought) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setThoughts(sorted);
        } else {
          throw new Error("Invalid response format from server");
        }
      } catch (err) {
        console.error("Failed to refresh thoughts:", err);
        // Set error state so user can see what went wrong
        setError(err instanceof Error ? err.message : "Failed to refresh thoughts");
      }
    };

    loadThoughts();
  };

  /**
   * Handle bulk promotion - merges all selected thoughts into ONE note
   */
  const handleBulkPromoteWithFolder = async (thoughtIds: string[], folderId: string | null) => {
    toast.loading(`Merging ${thoughtIds.length} thoughts into one note...`);

    try {
      // Call bulk promote API which handles merging on the backend
      const response = await fetch('/api/nabu/thoughts/bulk-promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtIds,
          folderId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to merge thoughts');
      }

      toast.dismiss();
      toast.success(result.message || `Merged ${thoughtIds.length} thoughts into one note!`);

      // Reset state
      setBulkMode(false);
      setSelectedThoughtIds(new Set());
      
      // Refresh thoughts list
      refreshThoughts();
      
      // Navigate to the new note
      const newNoteId = result.data?.note?.id;
      if (newNoteId) {
        router.push(`/notes?noteId=${newNoteId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.dismiss();
      console.error("Failed to bulk promote:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to merge thoughts"
      );
      throw error;
    }
  };

  /**
   * Toggle selection of a thought
   */
  const handleToggleSelection = (thoughtId: string) => {
    const newSet = new Set(selectedThoughtIds);
    if (newSet.has(thoughtId)) {
      newSet.delete(thoughtId);
    } else {
      newSet.add(thoughtId);
    }
    setSelectedThoughtIds(newSet);
  };

  /**
   * Select all thoughts
   */
  const handleSelectAll = () => {
    setSelectedThoughtIds(new Set(thoughts.map(t => t.id)));
  };

  /**
   * Deselect all thoughts
   */
  const handleDeselectAll = () => {
    setSelectedThoughtIds(new Set());
  };

  return (
    <div className="h-full flex flex-col">
      {/* Quick capture form - fixed at top */}
      <div className="flex-shrink-0 max-w-4xl mx-auto w-full px-8 pt-6">
        <QuickCaptureForm onSaved={refreshThoughts} />
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 max-w-4xl mx-auto px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-serif font-semibold text-foreground">Thoughts</h2>
              {!bulkMode && (
                <Badge variant="secondary" className="text-xs bg-secondary/15 text-secondary border-secondary/20">
                  {thoughts.length} {thoughts.length === 1 ? "thought" : "thoughts"}
                </Badge>
              )}
              {bulkMode && (
                <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                  {selectedThoughtIds.size} selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Filter toggle - not in bulk mode */}
              {!bulkMode && thoughts.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPromoted(!showPromoted)}
                  className="h-8 px-3 text-xs"
                >
                  {showPromoted ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                      Hide Promoted
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Show Promoted
                    </>
                  )}
                </Button>
              )}

              {/* Bulk mode controls */}
              {bulkMode ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectedThoughtIds.size === thoughts.length ? handleDeselectAll : handleSelectAll}
                    className="h-8 text-xs"
                  >
                    {selectedThoughtIds.size === thoughts.length ? (
                      <>
                        <Square className="h-3.5 w-3.5 mr-1.5" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                        Select All
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedThoughtIds.size === 0) {
                        toast.error("Please select at least one thought");
                        return;
                      }
                      setShowBulkPromoteDialog(true);
                    }}
                    disabled={selectedThoughtIds.size === 0}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Promote Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBulkMode(false);
                      setSelectedThoughtIds(new Set());
                    }}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                /* Normal mode - three-dot menu */
                thoughts.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setBulkMode(true)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Bulk Promote
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              )}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <Card className="relative bg-background/60 border-border/40 shadow-xl shadow-primary/5 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
              <CardContent className="relative py-20 text-center">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Loading thoughts...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <Card className="relative bg-destructive/5 border-destructive/30 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
              <CardContent className="relative py-20 text-center">
                <div className="space-y-2">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!isLoading && !error && thoughts.length === 0 && (
            <Card className="relative bg-background/60 border-border/40 shadow-xl shadow-primary/5 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
              <CardContent className="relative py-20 text-center space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-full border border-primary/30">
                    <Lightbulb className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif font-bold text-xl text-foreground">No thoughts yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Use the Quick Thought feature (⌘+K) to capture your ideas. They'll appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thoughts list */}
          {!isLoading && !error && thoughts.length > 0 && (
            <div className="space-y-6">
              {thoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onDeleted={refreshThoughts}
                  showCheckbox={bulkMode}
                  isSelected={selectedThoughtIds.has(thought.id)}
                  onToggleSelection={handleToggleSelection}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bulk promote dialog */}
      <PromoteThoughtDialog
        open={showBulkPromoteDialog}
        onOpenChange={setShowBulkPromoteDialog}
        thoughtIds={Array.from(selectedThoughtIds)}
        thoughtPreviews={thoughts
          .filter(t => selectedThoughtIds.has(t.id))
          .map(t => ({
            id: t.id,
            title: t.meta?.title || 'Untitled',
            content: t.content,
          }))
        }
        onPromote={handleBulkPromoteWithFolder}
      />
    </div>
  );
}

