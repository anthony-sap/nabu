"use client";

import { Calendar } from "lucide-react";
import { TagBadge } from "./tag-badge";
import { SourceUrlList, SourceInfo } from "./source-url-list";
import { RelatedLinksList } from "./related-links-list";
import { type LinkItem } from "./lexical-editor";

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
  onRemoveTag: (tagId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onAddLink: () => void;
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
  onRemoveTag,
  onDeleteLink,
  onAddLink,
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
      {tags.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tags
          </div>
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
        </div>
      )}

      {/* Source URLs Section */}
      {sourceUrls.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Source URLs
          </div>
          <SourceUrlList sources={sourceUrls} />
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

