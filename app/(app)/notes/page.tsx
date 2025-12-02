import NotesActivityPage from "@/components/nabu/notes/notes-activity-page";

/**
 * Notes Activity Page Route
 * Displays the knowledge hub with activity feed and folder navigation
 * Supports optional noteId, thoughtId, and tab search params for direct access
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ noteId?: string; thoughtId?: string; tab?: string }>;
}) {
  const params = await searchParams;
  
  return <NotesActivityPage 
    initialNoteId={params.noteId} 
    initialThoughtId={params.thoughtId}
    initialTab={params.tab as "thoughts" | "notes" | undefined}
  />;
}

