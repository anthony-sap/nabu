import { useRef, useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, AlertCircle, FileText, Trash2, Lightbulb, Zap } from "lucide-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { FolderItem } from "./folder-item";
import { FolderItem as FolderItemType, NoteItem } from "./types";
import { DragData } from "./drag-drop-utils";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { QuickThoughtTrigger } from "@/components/nabu/quick-thought-trigger";

/**
 * Props for the NotesSidebar component
 */
interface NotesSidebarProps {
  folders: FolderItemType[];
  rootNotes: NoteItem[];
  view: "feed" | "folders" | "editor" | "thoughts";
  selectedNote: FolderItemType | null;
  editingNoteId?: string | null;
  onViewChange: (view: "feed" | "folders" | "editor" | "thoughts") => void;
  onFolderToggle: (id: string) => void;
  onNoteSelect: (item: FolderItemType) => void;
  onAddFolder?: (parentId: string | null) => void;
  onAddNote?: (folderId: string) => void;
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  onMoveNote?: (noteId: string, newFolderId: string | null) => void;
  isLoadingFolders?: boolean;
  folderLoadError?: string | null;
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
 * Sidebar component for notes navigation
 * Displays feed/folder navigation and hierarchical folder structure
 */
export function NotesSidebar({
  folders,
  rootNotes,
  view,
  selectedNote,
  editingNoteId,
  onViewChange,
  onFolderToggle,
  onNoteSelect,
  onAddFolder,
  onAddNote,
  onEditFolder,
  onDeleteFolder,
  onDeleteNote,
  onMoveFolder,
  onMoveNote,
  isLoadingFolders,
  folderLoadError,
}: NotesSidebarProps) {
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);
  const uncategorisedRef = useRef<HTMLDivElement>(null);
  const rootDropZoneRef = useRef<HTMLButtonElement>(null);

  // Setup drop target for Uncategorised section (notes only)
  useEffect(() => {
    const element = uncategorisedRef.current;
    if (!element) return;

    const cleanup = dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        const data = source.data as DragData;
        // Only notes can be dropped in uncategorised
        return data.type === "note";
      },
      onDragEnter: () => setIsRootDropTarget(true),
      onDragLeave: () => setIsRootDropTarget(false),
      onDrop: ({ source }) => {
        setIsRootDropTarget(false);
        const data = source.data as DragData;
        if (data.type === "note" && onMoveNote) {
          onMoveNote(data.id, null); // null means root level
        }
      },
    });

    return cleanup;
  }, [onMoveNote]);

  // Setup drop target for root folder drop zone
  useEffect(() => {
    const element = rootDropZoneRef.current;
    if (!element) return;

    const cleanup = dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        const data = source.data as DragData;
        // Only folders can be moved to root
        return data.type === "folder";
      },
      onDragEnter: () => setIsRootDropTarget(true),
      onDragLeave: () => setIsRootDropTarget(false),
      onDrop: ({ source }) => {
        setIsRootDropTarget(false);
        const data = source.data as DragData;
        if (data.type === "folder" && onMoveFolder) {
          onMoveFolder(data.id, null); // null means root level
        }
      },
    });

    return cleanup;
  }, [onMoveFolder]);
  return (
    <div className="w-72 flex-shrink-0 h-full border-r border-border/30 backdrop-blur-xl bg-background/40 flex flex-col">
      {/* Top branding and controls with glassy effect */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-border/30">
        {/* Logo and controls row - inline */}
        <div className="flex items-center justify-between mb-4">
          {/* Logo and brand */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 relative flex items-center justify-center ring-1 ring-primary/20">
              <img src="/nabu_logo.png" alt="Nabu" className="absolute inset-0 m-2 fill-[var(--nabu-mint)] w-5"/>
            </div>
            <span className="font-serif font-bold text-xl text-foreground">Nabu</span>
          </div>
          
          {/* Controls on the right */}
          <div className="flex items-center gap-1">
            <ModeToggle />
            <UserAccountNav />
          </div>
        </div>
        
        {/* Quick Thought Trigger - full width button */}
        <QuickThoughtTrigger />
      </div>
      
      {/* Navigation content */}
      <ScrollArea className="flex-1">
        <div className="p-3 pb-6 space-y-1">
          {/* Feed navigation option with premium active state */}
          <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${
              view === "feed"
                ? "bg-primary/15 text-primary font-medium shadow-sm ring-1 ring-primary/20"
                : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              onViewChange("feed");
            }}
          >
            {view === "feed" && (
              <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
            )}
            <Home className="h-4 w-4" />
            <span className="text-sm">Feed</span>
            {view === "feed" && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </div>

          {/* Thoughts navigation option with premium active state */}
          <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${
              view === "thoughts"
                ? "bg-primary/15 text-primary font-medium shadow-sm ring-1 ring-primary/20"
                : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              onViewChange("thoughts");
            }}
          >
            {view === "thoughts" && (
              <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
            )}
            <Lightbulb className="h-4 w-4" />
            <span className="text-sm">Thoughts</span>
            {view === "thoughts" && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          
          <Separator className="my-3 bg-border/30" />

          {/* Section label */}
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Folders
          </div>

          {/* Root-level new folder - also serves as drop zone for moving folders to root */}
          {onAddFolder && !isLoadingFolders && (
            <button
              ref={rootDropZoneRef}
              type="button"
              onClick={() => onAddFolder(null)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-all duration-200 ${
                isRootDropTarget
                  ? "border-primary bg-primary/20 text-primary shadow-sm"
                  : "border-border/50 bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary backdrop-blur"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Folder
            </button>
          )}
          
          {/* Loading state - 5 skeleton folders */}
          {isLoadingFolders && (
            <div className="space-y-1.5 mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 flex-1" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {folderLoadError && !isLoadingFolders && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive mt-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{folderLoadError}</span>
            </div>
          )}

          {/* Folder hierarchy */}
          {!isLoadingFolders && !folderLoadError && (
            <div className="space-y-0.5 mt-2">
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  item={folder}
                  level={0}
                  onToggle={onFolderToggle}
                  onSelect={(item) => {
                    onViewChange("folders");
                    onNoteSelect(item);
                  }}
                    selectedId={selectedNote?.id || null}
                    editingNoteId={editingNoteId}
                    onAddFolder={onAddFolder}
                    onAddNote={onAddNote}
                    onEditFolder={onEditFolder}
                    onDeleteFolder={onDeleteFolder}
                    onDeleteNote={onDeleteNote}
                  onMoveFolder={onMoveFolder}
                  onMoveNote={onMoveNote}
                  allFolders={folders}
                  />
              ))}
            </div>
          )}

          {/* Uncategorised section for root-level notes */}
          {!isLoadingFolders && rootNotes.length > 0 && (
            <>
              <Separator className="my-3 bg-border/30" />
              <div className="space-y-0.5" ref={uncategorisedRef}>
                <div className={`text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  isRootDropTarget ? "bg-primary/20 text-primary" : ""
                }`}>
                  Uncategorised
                </div>
                {rootNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group h-8 ${
                      editingNoteId === note.id
                        ? "bg-primary/15 text-foreground font-medium shadow-sm ring-1 ring-primary/20"
                        : "text-foreground/70 hover:bg-muted/30 hover:text-foreground"
                    }`}
                    style={{ paddingLeft: '24px' }}
                    onClick={() => {
                      onNoteSelect({
                        id: note.id,
                        name: note.title,
                        type: "note",
                      });
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{note.title}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 tabular-nums">
                        {formatDate(note.updatedAt)}
                      </span>
                      {onDeleteNote && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
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
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

