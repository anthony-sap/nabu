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
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <TabsContent value="thoughts" className="h-full mt-0 data-[state=inactive]:hidden flex flex-col">
          <ThoughtsActivityFeed 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="notes" className="h-full mt-0 data-[state=inactive]:hidden flex flex-col">
          <NotesActivityFeed 
            onNoteSelect={onNoteSelect}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

