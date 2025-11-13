# Tag System Architecture

## Overview

The tag system allows users to create and manage tags using the `#` mention syntax in the Lexical editor. Tags automatically sync with the database in real-time and can be searched, filtered, and created dynamically.

---

## 1. Frontend - Lexical Editor

### Mention Plugin (`lexical-editor.tsx`)

**Configuration:**
- Uses `BeautifulMentionsPlugin` with `onSearch` callback
- Dynamic fetching: Calls `/api/nabu/mentions` as user types
- Filters results with "starts with" logic
- `creatable: true` allows creating new tags
- Returns format: `{ id, value, type, description }`

**Key Props:**
```typescript
<BeautifulMentionsPlugin
  triggers={["@", "#", "/"]}
  onSearch={handleMentionSearch}
  creatable
  insertOnBlur
  autoSpace
  allowSpaces
/>
```

**Search Function:**
```typescript
const handleMentionSearch = async (trigger: string, queryString: string | null) => {
  // Fetch from API
  const response = await fetch("/api/nabu/mentions");
  const data = result.data;
  
  // Filter by trigger type
  if (trigger === "#") {
    const tags = data.tags || [];
    if (queryString) {
      return tags.filter(item => 
        item.value.toLowerCase().startsWith(queryString.toLowerCase())
      );
    }
    return tags;
  }
  // ... similar for @ and /
};
```

---

### Tag Tracking (`lexical-tag-sync-plugin.tsx`)

**Purpose:** Monitor editor for tag mentions and notify parent component

**Implementation:**
- Registers editor update listener
- Traverses all nodes looking for `custom-beautifulMention` with `trigger: "#"`
- Debounces (500ms) to avoid excessive calls
- Extracts tags and calls: `onTagsChanged(tags[])`
- Only notifies when tags actually change

**Key Code:**
```typescript
export function TagSyncPlugin({ onTagsChanged }: TagSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      setTimeout(() => {
        editorState.read(() => {
          const tags: MentionItem[] = [];
          
          function traverse(node: any) {
            if (node.__type === "custom-beautifulMention" && node.__trigger === "#") {
              tags.push({
                id: node.__data?.id || node.__value,
                value: node.__value,
                type: "tag",
              });
            }
            node.getChildren?.().forEach(child => traverse(child));
          }
          
          root.getChildren().forEach(child => traverse(child));
          onTagsChanged(tags);
        });
      }, 500);
    });
    
    return removeListener;
  }, [editor, onTagsChanged]);
}
```

---

## 2. Frontend - Note Editor

### State Management (`note-editor.tsx`)

**State Variables:**
- `tags` - All tags linked to note in database
- `contentTags` - Tags detected in editor content via TagSyncPlugin
- `isSyncingTags` - Ref to prevent infinite loops

**Callbacks:**
```typescript
<LexicalEditor
  onTagsChanged={handleTagsChanged}
  // ... other props
/>
```

---

### Sync Logic (`handleTagsChanged`)

**Flow:**
1. Receive new tags from TagSyncPlugin
2. Compare with current database tags
3. Determine tags to add and remove
4. Call APIs to sync
5. Update local state

