<!-- 935aadcf-24cb-4e16-8890-82d464a590f1 b1b9f0af-4f88-4ee9-bf06-0324c3b3bb14 -->
# Auto-Delete Notes & Trash Page Feature

## Overview

Add automatic permanent deletion of notes 60 days after soft delete, with smart file cleanup and a trash page UI for viewing/restoring deleted notes.

## Database Changes

### Schema Updates (`prisma/schema.prisma`)

- Add `deletedBy` field to `Note` model (currently missing based on audit standards)
- Add `deletedBy` field to `Attachment` model (currently missing)
- No migration needed for fields that already exist

### Migration

Create migration to add missing `deletedBy` fields to maintain audit trail consistency.

## Background Job - Automatic Deletion

### Edge Function: `supabase/functions/process-trash-cleanup/index.ts`

**Standalone edge function** (similar to `process-pending-embeddings`):

- Finds notes where `deletedAt < NOW() - 60 days`
- For each note, identifies associated files (Attachments & ImageAttachments)
- Checks if files are referenced by other active notes/thoughts
- Deletes unreferenced files from Supabase storage
- Performs **hard delete** on database records:
  - Delete NoteChunks (cascade will handle via FK)
  - Delete NoteTags (cascade will handle via FK)
  - Delete NoteLinks (cascade will handle via FK)
  - Delete unreferenced Attachments
  - Delete unreferenced ImageAttachments
  - Hard delete the Note itself using raw SQL to bypass middleware
- Process in batches (10-20 notes per run) with tenant-based parallelization
- Logs all deletions to AuditLog

### pg_cron Configuration

- Create new cron job: `cleanup-old-deleted-notes`
- Run daily at 2 AM UTC: `0 2 * * *`
- Calls the edge function to process deletions
- Separate job per tenant (scalable design) - use dynamic scheduling

## API Endpoints

### New Endpoints

**GET `/api/nabu/trash`**

- Returns deleted notes for current tenant/user
- Direct Prisma query bypassing soft-delete middleware
- Query: `WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC`
- Include counts of: attachments, images, chunks, tags
- Pagination support (25 items per page)

**POST `/api/nabu/trash/restore`**

- Restore single or multiple notes
- Body: `{ noteIds: string[] }`
- Sets `deletedAt = null`, `deletedBy = null`
- Returns restored note(s)

**DELETE `/api/nabu/trash/permanent`**

- Permanently delete notes immediately (bypass 60-day wait)
- Body: `{ noteIds: string[] }`
- Same cleanup logic as background job
- Requires ownership verification

## Frontend - Trash Page

### Page: `app/nabu/trash/page.tsx`

- Located at `/trash` route (Nabu layout)
- Server component that fetches initial trash data
- Displays deleted notes with deletion date and countdown to permanent deletion

### Component: `components/nabu/trash/trash-page.tsx`

Main client component with:

- **List view** of deleted notes (similar to notes-activity-page styling)
- Each item shows:
  - Note title & preview
  - Deleted date & "Permanently deleted in X days"
  - Attachment/image count
  - Restore & Delete buttons
- **Bulk actions**: Select multiple, restore all, delete all
- **Search/filter**: Filter by date, search by title
- **Empty state**: "Trash is empty" placeholder
- Styling matches Nabu notes page (reuse components where possible)

### Component: `components/nabu/trash/trash-item.tsx`

Individual trash item component:

- Note preview card
- Action buttons (Restore, Permanent Delete)
- Confirmation dialog for permanent deletion

## Navigation Updates

### Add Trash Link to Nabu Navigation

**File**: `config/nabu.ts`

- Add trash navigation item: `{ title: "Trash", href: "/trash", icon: "trash" }`

### Update Icons (if needed)

**File**: `components/shared/icons.tsx`

- Ensure `trash` icon is available (likely `Trash2` from lucide-react)

## Documentation Updates

### FAQ Page Updates

**File**: `app/(marketing)/faq/page.tsx`

- Add section about trash and auto-deletion
- Explain 60-day retention policy
- Document restore functionality

### Feature Documentation

**File**: `.devreadyai/completed-features/trash-auto-delete_details.md`

- Document implementation details
- Architecture decisions
- Edge function logic
- File cleanup strategy

## Testing Strategy

### Manual Testing

1. Soft delete notes → verify they appear in trash
2. Restore notes → verify they reappear in notes list
3. Permanent delete → verify files are cleaned up
4. Test file reference checking (shared files not deleted)
5. Verify 60-day countdown display
6. Test bulk operations
7. Test edge function with test data (mock old deleted notes)

## Implementation Notes

### File Reference Checking Logic

Before deleting an Attachment or ImageAttachment:

```sql
-- Check if referenced by other active entities
SELECT COUNT(*) FROM "Attachment" a
WHERE a.id = :attachmentId
AND (
  (a.noteId IS NOT NULL AND EXISTS (
    SELECT 1 FROM "Note" n 
    WHERE n.id = a.noteId AND n.deletedAt IS NULL
  ))
  OR
  (a.thoughtId IS NOT NULL AND EXISTS (
    SELECT 1 FROM "Thought" t 
    WHERE t.id = a.thoughtId AND t.deletedAt IS NULL
  ))
)
```

### Bypassing Soft-Delete Middleware

For hard deletes in edge function and permanent delete endpoint:

- Use `prisma.$executeRaw` or `prisma.$queryRaw` for direct SQL
- Alternatively, create `prismaRaw` client without middleware for admin operations

### Tenant-Based Batch Processing

Edge function should:

- Query distinct tenants with old deleted notes
- Process each tenant's notes in parallel (up to 5 concurrent)
- Limit to 20 notes per tenant per run
- Prevents one tenant from blocking others

### To-dos

- [ ] Add missing deletedBy fields to Note and Attachment models in schema
- [ ] Create and apply Prisma migration for deletedBy fields
- [ ] Create process-trash-cleanup edge function with file cleanup logic
- [ ] Configure pg_cron job for daily trash cleanup
- [ ] Create GET /api/nabu/trash endpoint with direct query
- [ ] Create POST /api/nabu/trash/restore endpoint
- [ ] Create DELETE /api/nabu/trash/permanent endpoint
- [ ] Create trash page UI at /trash with list and bulk actions
- [ ] Build trash item components with restore/delete actions
- [ ] Add trash link to Nabu navigation config
- [ ] Update FAQ page with trash and auto-deletion information
- [ ] Create feature documentation in .devreadyai/completed-features