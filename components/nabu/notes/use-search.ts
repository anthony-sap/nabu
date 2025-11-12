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
   * Search both notes and thoughts APIs
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Search both APIs in parallel
      const [notesResponse, thoughtsResponse] = await Promise.all([
        fetch(`/api/nabu/notes?search=${encodeURIComponent(searchQuery)}&limit=50`),
        fetch(`/api/nabu/thoughts?search=${encodeURIComponent(searchQuery)}&limit=50`),
      ]);

      if (!notesResponse.ok || !thoughtsResponse.ok) {
        throw new Error("Search failed");
      }

      const notesData = await notesResponse.json();
      const thoughtsData = await thoughtsResponse.json();

      // Transform notes to SearchResult format
      const noteResults: SearchResult[] = (notesData.data?.notes || []).map((note: any) => ({
        id: note.id,
        type: "note" as const,
        title: note.title,
        content: note.content,
        preview: note.content.slice(0, 150) + (note.content.length > 150 ? "..." : ""),
        folder: note.folder,
        tags: note.tags?.map((t: any) => t.name) || [],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        folderId: note.folderId,
      }));

      // Transform thoughts to SearchResult format
      const thoughtResults: SearchResult[] = (thoughtsData.data?.thoughts || []).map((thought: any) => ({
        id: thought.id,
        type: "thought" as const,
        title: thought.meta?.title || "Untitled Thought",
        content: thought.content,
        preview: thought.content.slice(0, 150) + (thought.content.length > 150 ? "..." : ""),
        folder: thought.meta?.folder ? { id: "", name: thought.meta.folder } : undefined,
        tags: thought.suggestedTags || [],
        createdAt: thought.createdAt,
        updatedAt: thought.updatedAt,
        folderId: null,
      }));

      // Combine and sort by most recent
      const combined = [...noteResults, ...thoughtResults].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setResults(combined);
    } catch (err) {
      console.error("Search error:", err);
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

