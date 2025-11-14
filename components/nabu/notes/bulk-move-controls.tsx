"use client";

import { Button } from "@/components/ui/button";
import { CheckSquare, Square } from "lucide-react";

/**
 * Props for BulkMoveControls component
 */
interface BulkMoveControlsProps {
  totalNotes: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

/**
 * Bulk Move Controls Component
 * 
 * Shows select all/deselect all buttons and instructions
 * Displayed when in bulk move mode
 */
export function BulkMoveControls({
  totalNotes,
  selectedCount,
  onSelectAll,
  onDeselectAll,
}: BulkMoveControlsProps) {
  const allSelected = selectedCount === totalNotes;

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Select/Deselect buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="h-7 text-xs"
        >
          {allSelected ? (
            <>
              <Square className="h-3.5 w-3.5 mr-1.5" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              Select All
            </>
          )}
        </Button>
      </div>

      {/* Instructions */}
      {selectedCount > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          Drag selected notes to a folder to move them
        </p>
      )}
    </div>
  );
}

