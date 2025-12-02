import { z } from "zod";
import { FolderItem, NoteItem } from "./types";

/**
 * API note response format from the backend (title only, no content)
 */
interface ApiNoteResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API response format from the backend
 */
interface ApiFolderResponse {
  id: string;
  tenantId: string | null;
  userId: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  order: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  children?: ApiFolderResponse[];
  notes?: ApiNoteResponse[];
  _count?: {
    notes: number;
    children: number;
  };
}

/**
 * Transform API folder response to FolderItem format
 */
export function transformFolder(apiFolder: ApiFolderResponse): FolderItem {
  // Fallback: if _count is empty/missing, calculate from actual data
  const childCount = apiFolder._count?.children ?? apiFolder.children?.length ?? 0;
  const notesCount = apiFolder._count?.notes ?? apiFolder.notes?.length ?? 0;
  
  const transformedNotes = apiFolder.notes?.map(note => ({
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));
  
  // hasLoadedChildren is true if we have the actual children data
  const hasLoadedChildren = !!apiFolder.children;
  // hasLoadedNotes is true if we have the actual notes data
  const hasLoadedNotes = apiFolder.notes !== undefined;
  
  return {
    id: apiFolder.id,
    name: apiFolder.name,
    type: "folder",
    color: apiFolder.color || undefined,
    expanded: false,
    children: apiFolder.children?.map(transformFolder) || [],
    hasLoadedChildren: hasLoadedChildren,
    hasLoadedNotes: hasLoadedNotes,
    childCount: childCount,
    noteCount: notesCount,
    notes: transformedNotes,
  };
}

/**
 * Fetch root-level folders for the current user
 * @param includeNotes - Whether to include notes in the response
 * @param includeFullTree - Whether to fetch the entire folder hierarchy
 * @returns Array of root folders (where parentId is null)
 */
export async function fetchRootFolders(includeNotes = false, includeFullTree = true): Promise<FolderItem[]> {
  try {
    const params = new URLSearchParams();
    if (includeNotes) {
      params.set("includeNotes", "true");
    }
    if (includeFullTree) {
      params.set("includeFullTree", "true");
    }
    
    const url = `/api/nabu/folders${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch folders: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from server");
    }

    return data.data.map(transformFolder);
  } catch (error) {
    console.error("Error fetching root folders:", error);
    throw error;
  }
}

/**
 * Fetch children of a specific folder
 * @param parentId - ID of the parent folder
 * @param includeNotes - Whether to include notes in the response
 * @returns Array of child folders/notes
 */
export async function fetchFolderChildren(parentId: string, includeNotes = true): Promise<FolderItem[]> {
  try {
    const params = new URLSearchParams({
      parentId,
    });
    if (includeNotes) {
      params.set("includeNotes", "true");
    }
    
    const response = await fetch(`/api/nabu/folders?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch folder children: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from server");
    }

    return data.data.map(transformFolder);
  } catch (error) {
    console.error(`Error fetching children for folder ${parentId}:`, error);
    throw error;
  }
}

/**
 * Grouped folders response structure
 */
export interface GroupedFoldersResponse {
  personal: {
    folders: FolderItem[];
    uncategorisedNotes: NoteItem[];
  };
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    folders: FolderItem[];
    uncategorisedNotes: NoteItem[];
  }>;
}

/**
 * Fetch grouped folders (personal + workspaces)
 * @returns Grouped folders with personal and workspace sections
 */
export async function fetchGroupedFolders(): Promise<GroupedFoldersResponse> {
  try {
    const response = await fetch("/api/nabu/folders?includeWorkspaces=true");
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch grouped folders: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error("Invalid response format from server");
    }

    return {
      personal: {
        folders: data.data.personal.folders.map(transformFolder),
        uncategorisedNotes: data.data.personal.uncategorisedNotes.map((note: any) => ({
          id: note.id,
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      },
      workspaces: data.data.workspaces.map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        role: ws.role,
        folders: ws.folders.map(transformFolder),
        uncategorisedNotes: ws.uncategorisedNotes.map((note: any) => ({
          id: note.id,
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching grouped folders:", error);
    throw error;
  }
}

/**
 * Fetch notes for a specific folder
 * @param folderId - ID of the folder, or null/undefined for uncategorized notes
 * @returns Array of notes in the folder
 */
export async function fetchFolderNotes(folderId: string | null | undefined): Promise<NoteItem[]> {
  try {
    // Normalize null/undefined to 'null' string for uncategorized notes
    const normalizedFolderId = folderId === null || folderId === undefined ? 'null' : folderId;
    
    // Validate folderId format - should be 'null' or a non-empty string
    // Backend will validate CUID format, so we just check it's a valid string here
    if (normalizedFolderId !== 'null') {
      if (!normalizedFolderId || typeof normalizedFolderId !== 'string' || normalizedFolderId.trim().length === 0) {
        throw new Error(`Invalid folderId: ${folderId}. Expected a valid folder ID or null for uncategorized notes.`);
      }
      // Basic validation: ensure it's a reasonable length (CUIDs are typically 25 chars)
      // But accept any non-empty string since backend will validate the actual format
      if (normalizedFolderId.length < 1 || normalizedFolderId.length > 100) {
        throw new Error(`Invalid folderId format: ${folderId}. Folder ID length is invalid.`);
      }
    }
    
    const response = await fetch(`/api/nabu/notes?folderId=${normalizedFolderId}`);
    
    if (!response.ok) {
      // Read the actual error message from the API response body
      let errorMessage = `Failed to fetch notes: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        // Include validation details if available
        if (errorData.message) {
          errorMessage = `${errorMessage} - ${errorData.message}`;
        }
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
        console.error("Failed to parse error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.success || !data.data.notes || !Array.isArray(data.data.notes)) {
      throw new Error("Invalid response format from server");
    }

    return data.data.notes.map((note: any) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));
  } catch (error) {
    console.error(`Error fetching notes for folder ${folderId}:`, error);
    throw error;
  }
}

