# Add Tag Search to Search Functionality

## Overview
Enhance the hybrid search (keyword + vector) to include tag names in the search, so users can find notes and thoughts by their tags in addition to title and content.

## Current Search Fields
- ✅ Note title
- ✅ Note content  
- ✅ Thought content
- ✅ Semantic similarity (embeddings)
- ❌ Tags (NOT searchable)

## Desired Behavior
- Search for a tag name → finds all notes/thoughts with that tag
- Tag matches should boost relevance score
- Show matched tags in search results
- Tag search works in both keyword and semantic modes

## Implementation Approach

### Option 1: Join Tags in SQL Query (Recommended)
**For Notes Keyword Search:**

```sql
SELECT DISTINCT
  n.id,
  n.title,
  n.content,
  n."folderId",
  n."createdAt",
  n."updatedAt",
  'note' as "entityType",
  -- Include tag names in search vector
  ts_rank(
    to_tsvector('english', 
      n.title || ' ' || 
      n.content || ' ' ||
      COALESCE(string_agg(t.name, ' '), '')  -- Concatenate tag names
    ),
    plainto_tsquery('english', ${q})
  ) * 
  -- Boost score if tag name matches exactly
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "NoteTag" nt2
      JOIN "Tag" t2 ON t2.id = nt2."tagId"
      WHERE nt2."noteId" = n.id 
        AND nt2."deletedAt" IS NULL
        AND t2."deletedAt" IS NULL
        AND LOWER(t2.name) = LOWER(${q})
    ) THEN 2.0  -- Double the score for exact tag match
    ELSE 1.0
  END as "keywordScore"
FROM "Note" n
LEFT JOIN "NoteTag" nt ON nt."noteId" = n.id AND nt."deletedAt" IS NULL
LEFT JOIN "Tag" t ON t.id = nt."tagId" AND t."deletedAt" IS NULL
WHERE n."userId" = ${userId}
  AND n."tenantId" = ${tenantId}
  AND n."deletedAt" IS NULL
  AND (
    to_tsvector('english', 
      n.title || ' ' || 
      n.content || ' ' ||
      COALESCE(string_agg(t.name, ' '), '')
    ) @@ plainto_tsquery('english', ${q})
  )
GROUP BY n.id, n.title, n.content, n."folderId", n."createdAt", n."updatedAt"
ORDER BY "keywordScore" DESC
LIMIT ${limit}
```

### Changes Required

#### 1. Update Notes Keyword Search Query
**File:** `app/api/nabu/search/route.ts` (line ~127)

- Add LEFT JOIN with NoteTag and Tag tables
- Include tag names in `to_tsvector` concatenation
- Add GROUP BY to handle joined tags
- Boost score for exact tag name matches

#### 2. Update Thoughts Keyword Search Query  
**File:** `app/api/nabu/search/route.ts` (line ~235)

Similar changes for thoughts:
- Thoughts don't have NoteTag relationships
- They have `suggestedTags` string array field
- Include `suggestedTags` in search vector

```sql
to_tsvector('english', 
  t.content || ' ' ||
  array_to_string(t."suggestedTags", ' ')  -- Include suggested tags
)
```

#### 3. Include Tags in Results
**File:** `app/api/nabu/search/route.ts`

Add tags to the SELECT for display in results:

```sql
SELECT 
  n.id,
  ...
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'color', t.color
    )
  ) FILTER (WHERE t.id IS NOT NULL) as tags
FROM ...
GROUP BY n.id, ...
```

#### 4. Update Result Formatting
Show matched tags in search results for better UX

## Benefits

✅ Search by tag name finds relevant content
✅ Exact tag matches get higher relevance
✅ Tags shown in search results
✅ Works with existing hybrid search
✅ No breaking changes to API

## Testing Scenarios

1. Search for exact tag name → should find all tagged items
2. Search for partial tag name → should match
3. Tag match + content match → higher score
4. Tags shown in results for context

