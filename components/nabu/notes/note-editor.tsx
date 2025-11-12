"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Folder, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";
import { LexicalEditor } from "./lexical-editor";

/**
 * Props for the NoteEditor component
 */
interface NoteEditorProps {
  noteId: string;
  folderId: string;
  onClose?: () => void;
  onDelete?: () => void;
}

/**
 * Full-page note editor component with auto-save functionality
 * 
 * Features:
 * - Editable title field
 * - Lexical rich text editor for content
 * - Auto-save every 3 seconds after changes
 * - Visual save status indicator
 * - Folder context badge
 */
export function NoteEditor({ noteId, folderId, onClose, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editorState, setEditorState] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState<string | null>(null);
  
  // Track initial values to detect changes (dirty state)
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [initialEditorState, setInitialEditorState] = useState("");

  /**
   * Load note data on mount
   */
  useEffect(() => {
    loadNote();
  }, [noteId]);

  async function loadNote() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/nabu/notes/${noteId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load note");
      }

      const { data } = await response.json();
      const noteTitle = data.title || "";
      const noteContent = data.content || "";
      const noteEditorState = data.contentState || "";
      
      setTitle(noteTitle);
      setContent(noteContent);
      setEditorState(noteEditorState);
      
      // Store initial values for dirty checking
      setInitialTitle(noteTitle);
      setInitialContent(noteContent);
      setInitialEditorState(noteEditorState);
      
      // Set folder info if available
      if (data.folder) {
        setFolderName(data.folder.name);
        setFolderColor(data.folder.color);
      }
    } catch (error) {
      console.error("Failed to load note:", error);
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Manual save function
   */
  const saveNote = async () => {
    if (isLoading || saveStatus === "saving") return;
    
    setSaveStatus("saving");
    
    try {
      const response = await fetch(`/api/nabu/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          content, 
          contentState: editorState 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save note");
      }

      setSaveStatus("saved");
      setLastSaved(new Date());
      
      // Update initial values after successful save
      setInitialTitle(title);
      setInitialContent(content);
      setInitialEditorState(editorState);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("error");
    }
  };

  /**
   * Auto-save effect with 3-second debounce
   * Only triggers if content has actually changed (dirty state)
   */
  useEffect(() => {
    // Don't auto-save during initial load
    if (isLoading) return;
    
    // Check if content has actually changed (dirty state)
    const isDirty = 
      title !== initialTitle || 
      content !== initialContent || 
      editorState !== initialEditorState;
    
    // Don't auto-save if no changes
    if (!isDirty) {
      if (saveStatus === "idle") {
        setSaveStatus("saved");
      }
      return;
    }

    const timer = setTimeout(() => {
      saveNote();
    }, 3000); // 3 second debounce

    return () => clearTimeout(timer);
  }, [title, content, editorState, isLoading, initialTitle, initialContent, initialEditorState]);

  /**
   * Keyboard shortcut handler for Ctrl+S / Cmd+S
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content, editorState]);

  /**
   * Format last saved time
   */
  const formatSaveTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pt-6">
      {/* Header with back button, folder badge, and save status */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Note
            </Button>
          )}
          
          {folderName && (
            <Badge 
              variant="secondary" 
              className="gap-1.5 bg-secondary/15 text-secondary border-secondary/20 font-normal ml-2"
            >
              <Folder className="h-3 w-3" style={{ color: folderColor || undefined }} />
              {folderName}
            </Badge>
          )}
        </div>

        {/* Save status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && lastSaved && (
            <>
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>Saved at {formatSaveTime(lastSaved)}</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive">Failed to save</span>
            </>
          )}
        </div>
      </div>

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="w-full text-2xl font-semibold text-foreground placeholder:text-muted-foreground bg-transparent border-none focus:outline-none mb-6"
      />

      {/* Lexical editor */}
      <div className="flex-1 min-h-0">
        <LexicalEditor
          value={content}
          editorState={editorState}
          onChange={(plainText, serializedState) => {
            setContent(plainText);
            setEditorState(serializedState);
          }}
          placeholder="Start writing your note..."
          showToolbar={true}
          autoFocus={true}
          className="h-full"
        />
      </div>
    </div>
  );
}

