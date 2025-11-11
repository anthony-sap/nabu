/**
 * Type definitions for the notes activity system
 */

/**
 * Represents a captured thought/note with metadata
 */
export interface SavedThought {
  id: string;           // Unique identifier (timestamp-based)
  title: string;        // Thought title
  content: string;      // Thought content
  tags: string[];       // Array of tag strings
  folder: string;       // Folder name/path
  createdAt: string;    // ISO timestamp
  pinned?: boolean;     // Optional pinned status
}

/**
 * Represents a folder or note item in the folder tree structure
 */
export interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "note";
  color?: string; // Optional color for folder items
  expanded?: boolean;
  children?: FolderItem[];
  tags?: string[];
  isLoading?: boolean; // true while fetching children from API
  hasLoadedChildren?: boolean; // true if children have been fetched from API
  childCount?: number; // total count of children from API _count.children
}

