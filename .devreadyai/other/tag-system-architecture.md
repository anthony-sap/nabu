# Tag System Architecture

This document explains how tags flow through the product—from Lexical mentions to Prisma models—so new contributors can reason about UX behavior, database invariants, and background jobs without re‑reading the entire codebase.

---

## Platform Responsibilities

1. **Capture** – recognize `#hashtags` (and future `/commands`) inline inside the Lexical editor, including newly created tag names.
2. **Sync** – keep the editor state, metadata sidebar, and Prisma-backed NoteTag join table in sync with soft-delete semantics.
3. **Suggest** – surface AI-generated tag candidates when content meets the configured thresholds and let users accept/dismiss them.
4. **Retrieve** – expose tags as chips, filters, and search facets so both keyword and semantic search can narrow by tag context.
5. **Audit** – every tag mutation must honor multi-tenant audit fields (`tenantId`, `createdBy`, `deletedAt`, …) enforced by Prisma middleware.

---

## System Map

| Layer | Responsibilities | Key files |
| --- | --- | --- |
| Lexical plugins | Mention dropdown, hashtag capture, source tracking | `components/nabu/notes/lexical-*.tsx` |
| Note editor shell | React state, debounce + diffing, API orchestration | `components/nabu/notes/note-editor.tsx` |
| REST APIs | CRUD on tags, mentions autocomplete, tag suggestion jobs | `app/api/nabu/{mentions,notes/[id]/tags,tag-suggestions}` |
| DB + middleware | Tag / NoteTag models, audit enforcement, soft delete/restore | `prisma/schema.prisma`, `lib/dbMiddleware.ts` |
| Background workers | AI tagging pipeline (Supabase Edge Function) | `supabase/functions/process-tag-suggestion` |
| Search | Tag filters, hybrid ranking, `/api/nabu/search` | `app/api/nabu/search/route.ts`, `components/nabu/notes/search-dialog.tsx` |

---

## 1. Editor Capture & Mentions

### `BeautifulMentionsPlugin` (inside `lexical-editor.tsx`)
- Triggers: `["@", "#", "/"]`; `#` drives tag creation.
- `onSearch` hits `/api/nabu/mentions` to fetch up to 100 of the user’s most recent tags, folders, notes, and thoughts.
- The response normalizes to `{ id, value, type, description, color }` so downstream UI renders consistent pills.
- `creatable: true` + `allowSpaces` lets users type multi-word tags inline; we rely on `insertOnBlur` to finalize nodes even if the user clicks out.

### Search handler responsibilities
1. Debounce network calls (handled at the plugin level).
2. Send both the trigger (`#`, `@`, `/`) and the partial query string.
3. Filter the payload client-side with `startsWith` so we never expose someone else’s tag name (multi-tenant constraint).

---

## 2. TagSyncPlugin → Note Editor Glue

`components/nabu/notes/lexical-tag-sync-plugin.tsx` walks the Lexical AST after every editor update:
- Adds only nodes with `__trigger === "#"`.
- Deduplicates by node id/value to avoid duplicate POST calls.
- Debounces 500 ms via a `setTimeout` ref; prevents thrashing while the user types a long tag.
- Emits the sanitized `MentionItem[]` through `onTagsChanged`.

`note-editor.tsx` receives the callback and runs the reconciliation loop:
1. Short-circuits if another sync is in flight (`isSyncingTags.current` guard).
2. Builds `Set`s of lowercase names from DB (`tags`) vs. editor (`newTags`).
3. Diff logic:
   - `tagsToAdd` → POST `/api/nabu/notes/{noteId}/tags` (body `{ tagNames: string[] }`).
   - `tagsToRemove` → DELETE `/api/nabu/notes/{noteId}/tags` but only for `source === "USER_ADDED"` so AI suggestions stay visible until manually dismissed.
4. Each API response returns the canonical tag list via nested Prisma selects, so React state always reflects the DB truth.
5. Resets `isSyncingTags.current` to allow the next update.

Edge cases handled in code:
- Case-insensitive comparisons prevent duplicates like `#Ops` vs `#ops`.
- Removing tags inside the editor never hard deletes AI suggestions; those are managed by the tag suggestion modal.
- Tag badges (`components/nabu/notes/tag-badge.tsx`) visually differentiate `USER_ADDED` vs `AI_SUGGESTED` (solid vs dashed).

---

## 3. API Surface

### `/api/nabu/mentions` (GET)
- Collects the user’s notes, folders, thoughts, and tags scoped by `tenantId`, `userId`, and `deletedAt: null`.
- Serves as the single autocomplete feed for all mention triggers.
- Applies default ordering (`updatedAt desc`) and limits to prevent heavy payloads.

### `/api/nabu/notes/[id]/tags` (POST)
Workflow per tag name:
1. Confirm note ownership (user + tenant) and ensure note isn’t soft-deleted.
2. `findFirst` existing Tag; create if missing (restoring `deletedAt` when necessary).
3. Check for `NoteTag` in one of three states:
   - Active → skip.
   - Soft deleted → `update` to clear `deletedAt`, set `source` to `USER_ADDED`.
   - Missing → create new `NoteTag`.
4. Update `note.lastTagModifiedAt` to help the tag suggestion cooldown logic.
5. Return the entire active tag list via `note.noteTags` nested select to stay compatible with audit middleware.

### `/api/nabu/notes/[id]/tags` (DELETE)
- Looks up the referenced tags, then `updateMany` the `NoteTag` rows to set `deletedAt`.
- Never hard deletes; this preserves history and allows future restoration.
- Uses the same nested select response payload as POST.

