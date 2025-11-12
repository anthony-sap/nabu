"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Source URL information
 */
export interface SourceInfo {
  url: string;
}

/**
 * Props for SourceUrlList component
 */
interface SourceUrlListProps {
  sources: SourceInfo[];
  className?: string;
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Component to display a list of source URLs captured from pasted content
 * Shows all unique sources in a collapsible section
 */
export function SourceUrlList({ sources, className }: SourceUrlListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't render if no sources
  if (!sources || sources.length === 0) {
    return null;
  }

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
          <Link className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Sources</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {sources.length}
          </Badge>
        </div>
      </Button>

      {/* Source list */}
      {isExpanded && (
        <div className="space-y-2">
          {sources.map((source, index) => {
            const domain = extractDomain(source.url);
            
            return (
              <div
                key={`${source.url}-${index}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                 <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                    title={source.url}
                  ><ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /></a>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {domain}
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                    title={source.url}
                  >
                    {source.url}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

