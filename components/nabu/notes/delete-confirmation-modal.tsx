import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { FolderItem } from "./types";

/**
 * Props for the DeleteConfirmationModal component
 */
interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName: string;
  isDeleting: boolean;
  showMoveOption?: boolean;
  folders?: FolderItem[];
  selectedMoveFolder?: string | null;
  onMoveFolderChange?: (folderId: string | null) => void;
  moveAction?: "delete" | "move";
  onMoveActionChange?: (action: "delete" | "move") => void;
}

/**
 * Reusable confirmation modal for delete actions
 * Prevents accidental deletions with a confirmation step
 */
export function DeleteConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isDeleting,
  showMoveOption = false,
  folders = [],
  selectedMoveFolder = null,
  onMoveFolderChange,
  moveAction = "delete",
  onMoveActionChange,
}: DeleteConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {/* Item name display */}
        <div className="my-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm font-medium text-foreground break-words">{itemName}</p>
        </div>

        {/* Move contents option for folders with contents */}
        {showMoveOption && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>What would you like to do with the contents?</Label>
              <RadioGroup 
                value={moveAction} 
                onValueChange={(value) => onMoveActionChange?.(value as "delete" | "move")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delete" id="delete-contents" />
                  <Label htmlFor="delete-contents" className="font-normal cursor-pointer">
                    Delete all contents
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="move" id="move-contents" />
                  <Label htmlFor="move-contents" className="font-normal cursor-pointer">
                    Move to another folder
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {moveAction === "move" && (
              <div className="space-y-2">
                <Label htmlFor="target-folder">Target folder</Label>
                <Select 
                  value={selectedMoveFolder || ""} 
                  onValueChange={(value) => onMoveFolderChange?.(value || null)}
                >
                  <SelectTrigger id="target-folder">
                    <SelectValue placeholder="Select folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


