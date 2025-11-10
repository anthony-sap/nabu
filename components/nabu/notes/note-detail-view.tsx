"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Edit, Save, X } from "lucide-react";
import { FolderItem } from "./types";
import { LexicalEditor } from "./lexical-editor";

/**
 * Props for the NoteDetailView component
 */
interface NoteDetailViewProps {
  selectedNote: FolderItem | null;
}

/**
 * Component for displaying detailed view of a selected note
 * Shows note title, tags, and content with editing capabilities
 */
export function NoteDetailView({ selectedNote }: NoteDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [editorState, setEditorState] = useState("");

  // Empty state when no note is selected
  if (!selectedNote) {
    return (
      <Card className="h-full bg-card border-border shadow-nabu-card flex items-center justify-center">
        <CardContent className="text-center space-y-4 py-12">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-full border border-primary/30">
              <Folder className="h-16 w-16 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-serif font-bold text-foreground">
              Select a Note
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Choose a note from the sidebar to view its contents, or switch back to the
              feed to see community updates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-card border-border shadow-nabu-card flex flex-col">
      {/* Note header with title, tags, and edit button */}
      <CardHeader className="border-b border-border/50">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-serif font-bold text-foreground">
                {selectedNote.name}
              </h1>
            </div>
            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedNote.tags.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-primary/40 text-primary"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 font-semibold"
                  onClick={() => {
                    // TODO: Save note content
                    console.log("Saving note:", noteContent);
                    setIsEditing(false);
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 font-semibold"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Note
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {/* Note content area */}
      <ScrollArea className="flex-1">
        <CardContent className="pt-6">
          {isEditing ? (
            <div className="space-y-4">
              <LexicalEditor
                value={noteContent}
                editorState={editorState}
                onChange={(plainText, serializedState) => {
                  setNoteContent(plainText);
                  setEditorState(serializedState);
                }}
                placeholder="Start writing your note..."
                autoFocus
                showToolbar
                className="min-h-[400px]"
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {noteContent ? (
                <div className="text-foreground whitespace-pre-wrap">
                  {noteContent}
                </div>
              ) : (
                <div className="text-muted-foreground space-y-4">
                  <p className="leading-relaxed">
                    This note is empty. Click "Edit Note" to start writing.
                  </p>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <h3 className="font-serif font-semibold text-foreground mb-2">
                      Rich Text Editing
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li>Format text with bold, italic, and underline</li>
                      <li>Organize your thoughts with structured content</li>
                      <li>All formatting is preserved when you save</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

