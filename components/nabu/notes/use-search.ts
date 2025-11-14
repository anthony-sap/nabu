import { useState, useCallback, useEffect } from "react";
import { SearchResult, SearchFilters } from "./types-search";

/**
 * Debounce timeout reference
 */
let searchTimeout: NodeJS.Timeout | null = null;

/**
 * Hook for searching notes and thoughts
 */
export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({ type: "all" });

  /**
   * Call the semantic search API (notes + thoughts)
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        limit: "50",
        includeNotes: "true",
        includeThoughts: "true",
      });

      const response = await fetch(`/api/nabu/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const json = await response.json();
      const apiResults = json?.data?.results || [];

      const mappedResults: SearchResult[] = apiResults.map((item: any) => {
        const entityType = item.entityType === "thought" ? "thought" : "note";
        const fallbackTitle =
          entityType === "note" ? "Untitled Note" : "Untitled Thought";

        const content = item.content || item.matchedChunk?.content || "";
        const previewSource = item.matchedChunk?.content || content || "";
        const preview =
          previewSource.length > 150
            ? `${previewSource.slice(0, 150)}...`
            : previewSource;

        return {
          id: item.id,
          type: entityType,
          title: item.title || fallbackTitle,
          content,
          preview,
          folder: item.folder
            ? {
                id: item.folder.id,
                name: item.folder.name,
                color: item.folder.color,
              }
            : undefined,
          tags: item.tags || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          folderId: item.folderId ?? null,
        };
      });

      setResults(mappedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      searchTimeout = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    },
    [performSearch]
  );

  /**
   * Update query and trigger search
   */
  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      debouncedSearch(newQuery);
    },
    [debouncedSearch]
  );

  /**
   * Filter results based on type
   */
  const filteredResults = results.filter((result) => {
    if (filters.type === "all") return true;
    if (filters.type === "notes") return result.type === "note";
    if (filters.type === "thoughts") return result.type === "thought";
    return true;
  });

  /**
   * Clean up timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  /**
   * Clear results callback
   */
  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    query,
    results: filteredResults,
    isLoading,
    error,
    filters,
    updateQuery,
    setFilters,
    clearResults,
  };
}

