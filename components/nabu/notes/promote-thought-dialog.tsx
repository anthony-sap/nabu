"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Folder, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Folder option for selection
 */
interface FolderOption {
  id: string | null;
  name: string;
  color?: string;
}

/**
 * Props for PromoteThoughtDialog component
 */
interface PromoteThoughtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thoughtIds: string[]; // Single or multiple thought IDs
  thoughtPreviews?: Array<{ id: string; title: string; content: string }>; // Preview data
  onPromote: (thoughtIds: string[], folderId: string | null) => Promise<void>;
}

/**
 * Promote Thought Dialog Component
 * 
 * Allows users to select a folder before promoting thought(s) to note(s)
 * Supports both single and bulk promotion
 * 
 * Features:
 * - Folder selection dropdown
 * - Shows thought preview(s)
 * - Single or bulk mode
 * - Optional AI folder suggestion (future)
 */
export function PromoteThoughtDialog({
  open,
  onOpenChange,
  thoughtIds,
  thoughtPreviews = [],
  onPromote,
}: PromoteThoughtDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const isBulk = thoughtIds.length > 1;

  /**
   * Load user's folders when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadFolders();
    }
  }, [open]);

  /**
   * Load folders from API
   */
  const loadFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const response = await fetch('/api/nabu/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Flatten folder tree for selection
        const folderOptions: FolderOption[] = [
          { id: null, name: 'Uncategorised' },
          ...flattenFolders(data.data),
        ];
        setFolders(folderOptions);
        
        // Set default selection to Uncategorised (null)
        if (selectedFolderId === null) {
          setSelectedFolderId(null); // Explicitly set to null (Uncategorised)
        }
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  /**
   * Flatten nested folders for selection
   */
  const flattenFolders = (folders: any[], prefix = ''): FolderOption[] => {
    const result: FolderOption[] = [];
    
    for (const folder of folders) {
      result.push({
        id: folder.id,
        name: prefix + folder.name,
        color: folder.color,
      });
      
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, prefix + folder.name + ' / '));
      }
    }
    
    return result;
  };

  /**
   * Handle promotion
   */
  const handlePromote = async () => {
    console.log('🔍 DEBUG: Promoting with folderId:', selectedFolderId);
    console.log('🔍 DEBUG: folderId type:', typeof selectedFolderId);
    console.log('🔍 DEBUG: thoughtIds:', thoughtIds);
    
    setIsPromoting(true);

    try {
      await onPromote(thoughtIds, selectedFolderId);
      
      // Success - close dialog
      onOpenChange(false);
      
      // Reset selection
      setSelectedFolderId(null);
    } catch (error) {
      // Error is handled by parent
      console.error('Promotion failed:', error);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-none w-[95vw] sm:w-2/3 max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isBulk ? `Promote ${thoughtIds.length} Thoughts` : 'Promote Thought'}
            </DialogTitle>
            <DialogDescription>
              {isBulk 
                ? `Merge ${thoughtIds.length} thoughts into one note and choose where to organize it.`
                : 'Select a folder to organize your new note.'
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
          {/* Thought preview(s) */}
          {thoughtPreviews.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isBulk ? 'Thoughts to promote:' : 'Thought:'}
              </label>
              <ScrollArea className={isBulk ? "max-h-32" : ""}>
                <div className="space-y-2">
                  {thoughtPreviews.slice(0, isBulk ? 10 : 1).map((preview) => (
                    <div
                      key={preview.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {preview.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {preview.content}
                      </p>
                    </div>
                  ))}
                  {isBulk && thoughtPreviews.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {thoughtPreviews.length - 10} more
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Folder selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Choose folder
            </label>
            
            {isLoadingFolders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {folders.map((folder) => (
                  <button
                    key={folder.id || 'uncategorised'}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      selectedFolderId === folder.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <Folder 
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: folder.color || undefined }}
                    />
                    <span className="text-sm font-medium flex-1 truncate">
                      {folder.name}
                    </span>
                    {selectedFolderId === folder.id && (
                      <Badge variant="default" className="text-[10px]">
                        Selected
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPromoting}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePromote}
            disabled={isPromoting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            {isPromoting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Promoting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {isBulk ? `Promote ${thoughtIds.length} Thoughts` : 'Promote to Note'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



