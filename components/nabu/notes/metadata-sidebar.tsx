"use client";

import { Calendar, Lightbulb, Sparkles, Loader2, Plus } from "lucide-react";
import { TagBadge } from "./tag-badge";
import { SourceUrlList, SourceInfo } from "./source-url-list";
import { RelatedLinksList } from "./related-links-list";
import { type LinkItem } from "./lexical-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Props for MetadataSidebar component
 */
interface MetadataSidebarProps {
  createdAt: Date | null;
  tags: Array<{
    id: string;
    name: string;
    color?: string | null;
    source?: "USER_ADDED" | "AI_SUGGESTED";
    confidence?: number | null;
  }>;
  sourceUrls: SourceInfo[];
  links: LinkItem[];
  sourceThoughts?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  onRemoveTag: (tagId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onAddLink: () => void;
  onAddTag: () => void;
  onRequestTagSuggestions?: () => void;
  isGeneratingTags?: boolean;
}

/**
 * Format date to "Nov 13, 2024 at 2:30 PM" format
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Metadata sidebar component displaying note metadata
 * - Created date
 * - Tags
 * - Source URLs
 * - Related Links
 */
export function MetadataSidebar({
  createdAt,
  tags,
  sourceUrls,
  links,
  sourceThoughts = [],
  onRemoveTag,
  onDeleteLink,
  onAddLink,
  onAddTag,
  onRequestTagSuggestions,
  isGeneratingTags = false,
}: MetadataSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Created Date */}
      {createdAt && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Calendar className="h-3.5 w-3.5" />
            Created
          </div>
          <div className="text-sm text-foreground">
            {formatDateTime(createdAt)}
          </div>
        </div>
      )}

      {/* Tags Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tags
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddTag}
              className="h-7 px-2"
              title="Add tag manually"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {onRequestTagSuggestions && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRequestTagSuggestions}
                disabled={isGeneratingTags}
                className="h-7 px-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
                title={isGeneratingTags ? "Generating suggestions..." : "Suggest tags with AI"}
              >
                {isGeneratingTags ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
              </Button>
            )}
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                id={tag.id}
                name={tag.name}
                color={tag.color}
                source={tag.source}
                confidence={tag.confidence}
                onRemove={onRemoveTag}
                removable={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Source URLs Section */}
      {sourceUrls.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Source URLs
          </div>
          <SourceUrlList sources={sourceUrls} />
        </div>
      )}

      {/* Source Thoughts Section - show which thoughts created this note */}
      {sourceThoughts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Lightbulb className="h-3.5 w-3.5" />
            Source Thoughts
          </div>
          <div className="space-y-2">
            {sourceThoughts.map((thought) => (
              <div
                key={thought.id}
                className="p-2 rounded-md bg-muted/30 border border-border/40"
              >
                <p className="text-xs font-medium text-foreground mb-1">
                  {thought.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {thought.content}
                </p>
              </div>
            ))}
            <Badge variant="secondary" className="text-[10px]">
              {sourceThoughts.length} thought{sourceThoughts.length > 1 ? 's' : ''} merged
            </Badge>
          </div>
        </div>
      )}

      {/* Related Links Section */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Linked Notes
        </div>
        <RelatedLinksList
          links={links}
          onDeleteLink={onDeleteLink}
          onAddLink={onAddLink}
        />
      </div>
    </div>
  );
}

