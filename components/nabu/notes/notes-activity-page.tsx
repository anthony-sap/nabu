"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Color from "color";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { NotesSidebar } from "./notes-sidebar";
import { NoteDetailView } from "./note-detail-view";
import { NoteEditor } from "./note-editor";
import { TabbedActivityFeed } from "./tabbed-activity-feed";
import { SearchDialog } from "./search-dialog";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
import { FolderItem, NoteItem } from "./types";
import { SearchResult } from "./types-search";
import { fetchRootFolders, fetchFolderChildren, fetchFolderNotes } from "./api";
import { FolderStateStorage } from "./folder-state-storage";
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
 * Props for NotesActivityPage component
 */
interface NotesActivityPageProps {
  initialNoteId?: string;
  initialThoughtId?: string;
}

/**
 * Main component for the Notes Activity Page
 * Combines activity feed, folder navigation, and note viewing functionality
 * 
 * Features:
 * - Database-backed thoughts feed with quick capture
 * - Hierarchical folder structure for organizing notes
 * - Dual view system (feed vs folder/note detail)
 * - URL-based routing for notes and thoughts
 */
export default function NotesActivityPage({ initialNoteId, initialThoughtId }: NotesActivityPageProps = {}) {
  // Next.js navigation hooks
  const router = useRouter();
  const pathname = usePathname();
  // View state: "feed" shows tabbed activity feed, "folders" shows selected note detail, "editor" shows note editor
  const [view, setView] = useState<"feed" | "folders" | "editor">("feed");
  
  // Folder structure with expand/collapse state
  const [folders, setFolders] = useState<FolderItem[]>([]);
  
  // Root-level notes (uncategorised)
  const [rootNotes, setRootNotes] = useState<NoteItem[]>([]);
  
  // Loading state for initial folder fetch
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [folderLoadError, setFolderLoadError] = useState<string | null>(null);
  
  // Currently selected note in folder view
  const [selectedNote, setSelectedNote] = useState<FolderItem | null>(null);
  
  // Note being edited in editor view
  const [editingNote, setEditingNote] = useState<{ id: string; folderId: string } | null>(null);

  // Modal state for creating/editing folders
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "edit">("create");
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#00B3A6");
  const [folderNameError, setFolderNameError] = useState("");
  const [folderColorError, setFolderColorError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderCreateError, setFolderCreateError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"folder" | "note" | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMoveOption, setShowMoveOption] = useState(false);
  const [moveAction, setMoveAction] = useState<"delete" | "move">("delete");
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<FolderItem[]>([]);

  // Search dialog state
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // User ID for localStorage scoping
  const [userId, setUserId] = useState<string | null>(null);

  /**
   * Helper: Apply expanded state to folder tree
   */
  const applyExpandedState = (folders: FolderItem[], expandedIds: string[]): FolderItem[] => {
    return folders.map(folder => ({
      ...folder,
      expanded: expandedIds.includes(folder.id),
      children: folder.children ? applyExpandedState(folder.children, expandedIds) : [],
    }));
  };

  /**
   * Helper: Apply cached notes to folder tree
   */
  const applyCachedNotes = (
    folders: FolderItem[],
    notesCache: Record<string, { notes: NoteItem[]; timestamp: string; expiresAt: string }>
  ): FolderItem[] => {
    return folders.map(folder => {
      const cached = notesCache[folder.id];
      const cacheValid = cached && new Date(cached.expiresAt) > new Date();

      return {
        ...folder,
        notes: cacheValid ? cached.notes : folder.notes,
        hasLoadedNotes: cacheValid ? true : folder.hasLoadedNotes,
        children: folder.children ? applyCachedNotes(folder.children, notesCache) : [],
      };
    });
  };

  /**
   * Helper: Extract all expanded folder IDs from tree
   */
  const getExpandedFolderIds = (folders: FolderItem[]): string[] => {
    const ids: string[] = [];
    
    const collect = (items: FolderItem[]) => {
      items.forEach(item => {
        if (item.expanded) {
          ids.push(item.id);
        }
        if (item.children) {
          collect(item.children);
        }
      });
    };
    
    collect(folders);
    return ids;
  };

  /**
   * Load folders from API on component mount
   */
  useEffect(() => {
    const loadFolders = async () => {
      try {
        setIsLoadingFolders(true);
        setFolderLoadError(null);
        const rootFolders = await fetchRootFolders();
        
        // Extract userId from the first folder (if any) for localStorage scoping
        const firstFolder = rootFolders[0];
        if (firstFolder && 'userId' in firstFolder) {
          const userIdFromFolder = (firstFolder as any).userId;
          setUserId(userIdFromFolder);
          
          // Load persisted folder state
          const savedState = FolderStateStorage.load(userIdFromFolder);
          
          if (savedState) {
            // Apply expanded states
            let foldersWithState = applyExpandedState(rootFolders, savedState.expandedFolderIds);
            
            // Apply cached notes
            foldersWithState = applyCachedNotes(foldersWithState, savedState.loadedNotesCache);
            
            // Clean up expired cache entries
            FolderStateStorage.cleanupExpired(userIdFromFolder);
            
            setFolders(sortFolderItems(foldersWithState));
          } else {
            setFolders(sortFolderItems(rootFolders));
          }
        } else {
          setFolders(sortFolderItems(rootFolders));
        }
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
   * Load root-level notes (uncategorised) on component mount
   */
  useEffect(() => {
    const loadRootNotes = async () => {
      try {
        const response = await fetch('/api/nabu/notes?folderId=null');
        if (!response.ok) {
          //throw new Error('Failed to fetch root notes');
          
        }
        const data = await response.json();
        if (data.success && data.data.notes) {
          setRootNotes(data.data.notes.map((note: any) => ({
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })));
        }
      } catch (error) {
        console.error('Failed to load root notes:', error);
      }
    };

    loadRootNotes();
  }, []);

  // localStorage logic removed - now using database-backed thoughts from API

  /**
   * Refresh folder tree and root notes
   * Used after bulk operations like auto-move
   */
  const refreshFoldersAndNotes = async () => {
    try {
      // Reload folders
      const rootFolders = await fetchRootFolders();
      
      // Clear and refresh localStorage cache when data changes
      if (userId) {
        FolderStateStorage.clear(userId);
      }
      
      setFolders(sortFolderItems(rootFolders));
      
      // Reload root notes
      const notesResponse = await fetch('/api/nabu/notes?folderId=null');
      if (notesResponse.ok) {
        const data = await notesResponse.json();
        if (data.success && data.data.notes) {
          setRootNotes(data.data.notes.map((note: any) => ({
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to refresh folders and notes:', error);
    }
  };

  /**
   * Setup keyboard shortcut for search (Ctrl+F / Cmd+F)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        setSearchDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Handle initial note/thought load from URL parameters
   * Load and display the specified note or thought when component mounts or URL changes
   */
  useEffect(() => {
    const loadInitialContent = async () => {
      // Handle initial note load
      if (initialNoteId) {
        try {
          const response = await fetch(`/api/nabu/notes/${initialNoteId}`);
          if (!response.ok) {
            if (response.status === 404) {
              toast.error("Note not found", {
                description: "This note may have been deleted or you don't have access to it."
              });
              router.push('/nabu/notes');
              return;
            }
            if (response.status === 403) {
              toast.error("Access denied", {
                description: "You don't have permission to view this note."
              });
              router.push('/nabu/notes');
              return;
            }
            throw new Error('Failed to fetch note');
          }
          
          const { data } = await response.json();
          
          // Set view to editor mode
          setView("editor");
          setEditingNote({ id: initialNoteId, folderId: data.folder?.id || "" });
          
          // If note is in a folder, expand the folder path
          if (data.folder?.id) {
            await expandFolderPath(data.folder.id);
          }
        } catch (error) {
          console.error('Failed to load initial note:', error);
          toast.error("Failed to load note", {
            description: "An error occurred while loading the note. Please try again."
          });
          router.push('/nabu/notes');
        }
      }
      
      // Handle initial thought load
      else if (initialThoughtId) {
        try {
          const response = await fetch(`/api/nabu/thoughts/${initialThoughtId}`);
          if (!response.ok) {
            if (response.status === 404) {
              toast.error("Thought not found", {
                description: "This thought may have been deleted or you don't have access to it."
              });
              router.push('/nabu/notes');
              return;
            }
            if (response.status === 403) {
              toast.error("Access denied", {
                description: "You don't have permission to view this thought."
              });
              router.push('/nabu/notes');
              return;
            }
            throw new Error('Failed to fetch thought');
          }
          
          // Switch to feed view (thoughts are shown in feed)
          setView("feed");
          // Note: Scrolling to specific thought or highlighting would be added here
        } catch (error) {
          console.error('Failed to load initial thought:', error);
          toast.error("Failed to load thought", {
            description: "An error occurred while loading the thought. Please try again."
          });
          router.push('/nabu/notes');
        }
      }
      
      // If no specific note/thought, show default view
      else if (pathname === '/nabu/notes') {
        setView("feed");
        setEditingNote(null);
      }
    };

    // Only load if folders have been loaded (prevents race conditions)
    if (!isLoadingFolders) {
      loadInitialContent();
    }
  }, [initialNoteId, initialThoughtId, isLoadingFolders, router, pathname]);

  /**
   * Handle browser back/forward navigation
   * Detects URL changes from browser navigation and updates the view accordingly
   */
  useEffect(() => {
    // This effect runs when pathname changes (e.g., browser back/forward)
    // The initialNoteId/initialThoughtId props will change, triggering the previous useEffect
    // This ensures the UI stays in sync with the URL
  }, [pathname]);

  /**
   * Handle search result selection
   */
  const handleSearchResultSelect = async (result: SearchResult) => {
    if (result.type === "note") {
      // Navigate to note URL using search params
      router.push(`/nabu/notes?noteId=${result.id}`);
    } else if (result.type === "thought") {
      // Navigate to thought URL using search params
      router.push(`/nabu/notes?thoughtId=${result.id}`);
    }
  };

  /**
   * Expand folder path to make a specific folder visible
   */
  const expandFolderPath = async (targetFolderId: string) => {
    const expandFolder = async (items: FolderItem[], folderId: string): Promise<FolderItem[]> => {
      return Promise.all(
        items.map(async (item) => {
          if (item.id === folderId) {
            // This is the target folder, expand it
            let updatedItem = { ...item, expanded: true };

            // If children haven't been loaded, load them
            if (!item.hasLoadedChildren && (item.childCount ?? 0) > 0) {
              try {
                const children = await fetchFolderChildren(folderId);
                updatedItem = {
                  ...updatedItem,
                  children: sortFolderItems(children),
                  hasLoadedChildren: true,
                };
              } catch (error) {
                console.error(`Failed to load children for folder ${folderId}:`, error);
              }
            }

            return updatedItem;
          }

          // Check if target is in children
          if (item.children) {
            const hasTarget = findFolderById(item.children, folderId);
            if (hasTarget) {
              // Expand this folder and recurse into children
              let updatedItem = { ...item, expanded: true };

              // If children haven't been loaded, load them
              if (!item.hasLoadedChildren && (item.childCount ?? 0) > 0) {
                try {
                  const children = await fetchFolderChildren(item.id);
                  updatedItem = {
                    ...updatedItem,
                    children: await expandFolder(sortFolderItems(children), folderId),
                    hasLoadedChildren: true,
                  };
                } catch (error) {
                  console.error(`Failed to load children for folder ${item.id}:`, error);
                }
              } else {
                updatedItem = {
                  ...updatedItem,
                  children: await expandFolder(item.children, folderId),
                };
              }

              return updatedItem;
            }
          }

          return item;
        })
      );
    };

    const expandedFolders = await expandFolder(folders, targetFolderId);
    setFolders(expandedFolders);
  };

  // handleSaveThought removed - now using database API in ThoughtsActivityFeed

  /**
   * Recursively toggles the expanded state of a folder in the tree
   * Lazy loads notes for the folder if they haven't been loaded yet
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

    // If expanding and notes haven't been loaded yet, fetch them
    if (isExpanding && !folder.hasLoadedNotes && (folder.noteCount ?? 0) > 0) {
      // Set loading state for notes
      const setNotesLoading = (items: FolderItem[], loading: boolean): FolderItem[] => {
        return items.map((item) => {
          if (item.id === id) {
            return { ...item, notesLoading: loading };
          }
          if (item.children) {
            return { ...item, children: setNotesLoading(item.children, loading) };
          }
          return item;
        });
      };
      setFolders((current) => setNotesLoading(current, true));

      try {
        const notes = await fetchFolderNotes(id);
        
        // Insert notes into the folder
        const insertNotes = (items: FolderItem[]): FolderItem[] => {
          return items.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                notes,
                hasLoadedNotes: true,
                notesLoading: false,
              };
            }
            if (item.children) {
              return { ...item, children: insertNotes(item.children) };
            }
            return item;
          });
        };
        setFolders((current) => {
          const updated = insertNotes(current);
          
          // Cache the loaded notes and save expanded state
          if (userId) {
            FolderStateStorage.saveFolderNotes(userId, id, notes);
            FolderStateStorage.saveExpandedFolders(userId, getExpandedFolderIds(updated));
          }
          
          return updated;
        });
      } catch (error) {
        console.error(`Failed to load notes for folder ${id}:`, error);
        // Remove loading state on error
        const removeLoading = (items: FolderItem[]): FolderItem[] => {
          return items.map((item) => {
            if (item.id === id) {
              return { ...item, notesLoading: false };
            }
            if (item.children) {
              return { ...item, children: removeLoading(item.children) };
            }
            return item;
          });
        };
        setFolders((current) => removeLoading(current));
      }
    }
    
    // Save expanded folder state whenever toggle happens
    if (userId) {
      const updatedExpandedIds = isExpanding 
        ? [...getExpandedFolderIds(folders), id]
        : getExpandedFolderIds(folders).filter(fid => fid !== id);
      FolderStateStorage.saveExpandedFolders(userId, updatedExpandedIds);
    }
  };

  /**
   * Handles view changes and clears selected note when returning to feed
   */
  const handleViewChange = (newView: "feed" | "folders" | "editor") => {
    setView(newView);
    if (newView === "feed") {
      setSelectedNote(null);
      setEditingNote(null);
      // Update URL to base /notes path
      router.push('/nabu/notes');
    }
  };

  /**
   * Handles selecting a note - opens it in the editor
   */
  const handleNoteSelect = (item: FolderItem) => {
    if (item.type === "note") {
      // Navigate to note URL using search params (updates browser history)
      router.push(`/nabu/notes?noteId=${item.id}`);
    } else if (item.type === "folder") {
      // Folder clicked - just toggle it (no special view)
      toggleFolder(item.id);
    }
  };

  /**
   * Handles adding a new subfolder to a parent folder
   */
  const handleAddFolderRequest = (parentId: string | null) => {
    const parentFolder = parentId ? findFolderById(folders, parentId) : undefined;
    setFolderModalMode("create");
    setFolderModalParentId(parentId);
    setEditingFolderId(null);
    setNewFolderName("");
    setNewFolderColor(parentFolder?.color || "#00B3A6");
    setFolderNameError("");
    setFolderColorError(null);
    setFolderCreateError(null);
    setFolderModalOpen(true);
  };

  /**
   * Handles editing an existing folder
   */
  const handleEditFolderRequest = (folderId: string) => {
    const folder = findFolderById(folders, folderId);
    if (!folder) return;

    setFolderModalMode("edit");
    setEditingFolderId(folderId);
    setFolderModalParentId(null);
    setNewFolderName(folder.name);
    setNewFolderColor(folder.color || "#00B3A6");
    setFolderNameError("");
    setFolderColorError(null);
    setFolderCreateError(null);
    setFolderModalOpen(true);
  };

  /**
   * Adds a note to a folder's notes array in the tree
   */
  const addNoteToFolder = (folderId: string, note: NoteItem) => {
    const updateFolderInTree = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === folderId) {
          // Add the new note to the folder's notes array
          const existingNotes = item.notes || [];
          return {
            ...item,
            notes: [...existingNotes, note],
          };
        }
        if (item.children) {
          return { ...item, children: updateFolderInTree(item.children) };
        }
        return item;
      });
    };
    
    setFolders((current) => updateFolderInTree(current));
  };

  /**
   * Handles moving a folder to a new parent
   */
  const handleMoveFolder = async (folderId: string, newParentId: string | null) => {
    try {
      // Optimistically update UI by removing folder from old location
      const folderToMove = findFolderById(folders, folderId);
      if (!folderToMove) return;

      // Call API to update parentId
      const response = await fetch(`/api/nabu/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: newParentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to move folder");
      }

      // Reload folders to get updated structure
      const rootFolders = await fetchRootFolders();
      setFolders(sortFolderItems(rootFolders));
    } catch (error) {
      console.error("Failed to move folder:", error);
      // TODO: Show error toast
      // Reload folders on error to revert optimistic update
      const rootFolders = await fetchRootFolders();
      setFolders(sortFolderItems(rootFolders));
    }
  };

  /**
   * Handles moving a note to a new folder (or root level)
   */
  const handleMoveNote = async (noteId: string, newFolderId: string | null) => {
    try {
      // Call API to update folderId
      const response = await fetch(`/api/nabu/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: newFolderId }),
      });

      if (!response.ok) {
        throw new Error("Failed to move note");
      }

      // Reload folders and root notes to get updated structure
      const rootFolders = await fetchRootFolders();
      setFolders(sortFolderItems(rootFolders));
      
      // Reload root notes
      const notesResponse = await fetch('/api/nabu/notes?folderId=null');
      if (notesResponse.ok) {
        const data = await notesResponse.json();
        if (data.success && data.data.notes) {
          setRootNotes(data.data.notes.map((note: any) => ({
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to move note:", error);
      // TODO: Show error toast
    }
  };

  /**
   * Handles adding a new note to a folder
   * Creates note on server with timestamp title and opens editor
   */
  const handleAddNote = async (folderId: string) => {
    try {
      // Generate timestamp-based title: "Unsaved dd-mm-yyyy HH:MM"
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const title = `Unsaved ${dateStr} ${timeStr}`;
      
      // Create note on server
      const response = await fetch("/api/nabu/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: "",
          folderId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create note");
      }
      
      // Add the new note to the folder tree immediately
      const newNote: NoteItem = {
        id: payload.data.id,
        title: payload.data.title,
        createdAt: payload.data.createdAt,
        updatedAt: payload.data.updatedAt,
      };
      addNoteToFolder(folderId, newNote);
      
      // Navigate to new note URL using search params
      router.push(`/nabu/notes?noteId=${payload.data.id}`);
    } catch (error) {
      console.error("Failed to create note:", error);
      // TODO: Show error toast to user
    }
  };

  /**
   * Handles creating a quick note (uncategorized)
   * Creates note on server with timestamp title and opens full editor
   */
  const handleQuickNote = async () => {
    try {
      // Generate timestamp-based title: "Unsaved dd-mm-yyyy HH:MM"
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const title = `Unsaved ${dateStr} ${timeStr}`;
      
      // Create uncategorized note on server (no folderId)
      const response = await fetch("/api/nabu/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: "",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create note");
      }
      
      // Refresh sidebar to show new uncategorized note
      await refreshFoldersAndNotes();
      
      // Navigate to new note URL using search params
      router.push(`/nabu/notes?noteId=${payload.data.id}`);
    } catch (error) {
      console.error("Failed to create quick note:", error);
      toast.error("Failed to create note. Please try again.");
    }
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

  /**
   * Helper to find a note's name by ID within the folder tree
   */
  function findNoteNameById(items: FolderItem[], noteId: string): string | null {
    for (const item of items) {
      if (item.notes) {
        const note = item.notes.find(n => n.id === noteId);
        if (note) return note.title;
      }
      if (item.children) {
        const found = findNoteNameById(item.children, noteId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Helper to remove a folder from the tree
   */
  function removeFolderFromTree(items: FolderItem[], folderId: string): FolderItem[] {
    return items
      .filter(item => item.id !== folderId)
      .map(item => ({
        ...item,
        children: item.children ? removeFolderFromTree(item.children, folderId) : undefined
      }));
  }

  /**
   * Helper to remove a note from the tree
   */
  function removeNoteFromTree(items: FolderItem[], noteId: string): FolderItem[] {
    return items.map(item => ({
      ...item,
      notes: item.notes?.filter(note => note.id !== noteId),
      children: item.children ? removeNoteFromTree(item.children, noteId) : undefined
    }));
  }

  /**
   * Flatten folder tree to a list
   */
  function flattenFolders(items: FolderItem[], result: FolderItem[] = []): FolderItem[] {
    items.forEach(item => {
      if (item.type === "folder") {
        result.push(item);
        if (item.children) {
          flattenFolders(item.children, result);
        }
      }
    });
    return result;
  }

  /**
   * Get all descendant IDs of a folder
   */
  function getAllDescendantIds(items: FolderItem[], folderId: string): string[] {
    const folder = findFolderById(items, folderId);
    if (!folder || !folder.children) return [];
    
    const ids: string[] = [];
    function collectIds(children: FolderItem[]) {
      children.forEach(child => {
        ids.push(child.id);
        if (child.children) {
          collectIds(child.children);
        }
      });
    }
    collectIds(folder.children);
    return ids;
  }

  /**
   * Get list of folders excluding the one being deleted and its descendants
   */
  function getAvailableFoldersForMove(allFolders: FolderItem[], excludeId: string): FolderItem[] {
    const descendants = getAllDescendantIds(allFolders, excludeId);
    return flattenFolders(allFolders).filter(
      f => f.id !== excludeId && !descendants.includes(f.id)
    );
  }

  /**
   * Handles delete folder request - opens confirmation modal
   */
  const handleDeleteFolderRequest = (folderId: string) => {
    const folder = findFolderById(folders, folderId);
    if (!folder) return;
    
    // Check if folder has notes or children
    const hasNotes = (folder.notes?.length ?? 0) > 0;
    const hasChildren = (folder.childCount ?? 0) > 0 || (folder.children?.length ?? 0) > 0;
    const hasContents = hasNotes || hasChildren;
    
    // If folder has contents, prepare available folders for moving
    if (hasContents) {
      const available = getAvailableFoldersForMove(folders, folderId);
      setAvailableFolders(available);
      setShowMoveOption(true);
      setMoveAction("delete");
      setTargetFolderId(null);
    } else {
      setShowMoveOption(false);
    }
    
    setDeleteType("folder");
    setDeleteItemId(folderId);
    setDeleteItemName(folder.name);
    setDeleteModalOpen(true);
  };

  /**
   * Handles delete note request - opens confirmation modal
   */
  const handleDeleteNoteRequest = (noteId: string) => {
    const noteName = findNoteNameById(folders, noteId) || "this note";
    
    setDeleteType("note");
    setDeleteItemId(noteId);
    setDeleteItemName(noteName);
    setDeleteModalOpen(true);
  };

  /**
   * Move folder contents (notes and subfolders) to another folder
   */
  async function moveFolderContents(fromFolderId: string, toFolderId: string) {
    const folder = findFolderById(folders, fromFolderId);
    if (!folder) return;
    
    // Move all notes
    if (folder.notes) {
      for (const note of folder.notes) {
        await fetch(`/api/nabu/notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: toFolderId })
        });
      }
    }
    
    // Move all child folders
    if (folder.children) {
      for (const child of folder.children) {
        await fetch(`/api/nabu/folders/${child.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: toFolderId })
        });
      }
    }
  }

  /**
   * Handles confirmed deletion - calls API and updates UI
   */
  const handleDeleteConfirm = async () => {
    if (!deleteItemId || !deleteType) return;
    
    // Validate move target if moving
    if (deleteType === "folder" && moveAction === "move" && !targetFolderId) {
      alert("Please select a target folder");
      return;
    }
    
    setIsDeleting(true);
    
    try {
      if (deleteType === "folder") {
        // If moving contents, update children and notes first
        if (moveAction === "move" && targetFolderId) {
          await moveFolderContents(deleteItemId, targetFolderId);
        }
        
        // Then delete the folder
        const response = await fetch(`/api/nabu/folders/${deleteItemId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || "Failed to delete folder");
        }
        
        setFolders(current => removeFolderFromTree(current, deleteItemId));
      } else {
        // Delete note (simple soft delete)
        const response = await fetch(`/api/nabu/notes/${deleteItemId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || "Failed to delete note");
        }
        
        // Refresh the folder tree and uncategorized notes to show updated state
        await refreshFoldersAndNotes();
        
        // If we're editing this note, go back to feed
        if (editingNote?.id === deleteItemId) {
          setView("feed");
          setEditingNote(null);
        }
      }
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setDeleteType(null);
      setDeleteItemId(null);
      setDeleteItemName("");
      setShowMoveOption(false);
      setMoveAction("delete");
      setTargetFolderId(null);
      setAvailableFolders([]);
    } catch (error) {
      console.error(`Failed to delete ${deleteType}:`, error);
      alert(error instanceof Error ? error.message : `Failed to delete ${deleteType}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFolderNameChange = (value: string) => {
    setNewFolderName(value);
    if (folderNameError && value.trim()) {
      setFolderNameError("");
    }
  };

  const closeFolderModal = () => {
    setFolderModalOpen(false);
    setFolderModalMode("create");
    setFolderModalParentId(null);
    setEditingFolderId(null);
    setNewFolderName("");
    setFolderNameError("");
    setFolderColorError(null);
    setFolderCreateError(null);
    setIsCreatingFolder(false);
    setNewFolderColor("#00B3A6");
  };

  const handleFolderSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    try {
      if (folderModalMode === "edit" && editingFolderId) {
        // Update existing folder
        const requestBody = {
          name: trimmedName,
          color: normalizedHex,
        };

        const response = await fetch(`/api/nabu/folders/${editingFolderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to update folder.");
        }

        const updatedFolder = payload?.data;
        if (!updatedFolder) {
          throw new Error("Unexpected response from server.");
        }

        // Update folder in the tree
        const updateFolderInTree = (items: FolderItem[]): FolderItem[] => {
          return items.map((item) => {
            if (item.id === editingFolderId) {
              return {
                ...item,
                name: updatedFolder.name,
                color: updatedFolder.color || undefined,
              };
            }
            if (item.children) {
              return { ...item, children: updateFolderInTree(item.children) };
            }
            return item;
          });
        };

        setFolders((current) => sortFolderItems(updateFolderInTree(current)));
      } else {
        // Create new folder
        const parentId = folderModalParentId;
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
      }

      closeFolderModal();
    } catch (error) {
      setFolderCreateError(
        error instanceof Error ? error.message : folderModalMode === "edit" ? "Failed to update folder." : "Failed to create folder.",
      );
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar: Navigation and folder tree with glassy styling */}
        <NotesSidebar
          folders={folders}
          rootNotes={rootNotes}
          view={view}
          selectedNote={selectedNote}
          editingNoteId={editingNote?.id || null}
          onViewChange={handleViewChange}
          onFolderToggle={toggleFolder}
          onNoteSelect={handleNoteSelect}
          onAddFolder={handleAddFolderRequest}
          onAddNote={handleAddNote}
          onQuickNote={handleQuickNote}
          onEditFolder={handleEditFolderRequest}
          onDeleteFolder={handleDeleteFolderRequest}
          onDeleteNote={handleDeleteNoteRequest}
          onMoveFolder={handleMoveFolder}
          onMoveNote={handleMoveNote}
          onRefreshFolders={refreshFoldersAndNotes}
          isLoadingFolders={isLoadingFolders}
          folderLoadError={folderLoadError}
        />

        {/* Main Content Area with top header integrated */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Integrated top header - glassy and premium */}
          <header className="flex-shrink-0 h-16 border-b border-border/30 backdrop-blur-xl bg-background/60 flex items-center justify-between px-6">
            <h1 className="text-xl font-serif font-semibold text-foreground">Notes</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchDialogOpen(true)}
                className="gap-2 bg-background/40 hover:bg-background/60 border-border/50 backdrop-blur transition-all duration-200"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-70">
                  <span className="text-xs">⌘</span>F
                </kbd>
              </Button>
            </div>
          </header>

          {/* Content area with padding */}
          <div className="flex-1 overflow-auto">
            {view === "feed" ? (
              <TabbedActivityFeed
                onNoteSelect={(noteId, folderId) => {
                  setEditingNote({ id: noteId, folderId });
                  setView("editor");
                }}
              />
            ) : view === "editor" && editingNote ? (
              <NoteEditor
                noteId={editingNote.id}
                folderId={editingNote.folderId}
                onClose={() => {
                  setView("feed");
                  setEditingNote(null);
                }}
                onDelete={() => handleDeleteNoteRequest(editingNote.id)}
              />
            ) : (
              <NoteDetailView selectedNote={selectedNote} />
            )}
          </div>
        </div>
      </div>

      <Dialog open={folderModalOpen} onOpenChange={(open) => (open ? setFolderModalOpen(true) : closeFolderModal())}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleFolderSubmit} className="space-y-6">
            <DialogHeader>
              <DialogTitle>{folderModalMode === "edit" ? "Edit folder" : "Create a new folder"}</DialogTitle>
              <DialogDescription>
                {folderModalMode === "edit" 
                  ? "Update the folder name and colour."
                  : "Give your folder a name and colour to organise your notes."}
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
                {folderModalMode === "edit" ? "Update folder" : "Create folder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelectResult={handleSearchResultSelect}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteType(null);
          setDeleteItemId(null);
          setDeleteItemName("");
          setShowMoveOption(false);
          setMoveAction("delete");
          setTargetFolderId(null);
          setAvailableFolders([]);
        }}
        onConfirm={handleDeleteConfirm}
        title={deleteType === "folder" ? "Delete Folder?" : "Delete Note?"}
        description={
          deleteType === "folder"
            ? "This folder will be archived and can be recovered later. You can also move its contents to another folder."
            : "This note will be archived and can be recovered later."
        }
        itemName={deleteItemName}
        isDeleting={isDeleting}
        showMoveOption={showMoveOption}
        folders={availableFolders}
        selectedMoveFolder={targetFolderId}
        onMoveFolderChange={setTargetFolderId}
        moveAction={moveAction}
        onMoveActionChange={setMoveAction}
      />
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

