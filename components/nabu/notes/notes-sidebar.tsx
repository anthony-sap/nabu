import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Home } from "lucide-react";
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
  onAddFolder?: (parentId: string) => void;
  onAddNote?: (folderId: string) => void;
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
          <div className="p-3 space-y-1">
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
            
            {/* Folder hierarchy */}
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
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

