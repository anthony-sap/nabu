import { useRef, useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Home, AlertCircle, FileText, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { FolderItem } from "./folder-item";
import { FolderItem as FolderItemType, NoteItem } from "./types";
import { DragData } from "./drag-drop-utils";
import { QuickThoughtTrigger } from "@/components/nabu/quick-thought-trigger";
import { Search } from "lucide-react";
import { UncategorisedHeader, UncategorisedMode } from "./uncategorised-header";
import { BulkMoveControls } from "./bulk-move-controls";
import { AutoMovePreview, AutoMoveSuggestions } from "./auto-move-preview";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Props for the NotesSidebar component
 */
interface NotesSidebarProps {
  personalFolders: FolderItemType[];
  personalUncategorisedNotes: NoteItem[];
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    folders: FolderItemType[];
    uncategorisedNotes: NoteItem[];
  }>;
  expandedSections: Record<string, boolean>; // 'personal', 'workspace-{id}'
  onSectionToggle: (sectionId: string, expanded: boolean) => void;
  view: "feed" | "folders" | "editor";
  selectedNote: FolderItemType | null;
  editingNoteId?: string | null;
  onViewChange: (view: "feed" | "folders" | "editor") => void;
  onFolderToggle: (id: string) => void;
  onNoteSelect: (item: FolderItemType) => void;
  onAddFolder?: (parentId: string | null, workspaceId?: string | null) => void;
  onAddNote?: (folderId: string) => void;
  onQuickNote?: () => void; // Callback to create a quick note
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null, newWorkspaceId?: string | null) => void;
  onMoveNote?: (noteId: string, newFolderId: string | null, newWorkspaceId?: string | null) => void;
  onRefreshFolders?: () => Promise<void>; // Callback to refresh folder tree and root notes
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
  personalFolders,
  personalUncategorisedNotes,
  workspaces,
  expandedSections,
  onSectionToggle,
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
      setSelectedNoteIds(new Set(personalUncategorisedNotes.map(n => n.id)));
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
    setSelectedNoteIds(new Set(personalUncategorisedNotes.map(n => n.id)));
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
    // Layer 3: The Lens - Glass sidebar catches atmosphere colors
    <div className="w-80 flex-shrink-0 h-full flex flex-col
                     dark:bg-[#071633]/30 
                    
                    ">
      {/* Top branding and controls */}
      <div className="flex-shrink-0 px-4 py-4 ">
        {/* Logo and search row */}
        <div className="flex items-center justify-between mb-4">
          {/* Logo and brand */}
          
          
        
        </div>
        
        {/* Quick Thought Trigger */}
        <QuickThoughtTrigger />
        
        {/* Quick Note Button - Primary Action */}
        {onQuickNote && (
          <button
            onClick={onQuickNote}
            className="w-full mt-3 flex items-center justify-center gap-2 
                       bg-nabu-mint text-white font-bold text-sm
                       rounded-xl py-2.5 px-5
                       shadow-lg shadow-nabu-mint/20
                       hover:bg-nabu-mint/90 hover:scale-[1.02]
                       transition-all"
          >
            <FileText className="h-4 w-4" />
            <span>Quick Note</span>
          </button>
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
                : "hover:bg-white/30 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
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

          <Separator className="my-3 bg-white/20 dark:bg-white/10" />

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

          {/* Personal section - collapsible */}
          {!isLoadingFolders && !folderLoadError && (
            <Collapsible
              open={expandedSections.personal ?? true}
              onOpenChange={(open) => onSectionToggle('personal', open)}
            >
              <CollapsibleTrigger className="w-full group">
                <div className="flex items-center gap-1.5 px-2 py-2 cursor-pointer transition-colors">
                  {expandedSections.personal ?? true ? (
                    <ChevronDown className="h-3 w-3 text-nabu-deep/40 dark:text-white/40 group-hover:text-nabu-deep dark:group-hover:text-white transition-colors" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-nabu-deep/40 dark:text-white/40 group-hover:text-nabu-deep dark:group-hover:text-white transition-colors" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nabu-deep/40 dark:text-white/40 group-hover:text-nabu-deep dark:group-hover:text-white transition-colors">Personal</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-1 pr-3 py-2 space-y-2">
                  {/* New Folder button for Personal */}
                  {onAddFolder && (
                    <button
                      type="button"
                      onClick={() => onAddFolder(null, null)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium
                                 border border-dashed border-nabu-deep/30 dark:border-white/20
                                 text-nabu-deep/40 dark:text-white/40
                                 hover:border-nabu-mint dark:hover:border-nabu-mint
                                 hover:text-nabu-mint dark:hover:text-nabu-mint
                                 hover:bg-transparent
                                 transition-all duration-200"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      New Folder
                    </button>
                  )}

                  {/* Personal folders */}
                  <div className="space-y-0.5">
                    {personalFolders.map((folder) => (
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
                        allFolders={personalFolders}
                      />
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Workspace sections - collapsible */}
          {!isLoadingFolders && !folderLoadError && workspaces.map((workspace) => {
            const sectionId = `workspace-${workspace.id}`;
            const isExpanded = expandedSections[sectionId] ?? true;
            
            return (
              <Collapsible
                key={workspace.id}
                open={isExpanded}
                onOpenChange={(open) => onSectionToggle(sectionId, open)}
              >
                <CollapsibleTrigger className="w-full group mt-3">
                  <div className="flex items-center gap-1.5 px-2 py-2 cursor-pointer transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-nabu-deep/40 dark:text-white/40 group-hover:text-nabu-deep dark:group-hover:text-white transition-colors" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-nabu-deep/40 dark:text-white/40 group-hover:text-nabu-deep dark:group-hover:text-white transition-colors" />
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-widest text-nabu-deep/40 dark:text-white/40 group-hover:text-nabu-deep dark:group-hover:text-white transition-colors">{workspace.name}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-1 pr-3 py-2 space-y-2">
                    {/* New Folder button for Workspace */}
                    {onAddFolder && (
                      <button
                        type="button"
                        onClick={() => onAddFolder(null, workspace.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium
                                   border border-dashed border-nabu-deep/30 dark:border-white/20
                                   text-nabu-deep/40 dark:text-white/40
                                   hover:border-nabu-mint dark:hover:border-nabu-mint
                                   hover:text-nabu-mint dark:hover:text-nabu-mint
                                   hover:bg-transparent
                                   transition-all duration-200"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        New Folder
                      </button>
                    )}

                    {/* Workspace folders */}
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
                          onAddFolder={onAddFolder}
                          onAddNote={onAddNote}
                          onEditFolder={onEditFolder}
                          onDeleteFolder={onDeleteFolder}
                          onDeleteNote={onDeleteNote}
                          onMoveFolder={onMoveFolder}
                          onMoveNote={onMoveNote}
                          allFolders={workspace.folders}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Uncategorised section - moved to bottom */}
          {!isLoadingFolders && (
            <>
              <Separator className="my-3 bg-white/20 dark:bg-white/10" />
              <div className="space-y-0.5">
                {/* Header with mode switcher */}
                <div className="group">
                  <UncategorisedHeader
                    noteCount={personalUncategorisedNotes.length}
                    selectedCount={selectedNoteIds.size}
                    mode={uncategorisedMode}
                    onModeChange={handleModeChange}
                    isDragOver={isRootDropTarget}
                  />
                </div>

                {/* Bulk move controls */}
                {uncategorisedMode === 'bulk' && personalUncategorisedNotes.length > 0 && (
                  <BulkMoveControls
                    totalNotes={personalUncategorisedNotes.length}
                    selectedCount={selectedNoteIds.size}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                )}

                {/* Auto-move controls */}
                {uncategorisedMode === 'auto' && personalUncategorisedNotes.length > 0 && (
                  <div className="px-3 py-2 space-y-2">
                    <BulkMoveControls
                      totalNotes={personalUncategorisedNotes.length}
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

                {/* Notes list with drag target - always render drop zone */}
                <div ref={uncategorisedRef}>
                  {personalUncategorisedNotes.length > 0 ? (
                    personalUncategorisedNotes.map((note) => (
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
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No uncategorised notes
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Auto-move preview dialog */}
      <AutoMovePreview
        open={showAutoMovePreview}
        onOpenChange={setShowAutoMovePreview}
        suggestions={autoMoveSuggestions}
        noteDetails={new Map(personalUncategorisedNotes.map(n => [n.id, { id: n.id, title: n.title }]))}
        onExecute={handleExecuteAutoMove}
      />
    </div>
  );
}

