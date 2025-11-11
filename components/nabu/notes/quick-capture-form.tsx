"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { LexicalEditor } from "./lexical-editor";

/**
 * Props for the QuickCaptureForm component
 */
interface QuickCaptureFormProps {
  onSave: (title: string, content: string) => void;
}

/**
 * Form component for quickly capturing new thoughts
 * Features keyboard shortcuts for improved UX:
 * - Enter in title field moves focus to content
 * - Cmd/Ctrl + Enter in content saves the thought
 */
export function QuickCaptureForm({ onSave }: QuickCaptureFormProps) {
  const [newThought, setNewThought] = useState({ 
    title: "", 
    content: "",
    editorState: "" 
  });

  /**
   * Handles saving a new thought and resetting the form
   */
  const handleSave = () => {
    if (!newThought.title.trim() && !newThought.content.trim()) {
      return;
    }
    
    onSave(newThought.title, newThought.content);
    setNewThought({ title: "", content: "", editorState: "" });
  };

  return (
    <div className="space-y-4 p-5 rounded-lg bg-card/30 border border-border/10">
      <div className="space-y-4">
          <div className="space-y-2.5">
            {/* Title input field */}
            <input
              type="text"
              placeholder="Thought title..."
              value={newThought.title}
              onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
              className="w-full px-3 py-2 bg-background/50 border border-border/30 rounded-md text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  document.getElementById('thought-content')?.focus();
                }
              }}
            />
            
            {/* Content editor */}
            <LexicalEditor
              value={newThought.content}
              editorState={newThought.editorState}
              onChange={(plainText, serializedState) => 
                setNewThought({ 
                  ...newThought, 
                  content: plainText,
                  editorState: serializedState 
                })
              }
              placeholder="What's on your mind?"
              className="min-h-[80px]"
            />
          </div>
          
          {/* Action bar with keyboard shortcut hint and save button */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] border border-border/20">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] border border-border/20 ml-1">Enter</kbd>
              <span className="ml-1.5">to save</span>
            </p>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!newThought.title.trim() && !newThought.content.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Capture
            </Button>
          </div>
        </div>
    </div>
  );
}

