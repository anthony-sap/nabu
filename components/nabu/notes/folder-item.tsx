"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderPlus, FilePlus } from "lucide-react";
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
  onAddFolder?: (parentId: string) => void;
  onAddNote?: (folderId: string) => void;
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
  onAddFolder,
  onAddNote
}: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isFolder = item.type === "folder";
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedId === item.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all relative group ${
          isSelected
            ? "bg-primary/15 text-primary font-medium border-l-2 border-primary"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        }`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isFolder && hasChildren) {
            onToggle(item.id);
          } else {
            onSelect(item);
          }
        }}
      >
        {/* Expand/collapse icon for folders with children */}
        {isFolder && hasChildren && (
          <div className="text-muted-foreground">
            {item.expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
        
        {/* File/folder icon */}
        {!isFolder && <FileText className="h-4 w-4 text-primary/70" />}
        {isFolder && <Folder className="h-4 w-4 text-primary/70" />}
        
        {/* Item name */}
        <span className="text-sm flex-1 truncate">{item.name}</span>
        
        {/* Tag count badge for notes */}
        {!isFolder && item.tags && (
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-primary/20 text-primary border-primary/30">
            {item.tags.length}
          </Badge>
        )}
        
        {/* Action icons for folders on hover */}
        {isFolder && isHovered && (
          <div className="flex items-center gap-1 animate-in fade-in-0 duration-150">
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
      {isFolder && hasChildren && item.expanded && (
        <div>
          {item.children!.map((child) => (
            <FolderItem
              key={child.id}
              item={child}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              onAddFolder={onAddFolder}
              onAddNote={onAddNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

