import { FileText, Lightbulb, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchResult } from "./types-search";
import { CommandItem } from "@/components/ui/command";

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
 * Individual search result item component
 */
export function SearchResultItem({ result, onSelect, searchQuery }: SearchResultItemProps) {
  const Icon = result.type === "note" ? FileText : Lightbulb;
  const typeLabel = result.type === "note" ? "Note" : "Thought";

  return (
    <CommandItem
      value={`${result.id}-${result.title}-${result.content}`}
      onSelect={() => onSelect(result)}
      className="flex items-start gap-3 px-3 py-3 cursor-pointer"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`h-4 w-4 ${result.type === "note" ? "text-blue-500" : "text-amber-500"}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title */}
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-foreground truncate">{result.title}</h4>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {typeLabel}
          </Badge>
        </div>

        {/* Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {result.preview}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Folder */}
          {result.folder && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
                  variant="secondary"
                  className="text-[10px] font-normal bg-primary/10 text-primary"
                >
                  #{tag}
                </Badge>
              ))}
              {result.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{result.tags.length - 3} more</span>
              )}
            </>
          )}

          {/* Time */}
          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
            {formatTimeAgo(result.updatedAt)}
          </span>
        </div>
      </div>
    </CommandItem>
  );
}

