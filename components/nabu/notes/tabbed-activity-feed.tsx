/**
 * Tabbed Activity Feed Component
 * 
 * Provides tabbed interface for viewing:
 * - Thoughts (default)
 * - Notes (all notes across folders)
 * 
 * Syncs tab state with URL search params for browser navigation support
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThoughtsActivityFeed } from "./thoughts-activity-feed";
import { NotesActivityFeed } from "./notes-activity-feed";
import { Lightbulb, FileText } from "lucide-react";

interface TabbedActivityFeedProps {
  onNoteSelect?: (noteId: string, folderId: string) => void;
  initialTab?: "thoughts" | "notes";
}

export function TabbedActivityFeed({ onNoteSelect, initialTab }: TabbedActivityFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or prop, default to "thoughts"
  const urlTab = searchParams.get("tab") as "thoughts" | "notes" | null;
  const [activeTab, setActiveTab] = useState<"thoughts" | "notes">(
    initialTab || urlTab || "thoughts"
  );

  // Sync with URL when it changes (browser back/forward)
  // Also set default tab in URL if not present
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as "thoughts" | "notes" | null;
    if (tabFromUrl && (tabFromUrl === "thoughts" || tabFromUrl === "notes")) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && initialTab) {
      setActiveTab(initialTab);
      // Update URL to include default tab
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", initialTab);
      router.replace(`/notes?${params.toString()}`, { scroll: false });
    } else if (!tabFromUrl) {
      // Default to thoughts and update URL
      setActiveTab("thoughts");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "thoughts");
      router.replace(`/notes?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, initialTab, router]);

  /**
   * Handle tab change - update URL without page reload
   */
  const handleTabChange = (value: string) => {
    const newTab = value as "thoughts" | "notes";
    setActiveTab(newTab);
    
    // Update URL with new tab param, preserving other params
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`/notes?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
      {/* Tab Headers */}
      <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
        <TabsTrigger 
          value="thoughts" 
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Thoughts
        </TabsTrigger>
        <TabsTrigger 
          value="notes"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
        >
          <FileText className="h-4 w-4 mr-2" />
          Notes
        </TabsTrigger>
      </TabsList>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <TabsContent value="thoughts" className="h-full mt-0 data-[state=inactive]:hidden flex flex-col">
          <ThoughtsActivityFeed 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
          />
        </TabsContent>

        <TabsContent value="notes" className="h-full mt-0 data-[state=inactive]:hidden flex flex-col">
          <NotesActivityFeed 
            onNoteSelect={onNoteSelect}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

