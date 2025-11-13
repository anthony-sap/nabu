"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Folder, Loader2, Check, AlertCircle, Trash2, Sparkles, X } from "lucide-react";
import { LexicalEditor, type MentionItem, type LinkItem } from "./lexical-editor";
import { SourceUrlList, SourceInfo } from "./source-url-list";
import { RelatedLinksList } from "./related-links-list";
import { TagBadge } from "./tag-badge";
import { TagSuggestionNotification } from "./tag-suggestion-notification";
import { TagSuggestionModal } from "./tag-suggestion-modal";
import { AddLinkDialog } from "./add-link-dialog";
import { BreadcrumbNav } from "./breadcrumb-nav";
import { toast } from "sonner";

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
  const [sourceUrls, setSourceUrls] = useState<SourceInfo[]>([]);
  
  // Track initial values to detect changes (dirty state)
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [initialEditorState, setInitialEditorState] = useState("");

  // Tag suggestion state
  const [tags, setTags] = useState<Array<{
    id: string;
    name: string;
    color?: string | null;
    source?: "USER_ADDED" | "AI_SUGGESTED";
    confidence?: number | null;
  }>>([]);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<Array<{
    name: string;
    confidence?: number;
  }>>([]);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showSuggestionNotification, setShowSuggestionNotification] = useState(false);

  // Content-based tags and mentions state
  const [contentTags, setContentTags] = useState<MentionItem[]>([]);
  const [contentMentions, setContentMentions] = useState<MentionItem[]>([]);
  const isSyncingTags = useRef(false); // Prevent infinite loops

  // Links state
  const [links, setLinks] = useState<LinkItem[]>([]);
  const isSyncingLinks = useRef(false); // Prevent infinite loops

  

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

      // Load tags
      if (data.noteTags && Array.isArray(data.noteTags)) {
        setTags(data.noteTags.map((nt: any) => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color,
          source: nt.source,
          confidence: nt.confidence,
        })));
      }

      // Load links
      if (data.outgoingLinks && Array.isArray(data.outgoingLinks)) {
        setLinks(data.outgoingLinks.map((link: any) => ({
          id: link.id,
          toNoteId: link.toNoteId,
          toNoteTitle: link.toNoteTitle,
        })));
      }

      // Check for pending job and load existing suggestions if completed
      if (data.pendingJobId) {
        setPendingJobId(data.pendingJobId);
        
        // Fetch job status to check if suggestions are ready
        try {
          const jobResponse = await fetch(`/api/nabu/tag-suggestions/${data.pendingJobId}`);
          
          if (jobResponse.status === 404) {
            // Job doesn't exist (deleted or invalid), clear stale pendingJobId from state
            console.log("Tag suggestion job not found, clearing stale pendingJobId");
            setPendingJobId(null);
            // Will be cleared from DB on next save
            return;
          }
          
          if (jobResponse.ok) {
            const jobData = await jobResponse.json();
            
            // If job is completed, load suggestions (even if already reviewed)
            if (jobData.status === "COMPLETED") {
              setSuggestedTags(jobData.suggestedTags.map((name: string) => ({
                name,
                confidence: jobData.confidence,
              })));
              
              // Only show notification if not yet reviewed
              if (!jobData.consumed) {
                setShowSuggestionNotification(true);
              }
            }
          }
        } catch (jobError) {
          console.error("Failed to load tag suggestion job:", jobError);
          // On error, clear the pendingJobId to allow new suggestions
          setPendingJobId(null);
        }
      }
    } catch (error) {
      console.error("Failed to load note:", error);
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Request tag suggestions from AI
   */
  const requestTagSuggestions = useCallback(async () => {
    if (content.length < 200 || tags.length > 0 || pendingJobId) {
      return; // Skip if content too short, has any tags, or job already pending
    }

    try {
      const response = await fetch("/api/nabu/tag-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "NOTE",
          entityId: noteId,
          content,
        }),
      });

      if (response.status === 429) {
        // Cooldown active, silently skip
        console.log("Tag suggestion cooldown active");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPendingJobId(data.jobId);
      }
    } catch (error) {
      console.error("Error requesting tag suggestions:", error);
      // Fail gracefully, don't block save
    }
  }, [content, noteId, tags.length, pendingJobId]);

  /**
   * Poll for tag suggestion job status
   */
  useEffect(() => {
    if (!pendingJobId) return;

    let pollCount = 0;
    const maxPolls = 20; // 1 minute timeout

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/nabu/tag-suggestions/${pendingJobId}`);
        
        if (!response.ok) {
          clearInterval(pollInterval);
          setPendingJobId(null);
          return;
        }

        const data = await response.json();

        if (data.status === "COMPLETED") {
          clearInterval(pollInterval);
          setSuggestedTags(data.suggestedTags.map((name: string) => ({
            name,
            confidence: data.confidence,
          })));
          setShowSuggestionNotification(true);
          // Don't clear pendingJobId here - modal needs it to render
        } else if (data.status === "FAILED") {
          clearInterval(pollInterval);
          setPendingJobId(null);
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setPendingJobId(null);
        }
      } catch (error) {
        console.error("Error polling tag suggestion:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [pendingJobId]);

  /**
   * Handle accepting suggested tags
   */
  const handleAcceptTags = async (selectedTagNames: string[]) => {
    if (!pendingJobId) return;

    try {
      const response = await fetch(`/api/nabu/tag-suggestions/${pendingJobId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames: selectedTagNames }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept tags");
      }

      // Reload note to get updated tags
      await loadNote();
      setSuggestedTags([]);
      setShowSuggestionNotification(false);
      setShowSuggestionModal(false);
      setPendingJobId(null);
    } catch (error) {
      console.error("Error accepting tags:", error);
      throw error;
    }
  };

  /**
   * Handle rejecting suggested tags
   */
  const handleRejectTags = async () => {
    if (!pendingJobId) return;

    try {
      const response = await fetch(`/api/nabu/tag-suggestions/${pendingJobId}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reject tags");
      }

      setSuggestedTags([]);
      setShowSuggestionNotification(false);
      setShowSuggestionModal(false);
      setPendingJobId(null);
    } catch (error) {
      console.error("Error rejecting tags:", error);
      throw error;
    }
  };

  /**
   * Handle tags changed in editor content
   * Syncs tags with database in real-time
   */
  const handleTagsChanged = useCallback(async (newTags: MentionItem[]) => {
    // Skip if already syncing to prevent loops
    if (isSyncingTags.current) return;
    
    
    setContentTags(newTags);

    try {
      isSyncingTags.current = true;

      // Get current tag names from database
      const currentTagNames = new Set(tags.map(t => t.name.toLowerCase()));
      const newTagNames = new Set(newTags.map(t => t.value.toLowerCase()));

      // Find tags to add and remove
      const tagsToAdd = newTags
        .filter(t => !currentTagNames.has(t.value.toLowerCase()))
        .map(t => t.value);
      
      const tagsToRemove = tags
        .filter(t => !newTagNames.has(t.name.toLowerCase()) && t.source === "USER_ADDED")
        .map(t => t.name);
      
     

      // Add new tags
      if (tagsToAdd.length > 0) {
        const response = await fetch(`/api/nabu/notes/${noteId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagNames: tagsToAdd }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("📥 POST response full:", result);
          console.log("📥 POST response.data:", result.data);
          console.log("📥 POST response.data.tags:", result.data.tags);
          console.log("📥 POST response.data.tags.length:", result.data.tags?.length);
          console.log("🔄 About to call setTags with:", result.data.tags);
          setTags(result.data.tags);
          console.log("✅ setTags called");
        } else {
          console.error("❌ POST failed with status:", response.status);
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Error response:", errorData);
        }
      }

      // Remove tags that are no longer in content
      if (tagsToRemove.length > 0) {
        const response = await fetch(`/api/nabu/notes/${noteId}/tags`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagNames: tagsToRemove }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("📥 DELETE response:", result);
          console.log("🔄 Updating tags state to:", result.data.tags);
          setTags(result.data.tags);
        } else {
          console.error("❌ DELETE failed with status:", response.status);
        }
      }
    } catch (error) {
      console.error("Error syncing tags:", error);
    } finally {
      isSyncingTags.current = false;
    }
  }, [noteId, tags]);

  /**
   * Handle mentions changed in editor content
   * Syncs @mention links to database and stores mentions for display
   */
  const handleMentionsChanged = useCallback(async (newMentions: MentionItem[]) => {
    // Skip if already syncing to prevent loops
    if (isSyncingLinks.current) return;
    
    setContentMentions(newMentions);

    try {
      isSyncingLinks.current = true;
      
      // Filter only note mentions (ignore folders/thoughts)
      const noteMentions = newMentions.filter(m => m.type === "note");
      
      // Compare with database links
      const currentLinkIds = new Set(links.map(l => l.toNoteId));
      const newLinkIds = new Set(noteMentions.map(m => m.id));
      
      // Find differences
      const linksToAdd = noteMentions
        .filter(m => !currentLinkIds.has(m.id))
        .map(m => m.id);
      
      const linksToRemove = links
        .filter(l => !newLinkIds.has(l.toNoteId))
        .map(l => l.toNoteId);
      
      // Add new links
      if (linksToAdd.length > 0) {
        const response = await fetch(`/api/nabu/notes/${noteId}/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteIds: linksToAdd }),
        });

        if (response.ok) {
          const result = await response.json();
          setLinks(result.data.links);
        }
      }
      
      // Remove links
      if (linksToRemove.length > 0) {
        const response = await fetch(`/api/nabu/notes/${noteId}/links`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteIds: linksToRemove }),
        });

        if (response.ok) {
          const result = await response.json();
          setLinks(result.data.links);
        }
      }
    } catch (error) {
      // Silently fail - links will sync on next change
    } finally {
      isSyncingLinks.current = false;
    }
  }, [noteId, links]);

  /**
   * Handle deleting a link
   */
  const handleDeleteLink = async (noteId: string) => {
    try {
      const response = await fetch(`/api/nabu/notes/${noteId}/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds: [noteId] }),
      });

      if (response.ok) {
        const result = await response.json();
        setLinks(result.data.links);
        toast.success("Link removed");
      } else {
        toast.error("Failed to remove link");
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to remove link");
    }
  };

  /**
   * Handle adding a link (opens dialog)
   */
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);

  const handleAddLink = () => {
    setShowAddLinkDialog(true);
  };

  /**
   * Handle dismissing suggested tags
   */
  const handleDismissTags = async () => {
    if (!pendingJobId) return;

    try {
      const response = await fetch(`/api/nabu/tag-suggestions/${pendingJobId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss tags");
      }

      setSuggestedTags([]);
      setShowSuggestionNotification(false);
      setShowSuggestionModal(false);
      setPendingJobId(null);
    } catch (error) {
      console.error("Error dismissing tags:", error);
      throw error;
    }
  };

  /**
   * Handle removing a tag
   */
  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/nabu/notes/${noteId}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove tag");
      }

      setTags(tags.filter(t => t.id !== tagId));
      toast.success("Tag removed");
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
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

      // Request tag suggestions if eligible (will create new job if pendingJobId is null)
      await requestTagSuggestions();
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
    <div className="relative h-full flex flex-col bg-background overflow-hidden">
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Header with breadcrumb, actions, and save status - glassy and modern */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b border-border/30 flex-shrink-0 backdrop-blur-sm bg-background/60">
        <div className="flex items-center gap-4">
          {/* Breadcrumb navigation */}
          <BreadcrumbNav 
            items={[
              ...(folderName ? [{ label: folderName }] : []),
              { label: title || "Untitled Note" }
            ]}
          />
          
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>

        {/* Save status indicator and close button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && lastSaved && (
              <>
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="hidden md:inline">Saved at {formatSaveTime(lastSaved)}</span>
                <span className="md:hidden">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="hidden sm:inline">Failed to save</span>
              </>
            )}
          </div>
          
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <ScrollArea className="relative flex-1 overflow-y-auto">
        <div className="relative max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Title input - larger and more prominent */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled Note"
            className="w-full text-4xl font-serif font-bold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none focus:outline-none"
      />

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge
              key={tag.id}
              id={tag.id}
              name={tag.name}
              color={tag.color}
              source={tag.source}
              confidence={tag.confidence}
              onRemove={handleRemoveTag}
              removable={true}
            />
          ))}
        </div>
      )}

      {/* Tag suggestion notification */}
      {showSuggestionNotification && suggestedTags.length > 0 && (
        <TagSuggestionNotification
          suggestedTagsCount={suggestedTags.length}
          onOpenModal={() => setShowSuggestionModal(true)}
          onDismiss={handleDismissTags}
        />
      )}

      {/* Suggested tags display (for reference after review) */}
      {!showSuggestionNotification && suggestedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
          <span className="text-xs text-muted-foreground font-medium w-full mb-1">
            AI Suggested (for reference):
          </span>
          {suggestedTags.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="gap-1 text-xs border-dashed opacity-70"
            >
              <Sparkles className="h-3 w-3" />
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Lexical editor */}
          <div>
        <LexicalEditor
          value={content}
          editorState={editorState}
          onChange={(plainText, serializedState) => {
            setContent(plainText);
            setEditorState(serializedState);
          }}
          onSourceUrlsChanged={setSourceUrls}
          onTagsChanged={handleTagsChanged}
          onMentionsChanged={handleMentionsChanged}
          placeholder="Start writing your note..."
          showToolbar={true}
          autoFocus={true}
          noteId={noteId}
          className="min-h-[400px]"
        />
        
        {/* Display captured source URLs */}
        {sourceUrls.length > 0 && (
          <SourceUrlList sources={sourceUrls} className="mt-3" />
        )}

        {/* Display linked notes */}
        <RelatedLinksList 
          links={links} 
          onDeleteLink={handleDeleteLink}
          onAddLink={handleAddLink}
          className="mt-3" 
        />
      </div>
        </div>
      </ScrollArea>

      {/* Tag suggestion modal */}
      {pendingJobId && suggestedTags.length > 0 && (
        <TagSuggestionModal
          open={showSuggestionModal}
          onOpenChange={setShowSuggestionModal}
          jobId={pendingJobId}
          suggestions={suggestedTags}
          onAccept={handleAcceptTags}
          onReject={handleRejectTags}
          onDismiss={handleDismissTags}
        />
      )}

      {/* Add link dialog */}
      <AddLinkDialog
        open={showAddLinkDialog}
        onOpenChange={setShowAddLinkDialog}
        noteId={noteId}
        onLinkAdded={setLinks}
      />
    </div>
  );
}