### `/api/nabu/tag-suggestions`
- Creates `TagSuggestionJob` rows when content passes the configured thresholds (see `TAG_SUGGESTION_SETUP.md`).
- Edge Function `process-tag-suggestion` calls OpenAI, stores `suggestedTags`, and updates job status → frontend polls every 3 s via `tag-suggestion-notification.tsx` + `tag-suggestion-modal.tsx`.
- Accept/reject endpoints (`/[jobId]/accept`, `/reject`, `/dismiss`) update `NoteTag` records and note cooldown timestamps.

---

## 4. Data Model & Middleware

```prisma
model Tag {
  id        String     @id @default(cuid())
  tenantId  String?
  userId    String
  name      String
  color     String?
  type      TagType?
  status    StatusEnum @default(ENABLE)
  createdAt DateTime   @default(now())
  createdBy String?
  updatedAt DateTime   @updatedAt
  updatedBy String?
  deletedAt DateTime?
  noteTags  NoteTag[]

  @@unique([tenantId, userId, name])
}

model NoteTag {
  noteId     String
  tagId      String
  tenantId   String?
  source     TagSource @default(USER_ADDED)
  confidence Float?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([noteId, tagId])
}
```

Middleware guarantees:
- All queries automatically scope by `tenantId` + soft delete flags; never query NoteTag standalone if you need related Tag metadata—always go through `note.noteTags` to inherit middleware filters.
- Restore-before-create rule: attempting to `create` a NoteTag without checking `deletedAt` will violate the composite PK.

---

## 5. AI Tag Suggestion Pipeline

1. Auto-save (3 s idle) checks eligibility:
   - Content ≥ `TAG_SUGGESTION_MIN_CHARS` (default 200).
   - Fewer than 3 existing tags.
   - Cooldown (`TAG_SUGGESTION_COOLDOWN_MINUTES`, default 5) expired.
   - No pending `TagSuggestionJob`.
2. `/api/nabu/tag-suggestions` inserts job row with note/thought content.
3. Supabase database webhook fires → `process-tag-suggestion` Edge Function:
   - Calls OpenAI `gpt-4o-mini`.
   - Assigns confidence per tag and overall job confidence.
   - Handles retries (max 3) with exponential backoff; marks failures with `error` text.
4. Frontend polls job status:
   - Completed → show toast + open modal listing suggested tags.
   - Accepting tags hits `/accept` with subset of `tagNames`, which reuses the same POST logic as manual tags but marks source `AI_SUGGESTED`.
   - Reject/dismiss updates cooldown so users aren’t spammed.

Tag badges show AI suggestions with dashed borders + sparkle icon; accepting them converts tags to standard chips but keeps the `source` metadata for analytics.

---

## 6. Retrieval & Search

- Hybrid search endpoint (`/api/nabu/search`) weights keyword (0.4) and vector (0.6) scores; tag filters in the UI narrow results by selected tag IDs.
- `components/nabu/notes/search-dialog.tsx` provides keyboard-driven filtering with tag pills.
- Storage + metadata views reuse tags:
  - `metadata-sidebar.tsx` lists active tags and allows removal.
  - `notes-sidebar.tsx` shows tag filter groups.
  - `search-command.tsx` surfaces recent tags for quick navigation.

Because vector search runs against `NoteChunk` / `ThoughtChunk`, tags act as secondary filters rather than direct vector dimensions—keeping the chunk vectors focused on semantic content.

---

## 7. Testing & Debug Checklist

- Create → Remove → Re-add the same `#tag` to verify restore logic (no duplicate DB rows).
- Tag search respects multi-tenant scoping (log in as another tenant to verify isolation).
- AI suggestions:
  - Verify cooldown prevents immediate re-suggestion.
  - Accept some tags → ensure badges switch from dashed to solid and `source` updates.
  - Reject all suggestions → job marked `consumed` and UI stops polling.
- Mention dropdown:
  - Returns newly created tags immediately after POST.
  - Handles uppercase/lowercase differences.
- Audit compliance:
  - `Tag.createdBy` / `NoteTag.updatedBy` autopopulate via `lib/dbMiddleware.ts`.
  - Soft-deleted tags stay hidden from autocomplete/search.

Use `SEMANTIC_SEARCH_TESTING.md` for holistic regression (tags are part of hybrid filters) and `TAG_SUGGESTION_SETUP.md` for deep AI pipeline validation.

---

## 8. File Reference

**Frontend**
- `components/nabu/notes/lexical-editor.tsx` – Editor shell + mention plugin wiring.
- `components/nabu/notes/lexical-tag-sync-plugin.tsx` – AST walker that emits hashtags.
- `components/nabu/notes/note-editor.tsx` – Diff logic + API calls.
- `components/nabu/notes/tag-badge.tsx` – Visual treatment for user vs AI tags.
- `components/nabu/notes/tag-suggestion-modal.tsx` / `tag-suggestion-notification.tsx` – AI workflow UI.
- `components/nabu/notes/search-dialog.tsx` – Tag filters inside global search.

**APIs**
- `app/api/nabu/mentions/route.ts`
- `app/api/nabu/notes/[id]/tags/route.ts`
- `app/api/nabu/tag-suggestions/*`
- `app/api/nabu/search/route.ts`

**Background**
- `supabase/functions/process-tag-suggestion/index.ts` – Tag suggestion job worker.
- `supabase/functions/generate-embedding/index.ts` – Indirect dependency; tag filters pair with semantic search results.

**Database & Shared**
- `prisma/schema.prisma` – Tag/NoteTag definitions, enums.
- `lib/dbMiddleware.ts` – Tenant + soft delete enforcement.
- `TAG_SUGGESTION_SETUP.md` – Deployment runbook.
- `DEBUG_SEMANTIC_SEARCH.md` – Tips for hybrid search investigations.

Keep this doc updated whenever mention triggers, API payloads, or background job contracts change; future auditing depends on it.