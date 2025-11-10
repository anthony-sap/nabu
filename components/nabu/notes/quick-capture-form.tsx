import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

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
  const [newThought, setNewThought] = useState({ title: "", content: "" });

  /**
   * Handles saving a new thought and resetting the form
   */
  const handleSave = () => {
    if (!newThought.title.trim() && !newThought.content.trim()) {
      return;
    }
    
    onSave(newThought.title, newThought.content);
    setNewThought({ title: "", content: "" });
  };

  return (
    <Card className="bg-card border-border shadow-nabu-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            {/* Title input field */}
            <input
              type="text"
              placeholder="Thought title..."
              value={newThought.title}
              onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
              className="w-full px-3 py-2 bg-muted/30 border border-input rounded-lg text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  document.getElementById('thought-content')?.focus();
                }
              }}
            />
            
            {/* Content textarea */}
            <textarea
              id="thought-content"
              placeholder="What's on your mind?"
              value={newThought.content}
              onChange={(e) => setNewThought({ ...newThought, content: e.target.value })}
              className="w-full px-3 py-2 bg-muted/30 border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary resize-none min-h-[80px] transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          
          {/* Action bar with keyboard shortcut hint and save button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border ml-1">Enter</kbd>
              <span className="ml-1.5">to save</span>
            </p>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!newThought.title.trim() && !newThought.content.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Capture
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

