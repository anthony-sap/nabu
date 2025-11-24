# Note Version History Feature

## Feature Summary

Implemented a comprehensive revision history system for notes that automatically creates version snapshots, allows manual versioning, and enables users to preview and restore previous versions with full Lexical editor state preservation.

## Phase

Phase: Notes & Organization (Enhanced)

## Initial Request

User requested:
1. Notes revision history version feature
2. Lexical's built-in history is only in-memory for current session
3. Need real audit trail and "restore this older version" across reloads, devices, and time
4. Treat Lexical as a pure editor and snapshot in the database
5. Automatic versioning every 5 minutes
6. Manual version snapshots with descriptions
7. Smart retention rules: max 50 autosave versions OR 90 days
8. Create backup version before restoring so we can undo

## Implementation Details

### 1. Database Schema

#### NoteVersion Model

Created new `NoteVersion` model in `prisma/schema.prisma`:

- **Core Fields:**
  - `id`, `noteId`, `tenantId` - Standard identification
  - `title`, `content`, `contentState` - Snapshot of note content
  - `reason` - "autosave" | "manual" | "restore"
  - `versionNumber` - Sequential version number per note
  - `changesSummary` - Optional description for manual versions

- **Audit Fields:**
  - `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
  - `deletedAt`, `deletedBy` - For soft delete support

- **Indexes:**
  - `[noteId, createdAt]` - Efficient chronological queries
  - `[noteId, reason]` - Filter by version type
  - `[tenantId]` - Multi-tenancy support

#### Relations

- `Note.versions` - One-to-many relation to NoteVersion
- `Tenant.NoteVersion` - Multi-tenancy support

### 2. Core Service Logic

**File:** `lib/note-version-service.ts`

#### Key Functions

1. **`shouldCreateVersion(noteId)`**
   - Checks if 5+ minutes elapsed since last autosave version
   - Returns boolean indicating whether to create new version

2. **`createVersion(noteId, reason, userId, changesSummary?)`**
   - Snapshots current note state
   - Assigns sequential version number
   - Triggers pruning asynchronously
   - Supports autosave, manual, and restore reasons

3. **`pruneOldVersions(noteId)`**
   - Applies retention rules to autosave versions only
   - Keeps: min(50 latest, last 90 days)
   - Never prunes manual or restore versions
   - Soft deletes old versions

4. **`getVersionHistory(noteId, userId, tenantId, options)`**
   - Returns paginated list of versions
   - Supports filtering by reason
   - Verifies note ownership

5. **`getVersion(versionId, userId, tenantId)`**
   - Fetches specific version with full content
   - Includes Lexical contentState for formatting preservation

6. **`restoreVersion(noteId, versionId, userId, tenantId)`**
   - Creates backup version before restoring
   - Atomic transaction ensures data safety
   - Updates note with restored content
   - Returns both updated note and backup version

### 3. API Endpoints

**Base Path:** `/api/nabu/notes/[id]/versions/`

1. **GET `/api/nabu/notes/[id]/versions`**
   - List versions with pagination
   - Query params: `page`, `limit`, `reasonFilter`
   - Returns: `{ versions, pagination }`

2. **POST `/api/nabu/notes/[id]/versions`**
   - Create manual version snapshot
   - Body: `{ reason: "manual", changesSummary?: string }`
   - Returns: Created version object

3. **GET `/api/nabu/notes/[id]/versions/should-create`**
   - Check if autosave version should be created
   - Returns: `{ shouldCreate: boolean }`

4. **GET `/api/nabu/notes/[id]/versions/[versionId]`**
   - Get specific version details
   - Returns: Full version with content and metadata

5. **POST `/api/nabu/notes/[id]/versions/[versionId]/restore`**
   - Restore version to current note
   - Creates backup before overwriting
   - Returns: Updated note and backup version

### 4. Editor Integration

**File:** `components/nabu/notes/note-editor.tsx`

#### Auto-versioning Logic

Modified `saveToServer()` callback:
- After successful save, checks `should-create` endpoint
- If true, creates autosave version in background (fire-and-forget)
- Doesn't block or slow down the save operation
- Triggers pruning automatically

#### UI Components Added

1. **History Button** - Opens version history panel
2. **Save Version Button** - Opens manual version dialog

Both buttons are in the editor header, next to save status indicator.

### 5. UI Components

#### ManualVersionDialog (`manual-version-dialog.tsx`)

- Simple dialog with optional description textarea
- 500 character limit with counter
- Creates manual version on submit
- Shows success toast and refreshes history

#### VersionHistoryPanel (`version-history-panel.tsx`)

- Collapsible sidebar panel (replaces metadata sidebar when open)
- Shows chronological list of versions (newest first)
- Each version displays:
  - Version number and type badge (Auto/Manual/Restore)
  - Relative timestamp ("5 minutes ago")
  - Creator name
  - Title preview
  - Changes summary (for manual versions)
- Actions: Preview, Restore
- Pagination with "Load More" button
- Empty state with helpful message

#### VersionPreviewModal (`version-preview-modal.tsx`)

- Full-screen modal showing version details
- Displays:
  - Version metadata (number, type, timestamp, creator)
  - Changes summary (if available)
  - Title
  - Read-only Lexical editor with formatting preserved
- Actions:
  - "Close" - Dismiss modal
  - "Restore This Version" - Shows confirmation dialog
- Confirmation dialog warns about backup creation
- Handles restore via API and reloads note

### 6. Version Flow

#### Automatic Versioning Flow

1. User edits note
2. Auto-save triggers every 60 seconds (saves to server)
3. `saveToServer()` checks if 5+ minutes since last autosave version
4. If yes, creates autosave version in background
5. Pruning runs automatically to enforce retention rules

#### Manual Versioning Flow

1. User clicks "Save Version" button
2. Dialog opens with optional description field
3. User enters description and submits
4. API creates manual version immediately
5. Success toast shown, history panel refreshes

#### Restore Flow

1. User opens version history panel
2. Clicks "Preview" on desired version
3. Preview modal shows full content
4. User clicks "Restore This Version"
5. Confirmation dialog appears
6. On confirm:
   - Backend creates backup version with reason="restore"
   - Backend updates note with restored content
   - Frontend reloads note (including Lexical editor state)
   - Lexical `parseEditorState()` and `setEditorState()` preserve formatting
7. Success toast shown with backup confirmation

### 7. Retention Policy

**Rules:**
- Autosave versions: Keep max 50 OR last 90 days (whichever includes more)
- Manual versions: Never deleted
- Restore versions: Never deleted
- Pruning happens automatically after each version creation
- Soft delete used (deletedAt timestamp)

**Example Scenarios:**

| Scenario | Result |
|----------|--------|
| 40 autosave versions, all within 90 days | All kept |
| 60 autosave versions, all within 90 days | Oldest 10 deleted |
| 30 autosave versions, 10 are >90 days old | Oldest 10 deleted |
| 60 versions (40 auto, 20 manual), >90 days | Only old autosaves deleted, manual kept |

### 8. Key Design Decisions

1. **Fire-and-forget versioning** - Doesn't block saves or slow down UX
2. **Separate panel** - Version history replaces metadata sidebar to save space
3. **Lexical state preservation** - Full contentState stored and restored
4. **Backup on restore** - Safety net to undo accidental restores
5. **Sequential numbering** - Easy to reference specific versions
6. **Multi-tenancy support** - All operations respect tenant isolation
7. **Soft deletes** - Versions can be recovered if needed

### 9. Files Created/Modified

**Created:**
- `prisma/migrations/20251121064902_add_note_versions/migration.sql`
- `lib/note-version-service.ts`
- `app/api/nabu/notes/[id]/versions/route.ts`
- `app/api/nabu/notes/[id]/versions/should-create/route.ts`
- `app/api/nabu/notes/[id]/versions/[versionId]/route.ts`
- `app/api/nabu/notes/[id]/versions/[versionId]/restore/route.ts`
- `components/nabu/notes/manual-version-dialog.tsx`
- `components/nabu/notes/version-history-panel.tsx`
- `components/nabu/notes/version-preview-modal.tsx`

**Modified:**
- `prisma/schema.prisma` - Added NoteVersion model and relations
- `components/nabu/notes/note-editor.tsx` - Added version UI and auto-versioning
- `package.json` - Added date-fns dependency

### 10. Testing Scenarios

**Covered Scenarios:**
- ✅ Create note, edit multiple times, verify autosave versions created every 5 min
- ✅ Manual "Save Version" creates version immediately with description
- ✅ Version history panel shows all versions chronologically
- ✅ Preview shows correct content with Lexical formatting
- ✅ Restore old version preserves Lexical formatting
- ✅ Restore creates backup version before overwriting
- ✅ Pruning removes versions >50 and >90 days (autosave only)
- ✅ Manual/restore versions never pruned
- ✅ Multi-tenancy: users only see their own note versions
- ✅ Version history pagination works correctly
- ✅ Restoring same version twice works correctly

### 11. Security Considerations

- All API endpoints verify note ownership via `getUserContext()`
- Tenant isolation enforced in all queries
- Versions inherit tenantId from parent note
- Soft delete prevents data loss
- Version creation uses audit fields (createdBy, updatedBy)

### 12. Performance Considerations

- Indexes on `[noteId, createdAt]` for efficient chronological queries
- Pagination prevents loading all versions at once
- Fire-and-forget versioning doesn't block saves
- Pruning runs asynchronously to avoid blocking
- Version check is lightweight (single query with limit 1)

### 13. Future Enhancements

Potential improvements:
- Diff view between two versions
- Bulk version operations (delete multiple)
- Version tags/labels
- Scheduled versions (e.g., daily snapshots)
- Version comments/annotations
- Export version history
- Compare current with specific version

## Conclusion

The note version history feature is fully implemented and provides a robust, user-friendly way to track and restore note changes. It balances automatic safety (autosave every 5 min) with user control (manual versions) while maintaining performance through smart retention policies.


