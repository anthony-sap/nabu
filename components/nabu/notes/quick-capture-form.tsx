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
    <div className="relative space-y-4 p-6 rounded-xl bg-background/60 border border-border/40 shadow-xl shadow-primary/5 backdrop-blur-md overflow-hidden">
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
      <div className="relative space-y-4">
          <div className="space-y-3">
            {/* Title input field - larger and more prominent */}
            <input
              type="text"
              placeholder="Thought title..."
              value={newThought.title}
              onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-background/60 border border-border/40 rounded-lg text-base font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 backdrop-blur"
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
              className="min-h-[100px]"
            />
          </div>
          
          {/* Action bar with keyboard shortcut hint and save button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted/60 rounded text-[10px] border border-border/30 backdrop-blur">⌘</kbd>
              <kbd className="px-2 py-1 bg-muted/60 rounded text-[10px] border border-border/30 backdrop-blur ml-1">Enter</kbd>
              <span className="ml-2">to save</span>
            </p>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!newThought.title.trim() && !newThought.content.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary/25 transition-all duration-200"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
    </div>
  );
}

