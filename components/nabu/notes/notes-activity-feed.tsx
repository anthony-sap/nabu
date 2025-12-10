/**
 * Notes Activity Feed Component
 * 
 * Displays a paginated feed of ALL notes across all folders
 * Sorted by most recent first
 * 
 * Styled according to Nabu "Modern Scribe" Design System
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText, Plus, Lightbulb } from "lucide-react";
import { NoteSummaryCard } from "./note-summary-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NotesActivityFeedProps {
  onNoteSelect?: (noteId: string, folderId: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  folderId: string | null;
  tags: Array<{
    id: string;
    name: string;
    color?: string | null;
  }>;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function NotesActivityFeed({ onNoteSelect, activeTab, onTabChange }: NotesActivityFeedProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  /**
   * Fetch all notes (across all folders)
   */
  const fetchNotes = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/nabu/notes?page=${page}&limit=${pagination.limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const result = await response.json();

      if (result.success && result.data.notes) {
        // Transform notes to include tags
        const transformedNotes = result.data.notes.map((note: any) => ({
          id: note.id,
          title: note.title,
          content: note.content || "",
          updatedAt: note.updatedAt,
          folderId: note.folderId || null,
          tags: note.tags || [],
        }));

        setNotes(transformedNotes);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load notes on component mount
   */
  useEffect(() => {
    fetchNotes(1);
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    fetchNotes(newPage);
  };

  /**
   * Handle note click
   */
  const handleNoteClick = (noteId: string, folderId: string | null) => {
    if (onNoteSelect) {
      onNoteSelect(noteId, folderId || "");
    }
  };

  return (
    // Container: bg-transparent to inherit Paper Card background
    <div className="h-full flex flex-col bg-transparent">
      
      {/* Tab Switcher - Nabu Modern Scribe Style */}
      <div className="flex-shrink-0 max-w-6xl mx-auto w-full px-8 pt-6 pb-4">
        <Tabs value="notes" className="w-full">
          <TabsList className="w-full justify-start border-b border-[rgb(var(--nabu-deep))]/10 dark:border-white/10 rounded-none h-auto p-0 bg-transparent gap-6">
            {/* Thoughts Tab - Inactive */}
            <TabsTrigger 
              value="thoughts" 
              className="rounded-none border-b-2 px-0 pb-3 text-sm transition-all duration-200
                         data-[state=active]:border-[rgb(var(--nabu-mint))] 
                         data-[state=active]:text-[rgb(var(--nabu-deep))] data-[state=active]:font-bold
                         dark:data-[state=active]:text-white
                         border-transparent 
                         text-[rgb(var(--nabu-deep))]/40 dark:text-white/40
                         hover:text-[rgb(var(--nabu-deep))]/70 dark:hover:text-white/70
                         bg-transparent"
              onClick={() => onTabChange?.("thoughts")}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Thoughts
            </TabsTrigger>
            {/* Notes Tab - Active */}
            <TabsTrigger 
              value="notes"
              className="rounded-none border-b-2 px-0 pb-3 text-sm font-bold transition-all duration-200
                         border-[rgb(var(--nabu-mint))] 
                         text-[rgb(var(--nabu-deep))] dark:text-white
                         data-[state=inactive]:border-transparent 
                         data-[state=inactive]:text-[rgb(var(--nabu-deep))]/40 data-[state=inactive]:font-normal
                         dark:data-[state=inactive]:text-white/40
                         data-[state=inactive]:hover:text-[rgb(var(--nabu-deep))]/70 dark:data-[state=inactive]:hover:text-white/70
                         bg-transparent"
              onClick={() => onTabChange?.("notes")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Header Area - "All Notes" */}
      <div className="flex-shrink-0 max-w-6xl mx-auto w-full px-8 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Title: Serif font (Playfair Display), text-4xl, font-bold */}
            <h2 className="text-4xl font-serif font-bold text-[rgb(var(--nabu-deep))] dark:text-white">
              All Notes
            </h2>
            {/* Badge: Lapis themed */}
            <span className="bg-[rgb(var(--nabu-lapis))]/10 dark:bg-white/10 
                           text-[rgb(var(--nabu-lapis))] dark:text-white 
                           rounded-full text-xs font-bold px-3 py-1">
              {pagination.total} {pagination.total === 1 ? "note" : "notes"}
            </span>
          </div>
          
          {/* Create Note Button - Primary action with hover scale */}
          <button
            onClick={() => router.push("/notes?new=true")}
            className="flex items-center gap-2 
                       bg-nabu-mint text-white 
                       shadow-lg shadow-nabu-mint/20 
                       hover:bg-nabu-mint/90 hover:scale-105 
                       transition-all
                       rounded-xl font-bold text-sm px-5 py-2.5"
          >
            <Plus className="h-4 w-4" />
            Create Note
          </button>
        </div>
      </div>

      {/* Notes Feed */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 pb-6">
          {isLoading ? (
            // Loading skeletons with Nabu card styling
            <div className="space-y-4">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-[rgb(var(--nabu-deep))]/5 dark:border-white/5">
                  <Skeleton className="h-7 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            // Empty state
            <div className="h-full flex items-center justify-center py-20">
              <div className="text-center space-y-4 max-w-md">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-[rgb(var(--nabu-mint))]/10 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-[rgb(var(--nabu-mint))]/10 to-[rgb(var(--nabu-mint))]/5 rounded-full border border-[rgb(var(--nabu-mint))]/20">
                    <FileText className="h-12 w-12 text-[rgb(var(--nabu-mint))]/70" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-[rgb(var(--nabu-deep))] dark:text-white">
                    No Notes Yet
                  </h3>
                  <p className="text-sm text-[rgb(var(--nabu-deep))]/40 dark:text-white/40">
                    Start creating notes from your thoughts to see them here.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Notes list
            <div className="space-y-4">
              {notes.map((note) => (
                <NoteSummaryCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  content={note.content}
                  tags={note.tags}
                  updatedAt={note.updatedAt}
                  onClick={() => handleNoteClick(note.id, note.folderId)}
                />
              ))}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg
                             text-[rgb(var(--nabu-deep))]/60 dark:text-white/60
                             border border-[rgb(var(--nabu-deep))]/10 dark:border-white/10
                             hover:bg-[rgb(var(--nabu-deep))]/5 dark:hover:bg-white/10
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(pagination.totalPages)].map((_, idx) => {
                      const pageNum = idx + 1;
                      // Show first, last, current, and adjacent pages
                      const showPage =
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        Math.abs(pageNum - pagination.page) <= 1;

                      if (!showPage) {
                        // Show ellipsis once between groups
                        if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                          return (
                            <span key={pageNum} className="px-2 text-[rgb(var(--nabu-deep))]/40 dark:text-white/40">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className={`w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200
                            ${pageNum === pagination.page 
                              ? 'bg-[rgb(var(--nabu-mint))] text-white shadow-lg shadow-[rgb(var(--nabu-mint))]/20' 
                              : 'text-[rgb(var(--nabu-deep))]/60 dark:text-white/60 hover:bg-[rgb(var(--nabu-deep))]/5 dark:hover:bg-white/10'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || isLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg
                             text-[rgb(var(--nabu-deep))]/60 dark:text-white/60
                             border border-[rgb(var(--nabu-deep))]/10 dark:border-white/10
                             hover:bg-[rgb(var(--nabu-deep))]/5 dark:hover:bg-white/10
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
