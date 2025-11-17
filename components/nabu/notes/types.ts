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
 * Represents a note item within a folder (title only, no content)
 */
export interface NoteItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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
  hasLoadedChildren?: boolean; // true if folder structure children have been fetched from API
  hasLoadedNotes?: boolean; // true if notes within this folder have been fetched
  childCount?: number; // total count of child folders from API _count.children
  noteCount?: number; // total count of notes from API _count.notes
  notes?: NoteItem[]; // notes within this folder (titles only)
  notesLoading?: boolean; // true while fetching notes
}

