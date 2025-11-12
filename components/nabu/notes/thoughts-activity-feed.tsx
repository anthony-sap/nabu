"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Lightbulb } from "lucide-react";

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
export function ThoughtsActivityFeed() {
  const [thoughts, setThoughts] = useState<ApiThought[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load thoughts from API
   */
  useEffect(() => {
    const loadThoughts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch("/api/nabu/thoughts");
        if (!response.ok) {
          throw new Error("Failed to fetch thoughts");
        }

        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.thoughts)) {
          // Sort by createdAt, newest first (API already sorts, but double-check)
          const sorted = data.data.thoughts.sort((a: ApiThought, b: ApiThought) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setThoughts(sorted);
        }
      } catch (err) {
        console.error("Failed to load thoughts:", err);
        setError(err instanceof Error ? err.message : "Failed to load thoughts");
      } finally {
        setIsLoading(false);
      }
    };

    loadThoughts();
  }, []);

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-4 pt-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Thoughts</h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {thoughts.length} {thoughts.length === 1 ? "thought" : "thoughts"}
            </Badge>
          </div>

          {/* Loading state */}
          {isLoading && (
            <Card className="bg-card/30 border-border/20">
              <CardContent className="py-16 text-center">
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">Loading thoughts...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-16 text-center">
                <div className="space-y-1.5">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!isLoading && !error && thoughts.length === 0 && (
            <Card className="bg-card/30 border-border/20">
              <CardContent className="py-16 text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg" />
                  <div className="relative flex items-center justify-center w-full h-full bg-primary/5 rounded-full border border-primary/20">
                    <Lightbulb className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-base text-foreground">No thoughts yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Use the Quick Thought feature (⌘+K) to capture your ideas. They'll appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thoughts list */}
          {!isLoading && !error && thoughts.length > 0 && (
            <div className="space-y-4">
              {thoughts.map((thought) => (
                <Card
                  key={thought.id}
                  className="bg-card/40 border-border/10 hover:border-border/20 transition-colors hover:bg-card/50"
                >
                  <CardContent className="pt-6 pb-5 px-5">
                    <div className="space-y-4">
                      {/* Header: Title and timestamp */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-foreground mb-1 truncate">
                            {thought.meta?.title || "Untitled Thought"}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(thought.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content preview */}
                      <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3">
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
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

