"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Folder, FolderPlus, Sparkles, Loader2, Check, X, Edit2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Auto-move suggestion data structure
 */
export interface AutoMoveSuggestions {
  suggestions: {
    existingFolders: Array<{
      folderId: string;
      folderName: string;
      noteIds: string[];
      confidence: number;
    }>;
    newFolders: Array<{
      suggestedName: string;
      noteIds: string[];
      confidence: number;
      color?: string;
    }>;
  };
  analysis: {
    totalNotes: number;
    toExisting: number;
    toNew: number;
  };
}

/**
 * Props for AutoMovePreview component
 */
interface AutoMovePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AutoMoveSuggestions | null;
  noteDetails: Map<string, { id: string; title: string }>; // Map of noteId to note info
  onExecute: (moves: Array<{
    noteId: string;
    folderId?: string;
    createFolder?: { name: string; color: string };
  }>) => Promise<void>;
}

/**
 * Auto-Move Preview Dialog Component
 * 
 * Shows AI-generated suggestions for organizing uncategorised notes
 * Allows users to review, edit, and execute bulk moves
 * 
 * Features:
 * - Grouped by destination (existing folders vs new folders)
 * - Shows note titles and counts
 * - Editable folder names for new folders
 * - Individual suggestion accept/reject
 * - Batch execution with progress
 */
