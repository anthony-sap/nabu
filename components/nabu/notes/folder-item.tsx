"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderPlus, FilePlus, Loader2, Edit, Trash2 } from "lucide-react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderItem as FolderItemType } from "./types";
import { DragData } from "./drag-drop-utils";

/**
 * Props for the FolderItem component
 */
interface FolderItemProps {
  item: FolderItemType;
  level: number;
  onToggle: (id: string) => void;
  onSelect: (item: FolderItemType) => void;
  selectedId: string | null;
  editingNoteId?: string | null;
  onAddFolder?: (parentId: string | null) => void;
  onAddNote?: (folderId: string) => void;
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  onMoveNote?: (noteId: string, newFolderId: string | null) => void;
  allFolders?: FolderItemType[]; // Full folder tree for validation
}

/**
 * Format date for display in tree
 */
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit' 
  });
};

/**
 * Note row component with drag functionality
 */
function NoteRow({ 
  note, 
  folderId, 
  paddingLeft, 
  onSelect, 
  onDeleteNote,
  isEditing 
}: {
  note: { id: string; title: string; updatedAt: string };
  folderId: string;
  paddingLeft: string;
  onSelect: (item: FolderItemType) => void;
  onDeleteNote?: (noteId: string) => void;
  isEditing?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = noteRef.current;
    if (!element) return;

    const cleanup = draggable({
      element,
      getInitialData: () => {
        const dragData: DragData = {
          type: "note",
          id: note.id,
          name: note.title,
          folderId: folderId,
        };
        return dragData;
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    return cleanup;
  }, [note.id, note.title, folderId]);

  return (
    <div
      ref={noteRef}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors group h-8 ${
        isEditing
          ? "bg-primary/20 text-foreground font-medium"
          : isDragging
          ? "opacity-50"
          : "text-foreground/60 hover:bg-muted/30 hover:text-foreground"
      }`}
      style={{ paddingLeft }}
      onClick={() => {
        onSelect({
          id: note.id,
          name: note.title,
          type: "note",
        });
      }}
    >
      <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-sm flex-1 truncate">{note.title}</span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
          {formatDate(note.updatedAt)}
        </span>
        {onDeleteNote && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            title="Delete note"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Recursive component for rendering folder tree items
 * Supports both folder and note items with expand/collapse functionality
 */
export function FolderItem({ 
  item, 
  level, 
  onToggle, 
  onSelect, 
  selectedId,
  editingNoteId,
  onAddFolder,
  onAddNote,
  onEditFolder,
  onDeleteFolder,
  onDeleteNote,
  onMoveFolder,
  onMoveNote,
  allFolders = []
}: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  
  const isFolder = item.type === "folder";
  const hasChildren = item.children && item.children.length > 0;
  const hasNotes = item.notes && item.notes.length > 0;
  const isSelected = selectedId === item.id;
  const hasUnloadedChildren = isFolder && !item.hasLoadedChildren && (item.childCount ?? 0) > 0;
  // Folder can expand if it has loaded children, loaded notes, or indicates unloaded children
  const canExpand = hasChildren || hasNotes || hasUnloadedChildren;

  // Setup drag and drop for folders
  useEffect(() => {
    const element = folderRef.current;
    if (!element || !isFolder) return;

    // Make folder draggable
    const cleanup1 = draggable({
      element,
      getInitialData: () => {
        const dragData: DragData = {
          type: "folder",
          id: item.id,
          name: item.name,
          parentId: getParentId(allFolders, item.id),
        };
        return dragData;
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    // Make folder a drop target
    const cleanup2 = dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        const data = source.data as unknown as DragData;
        
        // Can't drop on yourself
        if (data.id === item.id) {
          return false;
        }

        // If dropping a folder, check for circular references
        if (data.type === "folder") {
          const descendants = getAllDescendantIds(allFolders, data.id);
          if (descendants.includes(item.id)) {
            return false;
          }
        }

        return true;
      },
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: ({ source }) => {
        setIsDragOver(false);
        const data = source.data as unknown as DragData;
        
        if (data.type === "folder" && onMoveFolder) {
          onMoveFolder(data.id, item.id);
        } else if (data.type === "note" && onMoveNote) {
          onMoveNote(data.id, item.id);
        }
      },
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, [item.id, item.name, isFolder, onMoveFolder, onMoveNote, allFolders]);

  /**
   * Get parent ID of a folder
   */
  function getParentId(items: FolderItemType[], targetId: string, currentParentId: string | null = null): string | null {
    for (const folder of items) {
      if (folder.id === targetId) {
        return currentParentId;
      }
      if (folder.children) {
        const found = getParentId(folder.children, targetId, folder.id);
        if (found !== undefined) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Get all descendant folder IDs
   */
  function getAllDescendantIds(items: FolderItemType[], folderId: string): string[] {
    const folder = findFolderById(items, folderId);
    if (!folder || !folder.children) return [];

    const ids: string[] = [];
    function collectIds(children: FolderItemType[]) {
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
   * Find folder by ID
   */
  function findFolderById(items: FolderItemType[], id: string): FolderItemType | undefined {
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

  return (
    <div>
      <div
        ref={folderRef}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors relative group h-8 ${
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : isDragOver
            ? "bg-primary/20 text-foreground"
            : isDragging
            ? "opacity-50"
            : "text-foreground/60 hover:bg-muted/30 hover:text-foreground"
        }`}
        style={{ paddingLeft: `${8 + (level * 16)}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isFolder && canExpand) {
            onToggle(item.id);
          } else if (!isFolder) {
            onSelect(item);
          }
        }}
      >
        {/* Always reserve space for chevron on folders for consistent alignment */}
        {isFolder && (
          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            {canExpand ? (
              item.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : item.expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4 h-4" /> // Empty space to maintain alignment
            )}
          </div>
        )}
        
        {/* Folder icon with color */}
        {isFolder && (
          <div title={item.color || "Default color"} className="flex-shrink-0">
            <Folder 
              className="h-4 w-4" 
              fill={item.color || 'hsl(var(--primary) / 0.7)'}
              style={{ 
                color: item.color || 'hsl(var(--primary) / 0.7)',
                stroke: item.color || 'hsl(var(--primary) / 0.7)',
              }}
            />
          </div>
        )}
        
        {/* Item name */}
        <span className="text-sm flex-1 truncate">{item.name}</span>
        
        {/* Action icons for folders on hover */}
        {isFolder && isHovered && (
          <div className="flex items-center gap-0.5 animate-in fade-in-0 duration-150">
            {onEditFolder && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFolder(item.id);
                }}
                title="Edit folder"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {onAddFolder && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddFolder(item.id);
                }}
                title="Add subfolder"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            )}
            {onAddNote && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote(item.id);
                }}
                title="Add note"
              >
                <FilePlus className="h-4 w-4" />
              </Button>
            )}
            {onDeleteFolder && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(item.id);
                }}
                title="Delete folder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Recursively render children when folder is expanded */}
      {isFolder && item.expanded && (
        <div>
          {/* Render subfolder children */}
          {hasChildren && item.children!.map((child) => (
            <FolderItem
              key={child.id}
              item={child}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              editingNoteId={editingNoteId}
              onAddFolder={onAddFolder}
              onAddNote={onAddNote}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              onDeleteNote={onDeleteNote}
              onMoveFolder={onMoveFolder}
              onMoveNote={onMoveNote}
              allFolders={allFolders}
            />
          ))}
          
          {/* Render notes within this folder */}
          {item.notes && item.notes.length > 0 && (
            <>
              {item.notes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  folderId={item.id}
                  paddingLeft={`${8 + ((level + 1) * 16) + 16 + 10}px`}
                  onSelect={onSelect}
                  onDeleteNote={onDeleteNote}
                  isEditing={editingNoteId === note.id}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

