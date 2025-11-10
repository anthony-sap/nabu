"use client";

import { useState, useEffect } from "react";
import { NotesSidebar } from "./notes-sidebar";
import { ActivityFeed } from "./activity-feed";
import { NoteDetailView } from "./note-detail-view";
import { SavedThought, FolderItem } from "./types";
import { exampleThoughts, folderStructure, STORAGE_KEY } from "./constants";

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
  const [folders, setFolders] = useState<FolderItem[]>(folderStructure);
  
  // Currently selected note in folder view
  const [selectedNote, setSelectedNote] = useState<FolderItem | null>(null);
  
  // Array of all saved thoughts, sorted by creation date (newest first)
  const [thoughts, setThoughts] = useState<SavedThought[]>([]);

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
   */
  const toggleFolder = (id: string) => {
    const updateFolders = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children) {
          return { ...item, children: updateFolders(item.children) };
        }
        return item;
      });
    };
    setFolders(updateFolders(folders));
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
  const handleAddFolder = (parentId: string) => {
    const folderName = prompt("Enter folder name:");
    if (!folderName?.trim()) return;

    const addFolder = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === parentId && item.type === "folder") {
          const newFolder: FolderItem = {
            id: `folder-${Date.now()}`,
            name: folderName.trim(),
            type: "folder",
            expanded: false,
            children: [],
          };
          return {
            ...item,
            children: [...(item.children || []), newFolder],
            expanded: true, // Auto-expand to show new folder
          };
        }
        if (item.children) {
          return { ...item, children: addFolder(item.children) };
        }
        return item;
      });
    };

    setFolders(addFolder(folders));
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

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
      {/* Left Sidebar: Navigation and folder tree */}
      <NotesSidebar
        folders={folders}
        view={view}
        selectedNote={selectedNote}
        onViewChange={handleViewChange}
        onFolderToggle={toggleFolder}
        onNoteSelect={setSelectedNote}
        onAddFolder={handleAddFolder}
        onAddNote={handleAddNote}
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
  );
}

