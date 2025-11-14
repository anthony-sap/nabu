"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Lightbulb } from "lucide-react";
import { QuickCaptureForm } from "./quick-capture-form";
import { ThoughtCard } from "./thought-card";

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

  /**
   * Refresh thoughts list (e.g., after deletion)
   */
  const refreshThoughts = () => {
    const loadThoughts = async () => {
      try {
        const response = await fetch("/api/nabu/thoughts");
        if (!response.ok) {
          throw new Error("Failed to fetch thoughts");
        }

        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.thoughts)) {
          const sorted = data.data.thoughts.sort((a: ApiThought, b: ApiThought) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setThoughts(sorted);
        }
      } catch (err) {
        console.error("Failed to refresh thoughts:", err);
      }
    };

    loadThoughts();
  };

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Quick capture form */}
          <QuickCaptureForm />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-serif font-semibold text-foreground">Thoughts</h2>
            </div>
            <Badge variant="secondary" className="text-xs bg-secondary/15 text-secondary border-secondary/20">
              {thoughts.length} {thoughts.length === 1 ? "thought" : "thoughts"}
            </Badge>
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
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

