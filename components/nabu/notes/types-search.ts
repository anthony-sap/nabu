/**
 * Search-related type definitions
 */

export type SearchResultType = "note" | "thought";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  preview: string; // First 150 chars of content
  folder?: {
    id: string;
    name: string;
    color?: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  // For navigation
  folderId?: string | null;
}

export interface SearchFilters {
  type: "all" | "notes" | "thoughts";
}

