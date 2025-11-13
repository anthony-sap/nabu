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
import { FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

/**
 * Props for AddLinkDialog
 */
interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  onLinkAdded: (links: any[]) => void;
}

/**
 * Note item for selection
 */
interface NoteItem {
  id: string;
  value: string;
  description: string;
}

/**
 * Dialog for manually adding links to notes
 * Fetches available notes from the mentions API
 */
export function AddLinkDialog({ open, onOpenChange, noteId, onLinkAdded }: AddLinkDialogProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Fetch available notes when dialog opens
   */
  useEffect(() => {
    if (open) {
      fetchNotes();
      setSearchQuery("");
      setSelectedNoteId(null);
    }
  }, [open]);

  /**
   * Filter notes based on search query
   */
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter((note) =>
          note.value.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, notes]);

  /**
   * Fetch notes from mentions API
   */
  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/nabu/mentions");

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const result = await response.json();
      
      // Filter out the current note from the list
      const availableNotes = (result.data.notes || []).filter(
        (note: NoteItem) => note.id !== noteId
      );
      
      setNotes(availableNotes);
      setFilteredNotes(availableNotes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle adding the selected link
   */
  const handleAddLink = async () => {
    if (!selectedNoteId) return;

    try {
      setIsAdding(true);
      const response = await fetch(`/api/nabu/notes/${noteId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds: [selectedNoteId] }),
      });

      if (!response.ok) {
        throw new Error("Failed to add link");
      }

      const result = await response.json();
      onLinkAdded(result.data.links);
      toast.success("Link added");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Failed to add link");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Link to Note</DialogTitle>
          <DialogDescription>
            Select a note to link to. You can also use @mentions in the editor to create links automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Notes list */}
        <ScrollArea className="h-[300px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {notes.length === 0 ? "No notes available" : "No notes found"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-md transition-colors text-left ${
                    selectedNoteId === note.id
                      ? "bg-primary/10 border-2 border-primary"
                      : "hover:bg-muted border-2 border-transparent"
                  }`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {note.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {note.description}
                    </div>
                  </div>
                </button>
              ))}
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
            onClick={handleAddLink}
            disabled={!selectedNoteId || isAdding}
          >
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

