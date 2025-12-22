/**
 * Version History Panel Component
 * 
 * Collapsible sidebar panel showing chronological list of note versions
 * with preview and restore actions
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  RotateCcw,
  Clock,
  User,
  Loader2,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Version {
  id: string;
  versionNumber: number;
  reason: string;
  changesSummary: string | null;
  createdAt: string;
  createdBy: string | null;
  title: string;
}

interface VersionHistoryPanelProps {
  noteId: string;
  isOpen: boolean;
  onPreview: (versionId: string) => void;
  onRestore: (versionId: string) => void;
  className?: string;
}

/**
 * Get badge variant based on version reason
 */
function getReasonBadgeVariant(reason: string): "default" | "secondary" | "outline" {
  switch (reason) {
    case "manual":
      return "default";
    case "restore":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Format version reason for display
 */
function formatReason(reason: string): string {
  switch (reason) {
    case "manual":
      return "Manual";
    case "autosave":
      return "Auto";
    case "restore":
      return "Restore";
    default:
      return reason;
  }
}

/**
 * Version history panel component
 */
export function VersionHistoryPanel({
  noteId,
  isOpen,
  onPreview,
  onRestore,
  className,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Load versions when panel opens or noteId changes
   */
  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, noteId, page]);

  /**
   * Load versions from API
   */
  const loadVersions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/nabu/notes/${noteId}/versions?page=${page}&limit=20`
      );

      if (!response.ok) {
        throw new Error("Failed to load version history");
      }

      const { data } = await response.json();
      
      if (page === 1) {
        setVersions(data.versions);
      } else {
        setVersions((prev) => [...prev, ...data.versions]);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
    } catch (error: any) {
      console.error("Error loading versions:", error);
      setError(error.message || "Failed to load version history");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load more versions
   */
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  /**
   * Refresh version list
   */
  const handleRefresh = () => {
    setPage(1);
    loadVersions();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-[320px] border-l border-border/30 bg-background flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-between hover:bg-muted/50 px-2"
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Version History</span>
          </div>
          {!isCollapsed && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {versions.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Loading state */}
            {isLoading && page === 1 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground text-center">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Versions list */}
            {!isLoading && !error && versions.length === 0 && (
              <div className="text-center py-8">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No version history yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Versions are created automatically every 5 minutes
                </p>
              </div>
            )}

            {!isLoading && !error && versions.length > 0 && (
              <>
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Version header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          v{version.versionNumber}
                        </span>
                        <Badge
                          variant={getReasonBadgeVariant(version.reason)}
                          className="text-xs"
                        >
                          {formatReason(version.reason)}
                        </Badge>
                      </div>
                    </div>

                    {/* Version metadata */}
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      {version.createdBy && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{version.createdBy}</span>
                        </div>
                      )}
                    </div>

                    {/* Title preview */}
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {version.title}
                    </p>

                    {/* Changes summary */}
                    {version.changesSummary && (
              <p className="text-xs text-foreground/70 mb-2 line-clamp-2 italic">
                &ldquo;{version.changesSummary}&rdquo;
              </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(version.id)}
                        className="flex-1 h-8 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRestore(version.id)}
                        className="flex-1 h-8 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Load more button */}
                {hasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading && page > 1 ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

