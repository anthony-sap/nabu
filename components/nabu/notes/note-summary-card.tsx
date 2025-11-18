/**
 * Note Summary Card Component
 * 
 * Displays a preview card for a note in the folder summary feed
 * Shows title, content preview, tags, and metadata
 */

"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NoteSummaryCardProps {
  id: string;
  title: string;
  content: string;
  tags: Array<{
    id: string;
    name: string;
    color?: string | null;
  }>;
  updatedAt: string;
  onClick: () => void;
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

export function NoteSummaryCard({
  id,
  title,
  content,
  tags,
  updatedAt,
  onClick,
}: NoteSummaryCardProps) {
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/30 bg-card/50 backdrop-blur-sm"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {title || "Untitled"}
            </h3>
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.slice(0, 5).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs"
                    style={
                      tag.color
                        ? {
                            backgroundColor: `${tag.color}20`,
                            borderColor: tag.color,
                            color: tag.color,
                          }
                        : {}
                    }
                  >
                    #{tag.name}
                  </Badge>
                ))}
                {tags.length > 5 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{tags.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Open
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content Preview */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {truncateText(content, 200)}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{content.length} characters</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

