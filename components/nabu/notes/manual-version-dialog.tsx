/**
 * Manual Version Dialog Component
 * 
 * Allows users to create a manual version snapshot with an optional description
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

interface ManualVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  onVersionCreated?: () => void;
}

/**
 * Dialog for creating manual version snapshots
 */
export function ManualVersionDialog({
  open,
  onOpenChange,
  noteId,
  onVersionCreated,
}: ManualVersionDialogProps) {
  const [changesSummary, setChangesSummary] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handle form submission - create manual version
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCreating) return;

    setIsCreating(true);

    try {
      const response = await fetch(`/api/nabu/notes/${noteId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "manual",
          changesSummary: changesSummary.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create version");
      }

      toast.success("Version saved successfully");
      
      // Reset form
      setChangesSummary("");
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent
      onVersionCreated?.();
    } catch (error: any) {
      console.error("Error creating version:", error);
      toast.error(error.message || "Failed to save version");
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle dialog close - reset state
   */
  const handleClose = () => {
    if (!isCreating) {
      setChangesSummary("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Version
            </DialogTitle>
            <DialogDescription>
              Create a manual snapshot of this note. You can restore this version later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="changesSummary" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="changesSummary"
              placeholder="What changed in this version? (e.g., 'Added new section on project requirements')"
              value={changesSummary}
              onChange={(e) => setChangesSummary(e.target.value)}
              className="mt-2 min-h-[100px]"
              maxLength={500}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {changesSummary.length}/500 characters
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Version
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


