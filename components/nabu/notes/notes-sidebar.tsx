import { useRef, useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, AlertCircle, FileText, Trash2, Loader2, ChevronDown, ChevronRight, Users, User } from "lucide-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { FolderItem } from "./folder-item";
import { FolderItem as FolderItemType, NoteItem } from "./types";
import { DragData } from "./drag-drop-utils";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { QuickThoughtTrigger } from "@/components/nabu/quick-thought-trigger";
import { UncategorisedHeader, UncategorisedMode } from "./uncategorised-header";
import { BulkMoveControls } from "./bulk-move-controls";
import { AutoMovePreview, AutoMoveSuggestions } from "./auto-move-preview";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Workspace data structure for sidebar
 */
interface WorkspaceSection {
  id: string;
  name: string;
  role: string;
  folders: FolderItemType[];
  uncategorisedNotes: NoteItem[];
}

/**
 * Props for the NotesSidebar component
 */
interface NotesSidebarProps {
  folders: FolderItemType[];
  rootNotes: NoteItem[];
  workspaces?: WorkspaceSection[]; // Workspace sections with their folders
  view: "feed" | "folders" | "editor";
  selectedNote: FolderItemType | null;
  editingNoteId?: string | null;
  onViewChange: (view: "feed" | "folders" | "editor") => void;
  onFolderToggle: (id: string) => void;
  onNoteSelect: (item: FolderItemType) => void;
  onAddFolder?: (parentId: string | null, workspaceId?: string | null) => void;
  onAddNote?: (folderId: string, workspaceId?: string | null) => void;
  onQuickNote?: () => void; // Callback to create a quick note
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null, workspaceId?: string | null) => void;
  onMoveNote?: (noteId: string, newFolderId: string | null, workspaceId?: string | null) => void;
  onRefreshFolders?: () => Promise<void>; // Callback to refresh folder tree and root notes
  isLoadingFolders?: boolean;
  folderLoadError?: string | null;
  // Section expand/collapse state
  expandedSections?: Set<string>; // 'personal' | workspace IDs
  onSectionToggle?: (sectionId: string) => void;
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
 * Draggable note component for uncategorised section
 */
