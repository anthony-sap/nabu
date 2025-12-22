/**
 * Note Summary Card Component
 * 
 * Displays a preview card for a note in the folder summary feed
 * Shows title, content preview, tags, and metadata
 * 
 * Styled according to Nabu "Modern Scribe" Design System
 */

"use client";

import { Badge } from "@/components/ui/badge";
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
    <div 
      className="group cursor-pointer p-6 
                 rounded-2xl
                 bg-white dark:bg-white/5
                 border border-[rgb(var(--nabu-deep))]/5 dark:border-white/5
                 hover:border-[rgb(var(--nabu-mint))]/50 
                 hover:shadow-lg hover:-translate-y-1 
                 transition-all duration-300"
      onClick={onClick}
    >
      {/* Header with title and open button */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {/* Title: font-bold text-lg */}
          <h3 className="font-bold text-lg text-[rgb(var(--nabu-deep))] dark:text-white 
                         group-hover:text-[rgb(var(--nabu-mint))] transition-colors line-clamp-2">
            {title || "Untitled"}
          </h3>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs rounded-full"
                  style={
                    tag.color
                      ? {
                          backgroundColor: `${tag.color}15`,
                          borderColor: `${tag.color}40`,
                          color: tag.color,
                        }
                      : {
                          backgroundColor: 'rgb(var(--nabu-lapis) / 0.1)',
                          borderColor: 'rgb(var(--nabu-lapis) / 0.3)',
                          color: 'rgb(var(--nabu-lapis))',
                        }
                  }
                >
                  #{tag.name}
                </Badge>
              ))}
              {tags.length > 5 && (
                <Badge variant="outline" className="text-xs rounded-full text-[rgb(var(--nabu-deep))]/40 dark:text-white/40">
                  +{tags.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Open button - appears on hover */}
        <button
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium
                   opacity-0 group-hover:opacity-100 
                   text-[rgb(var(--nabu-deep))]/60 dark:text-white/60
                   hover:bg-[rgb(var(--nabu-deep))]/5 dark:hover:bg-white/10
                   hover:text-[rgb(var(--nabu-deep))] dark:hover:text-white
                   transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Open
        </button>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-[rgb(var(--nabu-deep))]/60 dark:text-slate-400 line-clamp-3 mb-4">
        {truncateText(content, 200) || "Start writing your note..."}
      </p>

      {/* Metadata: text-xs font-medium */}
      <div className="flex items-center gap-4 text-xs font-medium text-[rgb(var(--nabu-deep))]/40 dark:text-slate-400">
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
    </div>
  );
}
