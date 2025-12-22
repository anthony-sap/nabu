import { FileText, Lightbulb, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchResult } from "./types-search";
import { CommandItem } from "@/components/ui/command";
import { ReactNode } from "react";

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  searchQuery: string;
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
 * Escape regex characters for safe highlighting
 */
function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlight matching query fragments inside a string
 */
function highlightMatches(text: string, query: string): ReactNode {
  const terms = Array.from(new Set(query.toLowerCase().split(/\s+/).filter(Boolean)));
  if (!text || terms.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (terms.includes(part.toLowerCase())) {
      return (
        <span key={`${part}-${index}`} className="text-primary font-semibold">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Individual search result item component
 */
export function SearchResultItem({ result, onSelect, searchQuery }: SearchResultItemProps) {
  const Icon = result.type === "note" ? FileText : Lightbulb;
  const typeLabel = result.type === "note" ? "Note" : "Thought";
  const iconColorClass = result.type === "note" ? "text-primary" : "text-amber-500";
  const badgeColorClass = result.type === "note" 
    ? "bg-primary/10 text-primary border-primary/20" 
    : "bg-amber-500/10 text-amber-600 border-amber-500/20";

  return (
    <CommandItem
      value={`${result.id}-${result.title}-${result.content}`}
      onSelect={() => onSelect(result)}
      className="px-0 py-0 bg-transparent focus:bg-transparent"
    >
      <div
        className="group w-full rounded-2xl border border-border/40 bg-card/50 px-5 py-4 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:bg-card/80 cursor-pointer"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1 rounded-xl bg-muted/30 p-2.5 group-hover:bg-muted/50 transition-all">
            <Icon className={`h-5 w-5 ${iconColorClass}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title */}
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base text-foreground truncate">
                {highlightMatches(result.title, searchQuery)}
              </h4>
              <Badge
                variant="outline"
                className={`text-[10px] font-medium ${badgeColorClass}`}
              >
                {typeLabel}
              </Badge>
            </div>

            {/* Preview */}
            <p className="text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
              {highlightMatches(result.preview, searchQuery)}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Folder */}
              {result.folder && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 bg-muted/20 px-2 py-0.5 rounded-md">
                  <Folder className="h-3 w-3" />
                  <span>{result.folder.name}</span>
                </div>
              )}

              {/* Tags */}
              {result.tags && result.tags.length > 0 && (
                <>
                  {result.tags.slice(0, 3).map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-[10px] font-normal border-primary/20 bg-primary/5 text-primary/90"
                    >
                      #{tag}
                    </Badge>
                  ))}
                  {result.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground/70">
                      +{result.tags.length - 3}
                    </span>
                  )}
                </>
              )}

              {/* Time */}
              <span className="text-[10px] text-muted-foreground/70 ml-auto flex-shrink-0 font-medium">
                {formatTimeAgo(result.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CommandItem>
  );
}

