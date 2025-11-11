import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Home, AlertCircle } from "lucide-react";
import { FolderItem } from "./folder-item";
import { FolderItem as FolderItemType } from "./types";

/**
 * Props for the NotesSidebar component
 */
interface NotesSidebarProps {
  folders: FolderItemType[];
  view: "feed" | "folders";
  selectedNote: FolderItemType | null;
  onViewChange: (view: "feed" | "folders") => void;
  onFolderToggle: (id: string) => void;
  onNoteSelect: (item: FolderItemType) => void;
  onAddFolder?: (parentId: string | null) => void;
  onAddNote?: (folderId: string) => void;
  onEditFolder?: (folderId: string) => void;
  isLoadingFolders?: boolean;
  folderLoadError?: string | null;
}

/**
 * Sidebar component for notes navigation
 * Displays feed/folder navigation and hierarchical folder structure
 */
export function NotesSidebar({
  folders,
  view,
  selectedNote,
  onViewChange,
  onFolderToggle,
  onNoteSelect,
  onAddFolder,
  onAddNote,
  onEditFolder,
  isLoadingFolders,
  folderLoadError,
}: NotesSidebarProps) {
  return (
    <div className="w-72 flex-shrink-0 h-full border-r border-border/20 flex flex-col">
   
      
      {/* Navigation content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Feed navigation option */}
          <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors ${
              view === "feed"
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              onViewChange("feed");
            }}
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">Feed</span>
          </div>
          
          <Separator className="my-2 bg-border/20" />

          {/* Root-level new folder */}
          {onAddFolder && !isLoadingFolders && (
            <button
              type="button"
              onClick={() => onAddFolder(null)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border/40 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
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
                  onAddFolder={onAddFolder}
                  onAddNote={onAddNote}
                  onEditFolder={onEditFolder}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

