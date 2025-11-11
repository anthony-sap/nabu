import { Card, CardHeader } from "@/components/ui/card";
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
    <div className="w-72 flex-shrink-0">
      <Card className="h-full bg-card border-border shadow-nabu-card flex flex-col">
        {/* Header */}
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-serif font-bold text-lg text-foreground">Knowledge Hub</h2>
          </div>
          <p className="text-xs text-muted-foreground">Explore feed or browse notes</p>
        </CardHeader>
        
        {/* Navigation content */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {/* Feed navigation option */}
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                view === "feed"
                  ? "bg-primary/15 text-primary font-medium border border-primary/20 shadow-sm"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                onViewChange("feed");
              }}
            >
              <Home className="h-4 w-4" />
              <span className="text-sm">Feed</span>
            </div>
            
            <Separator className="my-3 bg-border/50" />

            {/* Root-level new folder */}
            {onAddFolder && !isLoadingFolders && (
              <button
                type="button"
                onClick={() => onAddFolder(null)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary/15"
              >
                <Sparkles className="h-3.5 w-3.5" />
                New Folder
              </button>
            )}
            
            {/* Loading state - 5 skeleton folders */}
            {isLoadingFolders && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {folderLoadError && !isLoadingFolders && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{folderLoadError}</span>
              </div>
            )}

            {/* Folder hierarchy */}
            {!isLoadingFolders && !folderLoadError && (
              <div className="space-y-0.5">
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
      </Card>
    </div>
  );
}