export function AutoMovePreview({
  open,
  onOpenChange,
  suggestions,
  noteDetails,
  onExecute,
}: AutoMovePreviewProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [editingNewFolder, setEditingNewFolder] = useState<number | null>(null);
  const [newFolderNames, setNewFolderNames] = useState<Map<number, string>>(new Map());
  const [rejectedGroups, setRejectedGroups] = useState<Set<string>>(new Set());

  if (!suggestions) return null;

  const { existingFolders, newFolders } = suggestions.suggestions;

  /**
   * Handle executing all accepted moves
   */
  const handleExecute = async () => {
    setIsExecuting(true);

    try {
      const moves: Array<{
        noteId: string;
        folderId?: string;
        createFolder?: { name: string; color: string };
      }> = [];

      // Add moves to existing folders
      existingFolders.forEach((folder) => {
        const groupKey = `existing-${folder.folderId}`;
        if (!rejectedGroups.has(groupKey)) {
          folder.noteIds.forEach((noteId) => {
            moves.push({
              noteId,
              folderId: folder.folderId,
            });
          });
        }
      });

      // Add moves to new folders
      newFolders.forEach((folder, index) => {
        const groupKey = `new-${index}`;
        if (!rejectedGroups.has(groupKey)) {
          const folderName = newFolderNames.get(index) || folder.suggestedName;
          folder.noteIds.forEach((noteId) => {
            moves.push({
              noteId,
              createFolder: {
                name: folderName,
                color: folder.color || "#00B3A6", // Default mint color
              },
            });
          });
        }
      });

      if (moves.length === 0) {
        toast.error("No moves selected");
        return;
      }

      // Execute moves via parent callback
      await onExecute(moves);

      // Success - close dialog
      onOpenChange(false);
      
      // Reset state
      setNewFolderNames(new Map());
      setRejectedGroups(new Set());
      setEditingNewFolder(null);
    } catch (error) {
      console.error("Failed to execute auto-move:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to move notes"
      );
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Toggle rejection of a suggestion group
   */
  const toggleReject = (groupKey: string) => {
    const newSet = new Set(rejectedGroups);
    if (newSet.has(groupKey)) {
      newSet.delete(groupKey);
    } else {
      newSet.add(groupKey);
    }
    setRejectedGroups(newSet);
  };

  /**
   * Update new folder name
   */
  const updateFolderName = (index: number, name: string) => {
    const newMap = new Map(newFolderNames);
    newMap.set(index, name);
    setNewFolderNames(newMap);
  };

  const totalAccepted = 
    existingFolders.reduce((sum, f) => rejectedGroups.has(`existing-${f.folderId}`) ? sum : sum + f.noteIds.length, 0) +
    newFolders.reduce((sum, f, i) => rejectedGroups.has(`new-${i}`) ? sum : sum + f.noteIds.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Auto-Move Preview
            </DialogTitle>
            <DialogDescription>
              AI analyzed {suggestions.analysis.totalNotes} notes and grouped them by similarity.
              Review and adjust the suggestions below.
            </DialogDescription>
          </DialogHeader>

          {/* Summary stats */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                To existing: <span className="font-semibold text-foreground">{suggestions.analysis.toExisting}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                To new: <span className="font-semibold text-foreground">{suggestions.analysis.toNew}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Existing folders section */}
            {existingFolders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Move to Existing Folders
                </h3>

                {existingFolders.map((folder) => {
                  const groupKey = `existing-${folder.folderId}`;
                  const isRejected = rejectedGroups.has(groupKey);

                  return (
                    <div
                      key={folder.folderId}
                      className={`relative p-4 rounded-lg border transition-all ${
                        isRejected
                          ? "bg-muted/30 border-border/40 opacity-60"
                          : "bg-background/60 border-border/60 hover:border-primary/50"
                      }`}
                    >
                      {/* Folder header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{folder.folderName}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {folder.noteIds.length} {folder.noteIds.length === 1 ? 'note' : 'notes'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {folder.confidence}% confident
                            </Badge>
                          </div>
                        </div>

                        {/* Toggle rejection */}
                        <Button
                          size="sm"
                          variant={isRejected ? "outline" : "ghost"}
                          onClick={() => toggleReject(groupKey)}
                          className="h-7 px-2 text-xs"
                        >
                          {isRejected ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Include
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Skip
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Note list */}
                      <div className="space-y-1 text-xs text-muted-foreground pl-4">
                        {folder.noteIds.slice(0, 3).map((noteId) => (
                          <div key={noteId} className="truncate">
                            • {noteDetails.get(noteId)?.title || 'Untitled'}
                          </div>
                        ))}
                        {folder.noteIds.length > 3 && (
                          <div className="text-[11px] italic">
                            + {folder.noteIds.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New folders section */}
            {newFolders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Create New Folders
                </h3>

                {newFolders.map((folder, index) => {
                  const groupKey = `new-${index}`;
                  const isRejected = rejectedGroups.has(groupKey);
                  const isEditing = editingNewFolder === index;
                  const displayName = newFolderNames.get(index) || folder.suggestedName;

                  return (
                    <div
                      key={index}
                      className={`relative p-4 rounded-lg border transition-all ${
                        isRejected
                          ? "bg-muted/30 border-border/40 opacity-60"
                          : "bg-primary/5 border-primary/30 hover:border-primary/50"
                      }`}
                    >
                      {/* Folder header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={displayName}
                                  onChange={(e) => updateFolderName(index, e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onBlur={() => setEditingNewFolder(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setEditingNewFolder(null);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <>
                                <span className="font-medium text-foreground">{displayName}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingNewFolder(index)}
                                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {folder.noteIds.length} {folder.noteIds.length === 1 ? 'note' : 'notes'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {folder.confidence}% confident
                            </Badge>
                          </div>
                        </div>

                        {/* Toggle rejection */}
                        <Button
                          size="sm"
                          variant={isRejected ? "outline" : "ghost"}
                          onClick={() => toggleReject(groupKey)}
                          className="h-7 px-2 text-xs"
                        >
                          {isRejected ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Include
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Skip
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Note list */}
                      <div className="space-y-1 text-xs text-muted-foreground pl-4">
                        {folder.noteIds.slice(0, 3).map((noteId) => (
                          <div key={noteId} className="truncate">
                            • {noteDetails.get(noteId)?.title || 'Untitled'}
                          </div>
                        ))}
                        {folder.noteIds.length > 3 && (
                          <div className="text-[11px] italic">
                            + {folder.noteIds.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {totalAccepted} {totalAccepted === 1 ? 'note' : 'notes'} will be moved
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isExecuting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isExecuting || totalAccepted === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Accept All Suggestions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

