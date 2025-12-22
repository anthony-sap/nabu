/**
 * Version Preview Modal Component
 * 
 * Shows a read-only preview of a note version with metadata and restore option
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RotateCcw, Clock, User } from "lucide-react";
import { LexicalEditor } from "./lexical-editor";
import { formatDistanceToNow } from "date-fns";

interface VersionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  versionId: string | null;
  onRestore?: (versionId: string) => void;
}

interface VersionData {
  id: string;
  title: string;
  content: string;
  contentState: string | null;
  reason: string;
  versionNumber: number;
  changesSummary: string | null;
  createdAt: string;
  createdBy: string | null;
}

/**
 * Get badge variant based on version reason
 */
function getReasonBadgeVariant(reason: string): "default" | "secondary" | "outline" {
  switch (reason) {
    case "manual":
      return "default";
    case "restore":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Format version reason for display
 */
function formatReason(reason: string): string {
  switch (reason) {
    case "manual":
      return "Manual";
    case "autosave":
      return "Auto";
    case "restore":
      return "Restore";
    default:
      return reason;
  }
}

/**
 * Modal for previewing and restoring note versions
 */
export function VersionPreviewModal({
  open,
  onOpenChange,
  noteId,
  versionId,
  onRestore,
}: VersionPreviewModalProps) {
  const [version, setVersion] = useState<VersionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  /**
   * Load version data when modal opens or versionId changes
   */
  useEffect(() => {
    if (open && versionId) {
      loadVersion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, versionId]);

  /**
   * Load version details from API
   */
  const loadVersion = async () => {
    if (!versionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/nabu/notes/${noteId}/versions/${versionId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load version");
      }

      const { data } = await response.json();
      setVersion(data);
    } catch (error: any) {
      console.error("Error loading version:", error);
      toast.error(error.message || "Failed to load version");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle restore confirmation
   */
  const handleRestoreClick = () => {
    setShowRestoreConfirm(true);
  };

  /**
   * Handle restore action
   */
  const handleRestoreConfirm = async () => {
    if (!versionId) return;

    setIsRestoring(true);
    setShowRestoreConfirm(false);

    try {
      const response = await fetch(
        `/api/nabu/notes/${noteId}/versions/${versionId}/restore`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to restore version");
      }

      toast.success("Version restored successfully");
      onOpenChange(false);
      
      // Notify parent to refresh
      if (onRestore) {
        onRestore(versionId);
      }
    } catch (error: any) {
      console.error("Error restoring version:", error);
      toast.error(error.message || "Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isRestoring) {
      setVersion(null);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[95vw] w-full lg:max-w-6xl h-[90vh] flex flex-col p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
              <DialogTitle>
                {isLoading ? "Loading..." : `Version #${version?.versionNumber}`}
              </DialogTitle>
              <DialogDescription>
                {isLoading
                  ? "Fetching version details..."
                  : "Preview and restore this version"}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 flex-1">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : version ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6">
                {/* Version metadata */}
                <div className="flex items-center gap-3 pb-4 border-b flex-shrink-0">
                  <Badge variant={getReasonBadgeVariant(version.reason)}>
                    {formatReason(version.reason)}
                  </Badge>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {version.createdBy && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{version.createdBy}</span>
                    </div>
                  )}
                </div>

                {/* Changes summary if available */}
                {version.changesSummary && (
                  <div className="py-3 border-b flex-shrink-0">
                    <p className="text-sm text-muted-foreground">
                      <strong>Description:</strong> {version.changesSummary}
                    </p>
                  </div>
                )}

                {/* Version content - scrollable */}
                <ScrollArea className="flex-1 mt-4">
                  <div className="space-y-4 pr-4">
                    {/* Title */}
                    <div>
                      <h3 className="text-2xl font-semibold">{version.title}</h3>
                    </div>

                    {/* Content - read-only Lexical editor or plain text */}
                    <div className="prose prose-sm max-w-none">
                      {version.contentState ? (
                        <LexicalEditor
                          value={version.content}
                          editorState={version.contentState}
                          onChange={() => {}} // Read-only
                          placeholder=""
                          className="min-h-[300px] pointer-events-none opacity-90"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm">
                          {version.content}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground flex-1">
                Failed to load version
              </div>
            )}

            <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isRestoring}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleRestoreClick}
              disabled={isRestoring || !version}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore This Version
                </>
              )}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current note content with this version. Your
              current version will be saved as a backup, so you can undo this
              action later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


