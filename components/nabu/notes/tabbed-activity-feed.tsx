/**
 * Tabbed Activity Feed Component
 * 
 * Provides tabbed interface for viewing:
 * - Thoughts (default)
 * - Notes (all notes across folders)
 * - All (combined thoughts and notes)
 */

"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThoughtsActivityFeed } from "./thoughts-activity-feed";
import { NotesActivityFeed } from "./notes-activity-feed";
import { Lightbulb, FileText, LayoutGrid } from "lucide-react";

interface TabbedActivityFeedProps {
  onNoteSelect?: (noteId: string, folderId: string) => void;
}

export function TabbedActivityFeed({ onNoteSelect }: TabbedActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<"thoughts" | "notes" | "all">("thoughts");

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
        {/* Tab Triggers */}
        <div className="flex-shrink-0 border-b border-border/30 bg-background/60 backdrop-blur-sm">
          <TabsList className="w-full justify-start h-12 bg-transparent p-0 border-0">
            <TabsTrigger
              value="thoughts"
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Thoughts
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
            >
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="thoughts" className="h-full mt-0 data-[state=inactive]:hidden">
            <ThoughtsActivityFeed />
          </TabsContent>

          <TabsContent value="notes" className="h-full mt-0 data-[state=inactive]:hidden">
            <NotesActivityFeed onNoteSelect={onNoteSelect} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

