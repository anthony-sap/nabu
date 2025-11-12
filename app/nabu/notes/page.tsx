import NotesActivityPage from "@/components/nabu/notes/notes-activity-page";

/**
 * Notes Activity Page Route
 * Displays the knowledge hub with activity feed and folder navigation
 * Supports optional noteId and thoughtId search params for direct access
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ noteId?: string; thoughtId?: string }>;
}) {
  const params = await searchParams;
  
  return <NotesActivityPage 
    initialNoteId={params.noteId} 
    initialThoughtId={params.thoughtId}
  />;
}

