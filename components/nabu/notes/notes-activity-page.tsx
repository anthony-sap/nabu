"use client";

import { FormEvent, useEffect, useState } from "react";
import Color from "color";
import { Loader2 } from "lucide-react";
import { NotesSidebar } from "./notes-sidebar";
import { ActivityFeed } from "./activity-feed";
import { NoteDetailView } from "./note-detail-view";
import { SavedThought, FolderItem } from "./types";
import { exampleThoughts, STORAGE_KEY } from "./constants";
import { fetchRootFolders, fetchFolderChildren } from "./api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerHue,
  ColorPickerOutput,
} from "@/components/ui/color-picker";

/**
 * Main component for the Notes Activity Page
 * Combines activity feed, folder navigation, and note viewing functionality
 * 
 * Features:
 * - Activity feed with quick capture form
 * - Hierarchical folder structure for organizing notes
 * - Dual view system (feed vs folder/note detail)
 * - LocalStorage persistence for thoughts
 * - Auto-sync across browser tabs
 */
export default function NotesActivityPage() {
  // View state: "feed" shows activity feed, "folders" shows selected note detail
  const [view, setView] = useState<"feed" | "folders">("feed");
  
  // Folder structure with expand/collapse state
  const [folders, setFolders] = useState<FolderItem[]>([]);
  
  // Loading state for initial folder fetch
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [folderLoadError, setFolderLoadError] = useState<string | null>(null);
  
  // Currently selected note in folder view
  const [selectedNote, setSelectedNote] = useState<FolderItem | null>(null);
  
  // Array of all saved thoughts, sorted by creation date (newest first)
  const [thoughts, setThoughts] = useState<SavedThought[]>([]);

  // Modal state for creating folders
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#00B3A6");
  const [folderNameError, setFolderNameError] = useState("");
  const [folderColorError, setFolderColorError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderCreateError, setFolderCreateError] = useState<string | null>(null);

  /**
   * Load folders from API on component mount
   */
  useEffect(() => {
    const loadFolders = async () => {
      try {
        setIsLoadingFolders(true);
        setFolderLoadError(null);
        const rootFolders = await fetchRootFolders();
        setFolders(sortFolderItems(rootFolders));
      } catch (error) {
        console.error('Failed to load folders:', error);
        setFolderLoadError(error instanceof Error ? error.message : 'Failed to load folders');
        setFolders([]);
      } finally {
        setIsLoadingFolders(false);
      }
    };

    loadFolders();
  }, []);

  /**
   * Load thoughts from localStorage on component mount
   * Sets up storage event listener for cross-tab synchronization
   */
  useEffect(() => {
    const loadThoughts = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedThoughts = JSON.parse(saved);
          // Sort by createdAt, newest first
          const sorted = parsedThoughts.sort((a: SavedThought, b: SavedThought) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setThoughts(sorted);
        } else {
          // If no saved thoughts, show examples
          setThoughts(exampleThoughts);
        }
      } catch (error) {
        console.error('Failed to load thoughts:', error);
        setThoughts(exampleThoughts);
      }
    };

    loadThoughts();
    
    // Listen for storage changes to update in real-time across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadThoughts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Handles saving a new thought to localStorage and state
   * Creates a new SavedThought object with timestamp-based ID
   */
  const handleSaveThought = (title: string, content: string) => {
    if (!title.trim() && !content.trim()) {
      return;
    }

    const thought: SavedThought = {
      id: `thought-${Date.now()}`,
      title: title.trim() || "Untitled",
      content: content.trim(),
      tags: [],
      folder: "",
      createdAt: new Date().toISOString(),
      pinned: false,
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existing = saved ? JSON.parse(saved) : [];
      const updated = [thought, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setThoughts(updated);
    } catch (error) {
      console.error('Failed to save thought:', error);
    }
  };

  /**
   * Recursively toggles the expanded state of a folder in the tree
   * Lazy loads children if they haven't been loaded yet
   */
  const toggleFolder = async (id: string) => {
    // First, find the folder to check its state
    const folder = findFolderById(folders, id);
    if (!folder || folder.type !== "folder") return;

    const isExpanding = !folder.expanded;

    // Toggle expanded state immediately for UI responsiveness
    const updateExpanded = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children) {
          return { ...item, children: updateExpanded(item.children) };
        }
        return item;
      });
    };
    setFolders(updateExpanded(folders));

    // If expanding and children haven't been loaded yet, fetch them
    if (isExpanding && !folder.hasLoadedChildren && (folder.childCount ?? 0) > 0) {
      // Set loading state
      const setLoading = (items: FolderItem[], loading: boolean): FolderItem[] => {
        return items.map((item) => {
          if (item.id === id) {
            return { ...item, isLoading: loading };
          }
          if (item.children) {
            return { ...item, children: setLoading(item.children, loading) };
          }
          return item;
        });
      };
      setFolders((current) => setLoading(current, true));

      try {
        const children = await fetchFolderChildren(id);
        
        // Insert children into the tree
        const insertChildren = (items: FolderItem[]): FolderItem[] => {
          return items.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                children: sortFolderItems(children),
                hasLoadedChildren: true,
                isLoading: false,
              };
            }
            if (item.children) {
              return { ...item, children: insertChildren(item.children) };
            }
            return item;
          });
        };
        setFolders((current) => insertChildren(current));
      } catch (error) {
        console.error(`Failed to load children for folder ${id}:`, error);
        // Remove loading state and collapse folder on error
        setFolders((current) => 
          setLoading(current, false).map((item) => 
            item.id === id ? { ...item, expanded: false } : item
          )
        );
      }
    }
  };

  /**
   * Handles view changes and clears selected note when returning to feed
   */
  const handleViewChange = (newView: "feed" | "folders") => {
    setView(newView);
    if (newView === "feed") {
      setSelectedNote(null);
    }
  };

  /**
   * Handles adding a new subfolder to a parent folder
   */
  const handleAddFolderRequest = (parentId: string | null) => {
    const parentFolder = parentId ? findFolderById(folders, parentId) : undefined;
    setFolderModalParentId(parentId);
    setNewFolderName("");
    setNewFolderColor(parentFolder?.color || "#00B3A6");
    setFolderNameError("");
    setFolderColorError(null);
    setFolderCreateError(null);
    setFolderModalOpen(true);
  };

  /**
   * Handles adding a new note to a folder
   */
  const handleAddNote = (folderId: string) => {
    const noteName = prompt("Enter note title:");
    if (!noteName?.trim()) return;

    const addNote = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === folderId && item.type === "folder") {
          const newNote: FolderItem = {
            id: `note-${Date.now()}`,
            name: noteName.trim(),
            type: "note",
            tags: [],
          };
          return {
            ...item,
            children: [...(item.children || []), newNote],
            expanded: true, // Auto-expand to show new note
          };
        }
        if (item.children) {
          return { ...item, children: addNote(item.children) };
        }
        return item;
      });
    };

    setFolders(addNote(folders));
  };

  /**
   * Helper to find a folder within the tree by id
   */
  function findFolderById(items: FolderItem[], id: string): FolderItem | undefined {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.children) {
        const found = findFolderById(item.children, id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  const handleFolderNameChange = (value: string) => {
    setNewFolderName(value);
    if (folderNameError && value.trim()) {
      setFolderNameError("");
    }
  };

  const closeFolderModal = () => {
    setFolderModalOpen(false);
    setFolderModalParentId(null);
    setNewFolderName("");
    setFolderNameError("");
    setFolderColorError(null);
    setFolderCreateError(null);
    setIsCreatingFolder(false);
    setNewFolderColor("#00B3A6");
  };

  const handleFolderCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingFolder) {
      return;
    }

    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setFolderNameError("Folder name is required.");
      return;
    }

    let normalizedHex: string;
    try {
      normalizedHex = Color(newFolderColor).hex().toUpperCase();
    } catch (error) {
      setFolderColorError("Please select a valid colour.");
      return;
    }

    setFolderColorError(null);
    setIsCreatingFolder(true);
    setFolderCreateError(null);

    const parentId = folderModalParentId;

    try {
      const requestBody = {
        name: trimmedName,
        color: normalizedHex,
        ...(parentId ? { parentId } : {}),
      };

      const response = await fetch("/api/nabu/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create folder.");
      }

      const createdFolder = payload?.data;
      if (!createdFolder) {
        throw new Error("Unexpected response from server.");
      }

      const newFolder: FolderItem = {
        id: createdFolder.id,
        name: createdFolder.name,
        type: "folder",
        expanded: false,
        children: [],
        color: createdFolder.color || undefined,
        hasLoadedChildren: true, // New folder has no children yet
        childCount: 0,
      };

      const parentIdFromResponse: string | null =
        createdFolder.parentId ?? parentId ?? null;

      setFolders((current) =>
        insertFolderSorted(current, parentIdFromResponse, newFolder),
      );

      closeFolderModal();
    } catch (error) {
      setFolderCreateError(
        error instanceof Error ? error.message : "Failed to create folder.",
      );
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <>
      <div className="flex h-[calc(100vh-10rem)] gap-6">
        {/* Left Sidebar: Navigation and folder tree */}
        <NotesSidebar
          folders={folders}
          view={view}
          selectedNote={selectedNote}
          onViewChange={handleViewChange}
          onFolderToggle={toggleFolder}
          onNoteSelect={setSelectedNote}
          onAddFolder={handleAddFolderRequest}
          onAddNote={handleAddNote}
          isLoadingFolders={isLoadingFolders}
          folderLoadError={folderLoadError}
        />

        {/* Main Content Area: Activity feed or note detail view */}
        <div className="flex-1 min-w-0">
          {view === "feed" ? (
            <ActivityFeed
              thoughts={thoughts}
              onSaveThought={handleSaveThought}
            />
          ) : (
            <NoteDetailView selectedNote={selectedNote} />
          )}
        </div>
      </div>

      <Dialog open={folderModalOpen} onOpenChange={(open) => (open ? setFolderModalOpen(true) : closeFolderModal())}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleFolderCreate} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Create a new folder</DialogTitle>
              <DialogDescription>
                Give your folder a name and colour to organise your notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(event) => handleFolderNameChange(event.target.value)}
                placeholder="Product Strategy"
                autoFocus
                disabled={isCreatingFolder}
              />
              {folderNameError && (
                <p className="text-sm text-destructive">{folderNameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Folder colour</Label>
              <div className={isCreatingFolder ? "pointer-events-none opacity-60" : undefined}>
                <ColorPicker
                  value={newFolderColor}
                  onChange={(hex) => {
                    setNewFolderColor(hex);
                    setFolderColorError(null);
                  }}
                  className="gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Preview</span>
                      <span
                        className="h-4 w-4 rounded-full border border-border shadow-inner"
                        style={{ backgroundColor: newFolderColor }}
                      />
                    </div>
                    <span className="font-mono text-[11px]">
                      {Color(newFolderColor).hex().toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPickerHue className="h-3 flex-1" />
                    <ColorPickerEyeDropper />
                  </div>
                  <ColorPickerOutput className="h-8 text-xs font-mono" />
                </ColorPicker>
              </div>
              {folderColorError && (
                <p className="text-sm text-destructive">{folderColorError}</p>
              )}
            </div>

            {folderCreateError && (
              <p className="text-sm text-destructive" role="alert">
                {folderCreateError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeFolderModal} disabled={isCreatingFolder}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isCreatingFolder}
              >
                {isCreatingFolder && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create folder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function insertFolderSorted(
  items: FolderItem[],
  parentId: string | null,
  folder: FolderItem,
): FolderItem[] {
  if (!parentId) {
    return sortFolderItems([...items, folder]);
  }

  let inserted = false;

  const updated = items.map((item) => {
    if (item.id === parentId && item.type === "folder") {
      inserted = true;
      const childList = sortFolderItems([...(item.children || []), folder]);
      return {
        ...item,
        children: childList,
        expanded: true,
      };
    }

    if (item.children) {
      const nextChildren = insertFolderSorted(item.children, parentId, folder);
      if (nextChildren !== item.children) {
        inserted = true;
        return { ...item, children: nextChildren };
      }
    }

    return item;
  });

  return inserted ? sortFolderItems(updated) : updated;
}

function sortFolderItems(items: FolderItem[]): FolderItem[] {
  return [...items]
    .map((item) =>
      item.children ? { ...item, children: sortFolderItems(item.children) } : item,
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

