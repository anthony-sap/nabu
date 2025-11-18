"use client";

import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useSearch } from "./use-search";
import { SearchResultItem } from "./search-result-item";
import { SearchResult } from "./types-search";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult: (result: SearchResult) => void;
}

/**
 * Global search dialog component
 * Searches across notes and thoughts with filtering
 */
export function SearchDialog({ open, onOpenChange, onSelectResult }: SearchDialogProps) {
  const { query, results, isLoading, error, filters, updateQuery, setFilters, resetSearch } =
    useSearch();

  // Note: Removed auto-clear on close to persist search state between dialog opens

  /**
   * Handle result selection
   */
  const handleSelect = (result: SearchResult) => {
    onSelectResult(result);
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="max-w-[95vw] w-full lg:max-w-6xl max-h-[80vh] rounded-3xl border border-border/60 bg-background/95 backdrop-blur-xl"
      commandClassName="h-full flex flex-col"
    >
      <CommandInput
        placeholder="Search notes and thoughts..."
        value={query}
        onValueChange={updateQuery}
      />

      {/* Filter buttons */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <Button
            size="sm"
            variant={filters.type === "all" ? "default" : "outline"}
            onClick={() => setFilters({ type: "all" })}
            className="h-7 text-xs"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filters.type === "notes" ? "default" : "outline"}
            onClick={() => setFilters({ type: "notes" })}
            className="h-7 text-xs"
          >
            Notes
          </Button>
          <Button
            size="sm"
            variant={filters.type === "thoughts" ? "default" : "outline"}
            onClick={() => setFilters({ type: "thoughts" })}
            className="h-7 text-xs"
          >
            Thoughts
          </Button>
        </div>
        
        {/* Clear all button */}
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSearch}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      <CommandList className=" max-h-[calc(80vh-180px)] px-2 py-2 space-y-2">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && query && results.length === 0 && (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        )}

        {/* Results */}
        {!isLoading && !error && results.length > 0 && (
          <CommandGroup heading={`${results.length} result${results.length === 1 ? "" : "s"}`}>
            {results.map((result) => (
              <SearchResultItem
                key={`${result.type}-${result.id}`}
                result={result}
                onSelect={handleSelect}
                searchQuery={query}
              />
            ))}
          </CommandGroup>
        )}

        {/* Initial empty state */}
        {!query && !isLoading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Start typing to search...</p>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}