function UncategorisedNote({
  note,
  editingNoteId,
  onNoteSelect,
  onDeleteNote,
  showCheckbox = false,
  isSelected = false,
  onToggleSelection,
  selectedNoteIds = [],
}: {
  note: NoteItem;
  editingNoteId?: string | null;
  onNoteSelect: (item: FolderItemType) => void;
  onDeleteNote?: (noteId: string) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (noteId: string) => void;
  selectedNoteIds?: string[];
}) {
  const noteRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Setup drag functionality for this note
  useEffect(() => {
    const element = noteRef.current;
    if (!element) return;

    const cleanup = draggable({
      element,
      getInitialData: () => {
        // If in bulk mode and this note is selected, include all selected notes
        const noteIdsToMove = showCheckbox && isSelected && selectedNoteIds.length > 0
          ? selectedNoteIds
          : [note.id];

        const dragData: DragData = {
          type: "note",
          id: note.id,
          name: selectedNoteIds.length > 1 ? `${selectedNoteIds.length} notes` : note.title,
          folderId: null,
          // Custom data for bulk move
          bulkMoveNoteIds: noteIdsToMove.length > 1 ? noteIdsToMove : undefined,
        };
        return dragData;
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    return cleanup;
  }, [note.id, note.title, showCheckbox, isSelected, selectedNoteIds]);

  return (
    <div
      ref={noteRef}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group h-8 ${
        editingNoteId === note.id
          ? "bg-primary/15 text-foreground font-medium shadow-sm ring-1 ring-primary/20"
          : isDragging
          ? "opacity-50"
          : isSelected
          ? "bg-primary/10 border border-primary/30"
          : "text-foreground/70 hover:bg-muted/30 hover:text-foreground"
      }`}
      style={{ paddingLeft: showCheckbox ? '12px' : '24px' }}
      onClick={() => {
        if (showCheckbox && onToggleSelection) {
          onToggleSelection(note.id);
        } else {
          onNoteSelect({
            id: note.id,
            name: note.title,
            type: "note",
          });
        }
      }}
    >
      {/* Checkbox in bulk/auto mode */}
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection?.(note.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary cursor-pointer"
        />
      )}
      
      <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-sm flex-1 truncate">{note.title}</span>
      <div className="flex items-center gap-1">
        {!showCheckbox && (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 tabular-nums">
            {formatDate(note.updatedAt)}
          </span>
        )}
        {!showCheckbox && onDeleteNote && (
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
  );
}

/**
 * Sidebar component for notes navigation
 * Displays feed/folder navigation and hierarchical folder structure
 */
export function NotesSidebar({
  folders,
  rootNotes,
  workspaces = [],
  view,
  selectedNote,
  editingNoteId,
  onViewChange,
  onFolderToggle,
  onNoteSelect,
  onAddFolder,
  onAddNote,
  onQuickNote,
  onEditFolder,
  onDeleteFolder,
  onDeleteNote,
  onMoveFolder,
  onMoveNote,
  onRefreshFolders,
  isLoadingFolders,
  folderLoadError,
  expandedSections = new Set(['personal']),
  onSectionToggle,
}: NotesSidebarProps) {
  const router = useRouter();
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);
  const uncategorisedRef = useRef<HTMLDivElement>(null);
  const rootDropZoneRef = useRef<HTMLButtonElement>(null);
  
  // Uncategorised section modes and state
  const [uncategorisedMode, setUncategorisedMode] = useState<UncategorisedMode>('normal');
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [autoMoveSuggestions, setAutoMoveSuggestions] = useState<AutoMoveSuggestions | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAutoMovePreview, setShowAutoMovePreview] = useState(false);

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

  /**
   * Handle mode change for uncategorised section
   */
  const handleModeChange = async (newMode: UncategorisedMode) => {
    if (newMode === 'normal') {
      // Exiting mode - clear selection
      setSelectedNoteIds(new Set());
      setAutoMoveSuggestions(null);
      setShowAutoMovePreview(false);
    } else if (newMode === 'auto') {
      // Entering auto mode - select all notes initially
      setSelectedNoteIds(new Set(rootNotes.map(n => n.id)));
    }
    setUncategorisedMode(newMode);
  };

  /**
   * Toggle selection of a note
   */
  const handleToggleSelection = (noteId: string) => {
    const newSet = new Set(selectedNoteIds);
    if (newSet.has(noteId)) {
      newSet.delete(noteId);
    } else {
      newSet.add(noteId);
    }
    setSelectedNoteIds(newSet);
  };

  /**
   * Select all uncategorised notes
   */
  const handleSelectAll = () => {
    setSelectedNoteIds(new Set(rootNotes.map(n => n.id)));
  };

  /**
   * Deselect all notes
   */
  const handleDeselectAll = () => {
    setSelectedNoteIds(new Set());
  };

  /**
   * Trigger auto-move analysis
   */
  const handleAnalyzeAutoMove = async () => {
    if (selectedNoteIds.size === 0) {
      toast.error("Please select at least one note");
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/nabu/notes/auto-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteIds: Array.from(selectedNoteIds),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to analyze notes");
      }

      setAutoMoveSuggestions(result.data);
      setShowAutoMovePreview(true);
    } catch (error) {
      console.error("Failed to analyze auto-move:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze notes"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Execute auto-move with suggestions
   */
  const handleExecuteAutoMove = async (moves: Array<{
    noteId: string;
    folderId?: string;
    createFolder?: { name: string; color: string };
  }>) => {
    try {
      const response = await fetch("/api/nabu/notes/execute-auto-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to execute auto-move");
      }

      toast.success(result.message || "Notes organized successfully!");
      
      // Reset state
      setUncategorisedMode('normal');
      setSelectedNoteIds(new Set());
      setAutoMoveSuggestions(null);
      setShowAutoMovePreview(false);
      
      // Refresh folder tree and root notes
      if (onRefreshFolders) {
        await onRefreshFolders();
      } else {
        // Fallback to router refresh if callback not provided
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to execute auto-move:", error);
      throw error; // Re-throw so preview can handle it
    }
  };

  return (
    <div className="w-80 flex-shrink-0 h-full border-r border-border/30 backdrop-blur-xl bg-background/40 flex flex-col">
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
        
        {/* Quick Note Button */}
        {onQuickNote && (
          <Button
            onClick={onQuickNote}
            className="w-full mt-2 justify-start gap-2 bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200"
            size="sm"
          >
            <FileText className="h-4 w-4" />
            <span className="flex-1 text-left">Quick Note</span>
          </Button>
        )}
      </div>
      
      {/* Navigation content */}
      <ScrollArea >
        <div className="p-3 pb-6 space-y-1 ">
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

          <Separator className="my-3 bg-border/30" />

          {/* Loading state */}
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

          {/* Personal Section */}
          {!isLoadingFolders && !folderLoadError && (
            <div className="space-y-0.5">
              {/* Personal section header - collapsible */}
              <button
                type="button"
                onClick={() => onSectionToggle?.('personal')}
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all duration-200 group"
              >
                {expandedSections.has('personal') ? (
                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                )}
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary flex-1 text-left">Personal</span>
                <span className="text-xs text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                  {folders.length + rootNotes.length}
                </span>
              </button>

              {/* Personal folders and notes - shown when expanded */}
              {expandedSections.has('personal') && (
                <div className="pl-2">
                  {/* New folder button */}
                  {onAddFolder && (
                    <button
                      ref={rootDropZoneRef}
                      type="button"
                      onClick={() => onAddFolder(null, null)}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 mb-1 ${
                        isRootDropTarget
                          ? "border-primary bg-primary/20 text-primary shadow-sm"
                          : "border-primary/40 bg-primary/5 text-primary/80 hover:border-primary hover:bg-primary/15 hover:text-primary"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      New Folder
                    </button>
                  )}

                  {/* Personal folder hierarchy */}
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
                        editingNoteId={editingNoteId}
                        onAddFolder={onAddFolder ? (parentId) => onAddFolder(parentId, null) : undefined}
                        onAddNote={onAddNote ? (folderId) => onAddNote(folderId, null) : undefined}
                        onEditFolder={onEditFolder}
                        onDeleteFolder={onDeleteFolder}
                        onDeleteNote={onDeleteNote}
                        onMoveFolder={onMoveFolder ? (folderId, newParentId) => onMoveFolder(folderId, newParentId, null) : undefined}
                        onMoveNote={onMoveNote ? (noteId, newFolderId) => onMoveNote(noteId, newFolderId, null) : undefined}
                        allFolders={folders}
                      />
                    ))}
                  </div>

                  {/* Personal Uncategorised section */}
                  <div className="space-y-0.5 mt-2">
                    <div className="group">
                      <UncategorisedHeader
                        noteCount={rootNotes.length}
                        selectedCount={selectedNoteIds.size}
                        mode={uncategorisedMode}
                        onModeChange={handleModeChange}
                        isDragOver={isRootDropTarget}
                      />
                    </div>

                    {/* Bulk move controls */}
                    {uncategorisedMode === 'bulk' && rootNotes.length > 0 && (
                      <BulkMoveControls
                        totalNotes={rootNotes.length}
                        selectedCount={selectedNoteIds.size}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                      />
                    )}

                    {/* Auto-move controls */}
                    {uncategorisedMode === 'auto' && rootNotes.length > 0 && (
                      <div className="px-3 py-2 space-y-2">
                        <BulkMoveControls
                          totalNotes={rootNotes.length}
                          selectedCount={selectedNoteIds.size}
                          onSelectAll={handleSelectAll}
                          onDeselectAll={handleDeselectAll}
                        />
                        <Button
                          size="sm"
                          onClick={handleAnalyzeAutoMove}
                          disabled={selectedNoteIds.size === 0 || isAnalyzing}
                          className="w-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              Analyze & Move
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Notes list with drag target */}
                    <div ref={uncategorisedRef}>
                      {rootNotes.length > 0 ? (
                        rootNotes.map((note) => (
                          <UncategorisedNote
                            key={note.id}
                            note={note}
                            editingNoteId={editingNoteId}
                            onNoteSelect={onNoteSelect}
                            onDeleteNote={onDeleteNote}
                            showCheckbox={uncategorisedMode !== 'normal'}
                            isSelected={selectedNoteIds.has(note.id)}
                            onToggleSelection={handleToggleSelection}
                            selectedNoteIds={Array.from(selectedNoteIds)}
                          />
                        ))
                      ) : (
                        <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                          No uncategorised notes
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workspace Sections */}
          {!isLoadingFolders && !folderLoadError && workspaces.map((workspace) => (
            <div key={workspace.id} className="space-y-0.5 mt-2">
              {/* Workspace section header - collapsible */}
              <button
                type="button"
                onClick={() => onSectionToggle?.(workspace.id)}
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all duration-200 group"
              >
                {expandedSections.has(workspace.id) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
                )}
                <Users className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-500 flex-1 text-left truncate">
                  {workspace.name}
                </span>
                <span className="text-xs text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {workspace.folders.length + workspace.uncategorisedNotes.length}
                </span>
              </button>

              {/* Workspace folders and notes - shown when expanded */}
              {expandedSections.has(workspace.id) && (
                <div className="pl-2">
                  {/* New folder button for workspace */}
                  {onAddFolder && (
                    <button
                      type="button"
                      onClick={() => onAddFolder(null, workspace.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 mb-1 border-amber-500/40 bg-amber-500/5 text-amber-500/80 hover:border-amber-500 hover:bg-amber-500/15 hover:text-amber-500"
                    >
                      <Sparkles className="h-3 w-3" />
                      New Folder
                    </button>
                  )}

                  {/* Workspace folder hierarchy */}
                  <div className="space-y-0.5">
                    {workspace.folders.map((folder) => (
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
                        onAddFolder={onAddFolder ? (parentId) => onAddFolder(parentId, workspace.id) : undefined}
                        onAddNote={onAddNote ? (folderId) => onAddNote(folderId, workspace.id) : undefined}
                        onEditFolder={onEditFolder}
                        onDeleteFolder={onDeleteFolder}
                        onDeleteNote={onDeleteNote}
                        onMoveFolder={onMoveFolder ? (folderId, newParentId) => onMoveFolder(folderId, newParentId, workspace.id) : undefined}
                        onMoveNote={onMoveNote ? (noteId, newFolderId) => onMoveNote(noteId, newFolderId, workspace.id) : undefined}
                        allFolders={workspace.folders}
                      />
                    ))}
                  </div>

                  {/* Workspace Uncategorised section */}
                  <div className="space-y-0.5 mt-2">
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Uncategorised
                      <span className="ml-auto text-xs opacity-70">
                        {workspace.uncategorisedNotes.length}
                      </span>
                    </div>
                    {workspace.uncategorisedNotes.length > 0 ? (
                      workspace.uncategorisedNotes.map((note) => (
                        <UncategorisedNote
                          key={note.id}
                          note={note}
                          editingNoteId={editingNoteId}
                          onNoteSelect={onNoteSelect}
                          onDeleteNote={onDeleteNote}
                        />
                      ))
                    ) : (
                      <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                        No uncategorised notes
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Auto-move preview dialog */}
      <AutoMovePreview
        open={showAutoMovePreview}
        onOpenChange={setShowAutoMovePreview}
        suggestions={autoMoveSuggestions}
        noteDetails={new Map(rootNotes.map(n => [n.id, { id: n.id, title: n.title }]))}
        onExecute={handleExecuteAutoMove}
      />
    </div>
  );
}

