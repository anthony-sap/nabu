import { FolderItem } from "./types";

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
  _count?: {
    notes: number;
    children: number;
  };
}

/**
 * Transform API folder response to FolderItem format
 */
function transformFolder(apiFolder: ApiFolderResponse): FolderItem {
  return {
    id: apiFolder.id,
    name: apiFolder.name,
    type: "folder",
    color: apiFolder.color || undefined,
    expanded: false,
    children: apiFolder.children?.map(transformFolder) || [],
    hasLoadedChildren: !!apiFolder.children, // if children were included, mark as loaded
    childCount: apiFolder._count?.children || 0,
  };
}

/**
 * Fetch root-level folders for the current user
 * @returns Array of root folders (where parentId is null)
 */
export async function fetchRootFolders(): Promise<FolderItem[]> {
  try {
    const response = await fetch("/api/nabu/folders");
    
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
 * @returns Array of child folders/notes
 */
export async function fetchFolderChildren(parentId: string): Promise<FolderItem[]> {
  try {
    const response = await fetch(`/api/nabu/folders?parentId=${encodeURIComponent(parentId)}`);
    
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

