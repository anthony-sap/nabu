"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Loader2, Search, Plus } from "lucide-react";
import { toast } from "sonner";

/**
 * Props for AddTagDialog
 */
interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  onTagAdded: (tags: any[]) => void;
}

/**
 * Tag item for selection
 */
interface TagItem {
  id: string;
  value: string;
  color?: string;
}

/**
 * Dialog for manually adding tags to notes
 * Fetches available tags from the mentions API and allows creating new tags
 */
export function AddTagDialog({ open, onOpenChange, noteId, onTagAdded }: AddTagDialogProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [filteredTags, setFilteredTags] = useState<TagItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Fetch available tags when dialog opens
   */
  useEffect(() => {
    if (open) {
      fetchTags();
      setSearchQuery("");
      setSelectedTagId(null);
    }
  }, [open]);

  /**
   * Filter tags based on search query
   */
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTags(tags);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTags(
        tags.filter((tag) =>
          tag.value.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, tags]);

  /**
   * Fetch tags from mentions API
   */
  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/nabu/mentions");

      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const result = await response.json();
      const availableTags = result.data.tags || [];
      
      setTags(availableTags);
      setFilteredTags(availableTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Failed to load tags");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle adding the selected or new tag
   */
  const handleAddTag = async (tagName?: string) => {
    // Determine tag name: either from parameter (new tag) or from selected tag
    const nameToAdd = tagName || tags.find(t => t.id === selectedTagId)?.value;
    
    if (!nameToAdd) return;

    try {
      setIsAdding(true);
      const response = await fetch(`/api/nabu/notes/${noteId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames: [nameToAdd] }),
      });

      if (!response.ok) {
        throw new Error("Failed to add tag");
      }

      const result = await response.json();
      onTagAdded(result.data.tags);
      toast.success("Tag added");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * Check if search query matches any existing tag (case-insensitive)
   */
  const hasExactMatch = searchQuery.trim() !== "" && 
    tags.some(tag => tag.value.toLowerCase() === searchQuery.trim().toLowerCase());

  /**
   * Check if we should show the "Create new tag" option
   */
  const showCreateOption = searchQuery.trim() !== "" && !hasExactMatch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Tag</DialogTitle>
          <DialogDescription>
            Select an existing tag or create a new one. You can also use #hashtags in the editor to create tags automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search or create tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tags list */}
        <ScrollArea className="h-[300px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {/* Create new tag option */}
              {showCreateOption && (
                <div className="pb-2 border-b border-border">
                  <button
                    onClick={() => handleAddTag(searchQuery.trim())}
                    disabled={isAdding}
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-primary/5 border-2 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-colors text-left"
                  >
                    <Plus className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary">
                        Create "{searchQuery.trim()}"
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Create and add new tag
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Existing tags */}
              {filteredTags.length === 0 && !showCreateOption ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Hash className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {tags.length === 0 ? "No tags yet" : "No tags found"}
                  </p>
                  {searchQuery.trim() !== "" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Type a name and press Enter to create
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {filteredTags.length > 0 && showCreateOption && (
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 pt-2">
                      Existing Tags
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTagId(tag.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left ${
                          selectedTagId === tag.id
                            ? "bg-primary/10 border-2 border-primary"
                            : "hover:bg-muted border-2 border-transparent"
                        }`}
                      >
                        <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {tag.value}
                          </div>
                        </div>
                        {tag.color && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                            title={tag.color}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleAddTag()}
            disabled={(!selectedTagId && !showCreateOption) || isAdding}
          >
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

