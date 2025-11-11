"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderPlus, FilePlus, Loader2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderItem as FolderItemType } from "./types";

/**
 * Props for the FolderItem component
 */
interface FolderItemProps {
  item: FolderItemType;
  level: number;
  onToggle: (id: string) => void;
  onSelect: (item: FolderItemType) => void;
  selectedId: string | null;
  onAddFolder?: (parentId: string | null) => void;
  onAddNote?: (folderId: string) => void;
  onEditFolder?: (folderId: string) => void;
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
 * Recursive component for rendering folder tree items
 * Supports both folder and note items with expand/collapse functionality
 */
export function FolderItem({ 
  item, 
  level, 
  onToggle, 
  onSelect, 
  selectedId,
  onAddFolder,
  onAddNote,
  onEditFolder
}: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isFolder = item.type === "folder";
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedId === item.id;
  const hasUnloadedChildren = isFolder && !item.hasLoadedChildren && (item.childCount ?? 0) > 0;
  const canExpand = hasChildren || hasUnloadedChildren;

  return (
    <div>
      <div
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors relative group h-8 ${
          isSelected
            ? "bg-primary/10 text-primary font-medium"
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
              style={{ color: item.color || 'hsl(var(--primary) / 0.7)' }}
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
              onAddFolder={onAddFolder}
              onAddNote={onAddNote}
              onEditFolder={onEditFolder}
            />
          ))}
          
          {/* Render notes within this folder */}
          {item.notes && item.notes.length > 0 && (
            <>
              {item.notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-foreground/60 hover:bg-muted/30 hover:text-foreground group h-8"
                  style={{ paddingLeft: `${8 + ((level + 1) * 16) + 16 + 10}px` }}
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
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                    {formatDate(note.updatedAt)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

