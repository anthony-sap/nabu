/**
 * Notes Activity Feed Component
 * 
 * Displays a paginated feed of ALL notes across all folders
 * Sorted by most recent first
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { NoteSummaryCard } from "./note-summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface NotesActivityFeedProps {
  onNoteSelect?: (noteId: string, folderId: string) => void;
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

export function NotesActivityFeed({ onNoteSelect }: NotesActivityFeedProps) {
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
    <div className="h-full flex flex-col">
      {/* Notes Feed */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-6">
          {isLoading ? (
            // Loading skeletons
            <div className="space-y-4">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="p-6 border border-border/30 rounded-lg bg-card/50">
                  <Skeleton className="h-6 w-3/4 mb-3" />
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
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-full border border-primary/20">
                    <FileText className="h-12 w-12 text-primary/70" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-foreground">
                    No Notes Yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isLoading}
                  >
                    Previous
                  </Button>

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
                            <span key={pageNum} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

