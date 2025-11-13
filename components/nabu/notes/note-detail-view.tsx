"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Edit, Save, X, Folder } from "lucide-react";
import { FolderItem } from "./types";
import { LexicalEditor } from "./lexical-editor";
import { BreadcrumbNav } from "./breadcrumb-nav";

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
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-full border border-primary/30 backdrop-blur">
              <Folder className="h-16 w-16 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-serif font-bold text-foreground">
              Select a Note
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose a note from the sidebar to view its contents, or switch back to the
              feed to see community updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb header */}
      <div className="pb-6">
        <BreadcrumbNav 
          items={[
            { label: selectedNote.name }
          ]}
        />
      </div>

      {/* Glassy card with note content */}
      <Card className="relative flex-1 bg-background/60 border-border/40 shadow-xl shadow-primary/5 backdrop-blur-md flex flex-col overflow-hidden">
        {/* Glassy shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
        {/* Note header with title, tags, and edit button */}
        <CardHeader className="relative border-b border-border/30">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-serif font-bold text-foreground">
                {selectedNote.name}
              </h1>
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedNote.tags.map((tag: string, idx: number) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-primary/40 text-primary bg-primary/5"
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
                    className="transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 font-semibold transition-all duration-200"
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
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 font-semibold transition-all duration-200"
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
        <ScrollArea className="relative flex-1">
          <CardContent className="relative pt-6 max-w-4xl mx-auto px-8">
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
              <div className="prose prose-base max-w-none prose-headings:font-serif prose-p:leading-relaxed">
                {noteContent ? (
                  <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {noteContent}
                  </div>
                ) : (
                  <div className="text-muted-foreground space-y-6">
                    <p className="text-base leading-relaxed">
                      This note is empty. Click "Edit Note" to start writing.
                    </p>
                    <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm">
                      <h3 className="font-serif font-semibold text-foreground mb-3 text-lg">
                        Rich Text Editing
                      </h3>
                      <ul className="space-y-2.5 text-sm text-muted-foreground">
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
    </div>
  );
}

