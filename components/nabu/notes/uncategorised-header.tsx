"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Move, Sparkles, X } from "lucide-react";

/**
 * Mode types for uncategorised section
 */
export type UncategorisedMode = 'normal' | 'bulk' | 'auto';

/**
 * Props for UncategorisedHeader component
 */
interface UncategorisedHeaderProps {
  noteCount: number;
  selectedCount: number;
  mode: UncategorisedMode;
  onModeChange: (mode: UncategorisedMode) => void;
  isDragOver?: boolean;
}

/**
 * Header for the Uncategorised section with bulk organization options
 * 
 * Features:
 * - Shows note count
 * - Three-dot menu with Bulk Move / Auto-Move options
 * - Mode indicator when in bulk/auto mode
 * - Cancel button to exit modes
 */
export function UncategorisedHeader({
  noteCount,
  selectedCount,
  mode,
  onModeChange,
  isDragOver = false,
}: UncategorisedHeaderProps) {
  
  /**
   * Render based on current mode
   */
  if (mode === 'normal') {
    // Normal mode: Show title, count, and menu
    return (
      <div className={`group flex items-center justify-between px-3 py-1.5 rounded-lg transition-all duration-200 ${
        isDragOver ? "bg-primary/20 text-primary" : ""
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Uncategorised
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-muted/50">
            {noteCount}
          </Badge>
        </div>

        {/* Three-dot menu */}
        {noteCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onModeChange('bulk')}>
                <Move className="h-4 w-4 mr-2" />
                Bulk Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onModeChange('auto')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-Move
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  if (mode === 'bulk') {
    // Bulk move mode: Show selection count and cancel
    return (
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Bulk Move
          </span>
          <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">
            {selectedCount} / {noteCount} selected
          </Badge>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onModeChange('normal')}
          className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/20"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    );
  }

  if (mode === 'auto') {
    // Auto-move mode: Show selection count and cancel
    return (
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Auto-Move
          </span>
          <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">
            {selectedCount} / {noteCount}
          </Badge>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onModeChange('normal')}
          className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/20"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    );
  }

  return null;
}

