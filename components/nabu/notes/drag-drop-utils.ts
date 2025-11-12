import { FolderItem } from "./types";

/**
 * Type definition for drag data payload
 */
export interface DragData extends Record<string, unknown> {
  type: "folder" | "note";
  id: string;
  name: string;
  parentId?: string | null; // For folders
  folderId?: string | null; // For notes
}

/**
 * Get all descendant folder IDs from a folder tree
 * Used to prevent circular references when dropping folders
 */
export function getAllDescendantIds(
  folders: FolderItem[],
  folderId: string
): string[] {
  const folder = findFolderById(folders, folderId);
  if (!folder || !folder.children) return [];

  const ids: string[] = [];
  
  function collectIds(children: FolderItem[]) {
    children.forEach((child) => {
      if (child.type === "folder") {
        ids.push(child.id);
        if (child.children) {
          collectIds(child.children);
        }
      }
    });
  }
  
  collectIds(folder.children);
  return ids;
}

/**
 * Find a folder by ID within the tree
 */
function findFolderById(items: FolderItem[], id: string): FolderItem | undefined {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findFolderById(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Check if a drop operation is valid
 * Prevents:
 * - Dropping a folder into itself
 * - Dropping a folder into its descendants (circular reference)
 * - Dropping incompatible types
 */
export function isValidDrop(
  source: DragData,
  targetId: string | null,
  folders: FolderItem[]
): boolean {
  // Can't drop on yourself
  if (source.id === targetId) {
    return false;
  }

  // If dropping a folder, check for circular references
  if (source.type === "folder" && targetId) {
    const descendants = getAllDescendantIds(folders, source.id);
    if (descendants.includes(targetId)) {
      return false;
    }
  }

  return true;
}

/**
 * Symbol key for storing drag data
 */
export const dragDataSymbol = Symbol("drag-data");