**Implementation:**
```typescript
const handleTagsChanged = useCallback(async (newTags: MentionItem[]) => {
  if (isSyncingTags.current) return;
  
  setContentTags(newTags);
  isSyncingTags.current = true;

  // Compare tags
  const currentTagNames = new Set(tags.map(t => t.name.toLowerCase()));
  const newTagNames = new Set(newTags.map(t => t.value.toLowerCase()));

  // Find differences
  const tagsToAdd = newTags
    .filter(t => !currentTagNames.has(t.value.toLowerCase()))
    .map(t => t.value);
  
  const tagsToRemove = tags
    .filter(t => !newTagNames.has(t.name.toLowerCase()) && t.source === "USER_ADDED")
    .map(t => t.name);

  // Add new tags
  if (tagsToAdd.length > 0) {
    const response = await fetch(`/api/nabu/notes/${noteId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagNames: tagsToAdd }),
    });
    if (response.ok) {
      const { data } = await response.json();
      setTags(data.tags);
    }
  }

  // Remove tags
  if (tagsToRemove.length > 0) {
    const response = await fetch(`/api/nabu/notes/${noteId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagNames: tagsToRemove }),
    });
    if (response.ok) {
      const { data } = await response.json();
      setTags(data.tags);
    }
  }

  isSyncingTags.current = false;
}, [noteId, tags]);
```

**Important Notes:**
- Only removes `USER_ADDED` tags (preserves AI_SUGGESTED)
- Uses case-insensitive comparison
- Updates state with full tag list from API response

---

## 3. Backend - Tag APIs

### GET Mentions (`/api/nabu/mentions`)

**Purpose:** Provide autocomplete data for mention plugin

**Response Format:**
```typescript
{
  success: true,
  data: {
    notes: [{ id, value, description, type: "note" }],
    folders: [{ id, value, description, type: "folder" }],
    thoughts: [{ id, value, description, type: "thought" }],
    tags: [{ id, value, description, type: "tag", color }]
  }
}
```

**Query:**
```typescript
const tags = await prisma.tag.findMany({
  where: { userId, tenantId, deletedAt: null },
  select: { id, name, color, updatedAt },
  orderBy: { updatedAt: "desc" },
  take: 100,
});

// Transform
tags.map(tag => ({
  id: tag.id,
  value: tag.name,
  description: tag.color ? `Tag • ${tag.color}` : "Tag",
  type: "tag",
  color: tag.color,
}))
```

---

### POST Tags (`/api/nabu/notes/[id]/tags`)

**Purpose:** Add tags to a note (create tags if needed, restore if soft-deleted)

**Request:**
```typescript
POST /api/nabu/notes/[id]/tags
Body: { tagNames: ["tag1", "tag2"] }
```

**Logic:**
```typescript
1. Verify note ownership
2. For each tagName:
   a. Find or create Tag in database
   b. Check for existing NoteTag (active OR soft-deleted)
   c. If soft-deleted: Restore (set deletedAt: null)
   d. If not exists: Create new NoteTag with source: USER_ADDED
3. Update note.lastTagModifiedAt
4. Query all active noteTags for the note
5. Return complete tag list
```

**Key Code:**
```typescript
// Find or create tag
let tag = await prisma.tag.findFirst({
  where: { name: tagName, userId, tenantId, deletedAt: null },
});

if (!tag) {
  tag = await prisma.tag.create({
    data: { name: tagName, userId, tenantId, status: "ENABLE", ... },
  });
}

// Check for existing link (active or soft-deleted)
const activeLink = await prisma.noteTag.findFirst({
  where: { noteId, tagId: tag.id, deletedAt: null },
});

const deletedLink = await prisma.noteTag.findFirst({
  where: { noteId, tagId: tag.id, deletedAt: { not: null } },
});

if (activeLink) {
  // Already linked, skip
} else if (deletedLink) {
  // Restore soft-deleted link
  await prisma.noteTag.update({
    where: { noteId_tagId: { noteId, tagId: tag.id } },
    data: { deletedAt: null, source: "USER_ADDED" },
  });
} else {
  // Create new link
  await prisma.noteTag.create({
    data: { noteId, tagId: tag.id, source: "USER_ADDED" },
  });
}

// Fetch complete tag list (IMPORTANT: Use this pattern for middleware compatibility)
const noteWithTags = await prisma.note.findUnique({
  where: { id: noteId },
  select: {
    noteTags: {
      where: { deletedAt: null },
      select: { source, confidence, tag: { select: { id, name, color, type } } }
    }
  }
});

const tags = noteWithTags.noteTags.map(nt => ({
  id: nt.tag.id,
  name: nt.tag.name,
  color: nt.tag.color,
  source: nt.source,
  confidence: nt.confidence,
}));

return { tags };
```

---

### DELETE Tags (`/api/nabu/notes/[id]/tags`)

**Purpose:** Remove tags from a note (soft delete NoteTag link)

**Request:**
```typescript
DELETE /api/nabu/notes/[id]/tags
Body: { tagNames: ["tag1"] }
```

**Logic:**
```typescript
1. Verify note ownership
2. Find tags by names
3. Soft delete NoteTags (updateMany with deletedAt)
4. Update note.lastTagModifiedAt
5. Query remaining active noteTags
6. Return updated tag list
```

**Key Code:**
```typescript
// Find tags to remove
const tags = await prisma.tag.findMany({
  where: { name: { in: tagNames }, userId, tenantId, deletedAt: null },
});

// Soft delete (NOT hard delete!)
if (tags.length > 0) {
  await prisma.noteTag.updateMany({
    where: {
      noteId,
      tagId: { in: tags.map(t => t.id) },
      deletedAt: null, // Only update active records
    },
    data: { deletedAt: new Date() },
  });
}

// Return remaining tags (same pattern as POST)
const noteWithTags = await prisma.note.findUnique({
  where: { id: noteId },
  select: {
    noteTags: {
      where: { deletedAt: null },
      select: { source, confidence, tag: { ... } }
    }
  }
});
```

---

## 4. Database Schema

```prisma
model Tag {
  id        String     @id @default(cuid())
  tenantId  String?
  userId    String
  name      String
  color     String?
  type      TagType?
  status    StatusEnum @default(ENABLE)
  deletedAt DateTime?
  noteTags  NoteTag[]
  // ... audit fields
}

model NoteTag {
  noteId     String
  tagId      String
  source     TagSource  // USER_ADDED | AI_SUGGESTED
  confidence Float?
  deletedAt  DateTime?
  // ... audit fields
  
  note Note @relation(...)
  tag  Tag  @relation(...)
  
  @@unique([noteId, tagId])
}

enum TagSource {
  USER_ADDED
  AI_SUGGESTED
}
```

---

## 5. Critical Patterns & Gotchas

### ✅ DO

**Soft Delete Pattern:**
```typescript
// Always use updateMany, never deleteMany
await prisma.noteTag.updateMany({
  where: { ... },
  data: { deletedAt: new Date() }
});
```

**Restore Pattern:**
```typescript
// Check for soft-deleted before creating
const deletedLink = await prisma.noteTag.findFirst({
  where: { noteId, tagId, deletedAt: { not: null } }
});

if (deletedLink) {
  await prisma.noteTag.update({
    where: { noteId_tagId: { noteId, tagId } },
    data: { deletedAt: null }
  });
}
```

**Middleware-Safe Query:**
```typescript
// Query through parent relation, not directly
const note = await prisma.note.findUnique({
  where: { id },
  select: {
    noteTags: {
      where: { deletedAt: null },
      select: { ... }
    }
  }
});
```

### ❌ DON'T

**Hard Delete:**
```typescript
// NEVER use deleteMany - breaks restore pattern
await prisma.noteTag.deleteMany({ where: { ... } }); // ❌
```

**Nested Where on Relations:**
```typescript
// Middleware breaks this pattern
await prisma.noteTag.findMany({
  where: { 
    noteId,
    tag: { deletedAt: null } // ❌ Doesn't work with middleware
  }
});
```

**Assume Unique Constraint Prevents Duplicates:**
```typescript
// Check for soft-deleted first!
await prisma.noteTag.create({ ... }); // ❌ Fails if soft-deleted exists
```

---

## 6. Data Flow Diagram

```
User types #tag in editor
         ↓
BeautifulMentionsPlugin shows dropdown
         ↓
User selects/creates tag
         ↓
TagSyncPlugin detects mention node
         ↓ (500ms debounce)
onTagsChanged([{ id, value, type }])
         ↓
handleTagsChanged compares with DB
         ↓
POST /api/nabu/notes/[id]/tags
         ↓
API: Find/Create Tag → Check NoteTag → Create/Restore
         ↓
Return complete tag list
         ↓
setTags(newTags)
         ↓
UI updates with all tags
```

---

## 7. For Implementing Links (Same Pattern)

**Components Needed:**
- `MentionSyncPlugin` (already exists) - tracks `@mentions`
- `handleMentionsChanged` - sync logic
- `/api/nabu/notes/[id]/links` - POST/DELETE endpoints
- `NoteLink` table operations (soft delete/restore)

**Key Differences:**
- Links use `@` trigger instead of `#`
- Link to `NoteLink` table instead of `NoteTag`
- Display in "Related Links" section instead of tag badges
- Navigation on click instead of just display

**Same Patterns:**
- ✅ Soft delete/restore
- ✅ Query through `note.outgoingLinks` relation
- ✅ Real-time sync with debouncing
- ✅ Check for soft-deleted before creating

---

## 8. Testing Checklist

- [ ] Create new tag with `#newtag` → Appears in tag list
- [ ] Delete `#newtag` from content → Removed from tag list
- [ ] Re-add `#newtag` → Restored (not duplicated)
- [ ] Refresh page → Tags persist correctly
- [ ] AI-suggested tags → Not auto-removed when missing from content
- [ ] Multiple tags → All remain visible when adding/removing one
- [ ] Tag search → Filters with "starts with" logic
- [ ] Tag creation → "Add 'name'" option appears for new tags

---

## 9. Common Issues & Solutions

### Issue: Tags disappear when adding new one
**Cause:** API returning only new tag instead of all tags  
**Solution:** Query through `note.noteTags` relation, not `noteTag.findMany`

### Issue: Unique constraint error when re-adding tag
**Cause:** Not checking for soft-deleted NoteTag before creating  
**Solution:** Query for `deletedAt: { not: null }` and restore if found

### Issue: Middleware filters out tags with `tenantId: null`
**Cause:** Database middleware adds tenantId filter automatically  
**Solution:** Query through parent Note relation using nested select

### Issue: Tag list cleared when clicking out of editor
**Cause:** State being reset somewhere  
**Solution:** Check for `setTags([])` or `setTags(data.tags)` calls

---

## 10. File Reference

**Frontend:**
- `components/nabu/notes/lexical-editor.tsx` - Main editor with mention plugin
- `components/nabu/notes/lexical-tag-sync-plugin.tsx` - Tag detection
- `components/nabu/notes/note-editor.tsx` - Tag sync logic
- `components/nabu/notes/tag-badge.tsx` - Tag display component

**Backend:**
- `app/api/nabu/mentions/route.ts` - Autocomplete data
- `app/api/nabu/notes/[id]/tags/route.ts` - Tag CRUD operations
- `lib/nabu-helpers.ts` - Shared helper functions

**Database:**
- `prisma/schema.prisma` - Tag, NoteTag models
- `lib/dbMiddleware.ts` - Soft delete middleware


