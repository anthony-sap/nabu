# Nabu Search Feature Implementation Plan

## Overview
Implement a global search feature for Nabu that searches across notes and thoughts, with filtering capabilities and intelligent navigation.

## Current State
- Notes API already has search parameter (searches title, content, summary)
- Thoughts API has basic query support but no search parameter
- Command Dialog pattern exists in the codebase

## Requirements
1. Search box in the notes page header
2. Opens search dialog (similar to Cmd+K pattern)
3. Searches notes (title + content) and thoughts (title from meta + content)
4. Filter results by type (Notes / Thoughts)
5. Click result → show in right panel + open folder in sidebar
6. Real-time search as user types (debounced)

## Implementation Steps

### 1. Add Search Parameter to Thoughts API
**File:** `lib/validations/nabu.ts`
- Add `search` to `thoughtQuerySchema`

**File:** `app/api/nabu/thoughts/route.ts`
- Handle search parameter in GET endpoint
- Search in `content` field and `meta.title` (JSON field)

### 2. Create Search Dialog Component
**File:** `components/nabu/notes/search-dialog.tsx`
- Create SearchDialog component using CommandDialog
- Search input with debounce
- Filter tabs/buttons (All / Notes / Thoughts)
- Results list with icons and metadata
- Loading and empty states

### 3. Create Combined Search Hook
**File:** `components/nabu/notes/use-search.ts`
- Hook to search both notes and thoughts APIs
- Combine and sort results by relevance/date
- Debounce search requests
- Return unified result format

### 4. Create Search Results Display
**File:** `components/nabu/notes/search-result-item.tsx`
- Display individual search result
- Show type icon (note/thought)
- Show title, preview, folder/tags
- Highlight search term

### 5. Add Search Button to Header
**File:** `components/nabu/notes/notes-activity-page.tsx`
- Add search button to page header
- Open/close search dialog
- Keyboard shortcut (Cmd+F or Cmd+Shift+F)

### 6. Handle Result Selection
**File:** `components/nabu/notes/notes-activity-page.tsx`
- On note select: switch to editor view, expand folder in sidebar
- On thought select: switch to thoughts view, highlight thought
- Close search dialog after selection

### 7. Folder Navigation Logic
**File:** `components/nabu/notes/notes-activity-page.tsx`
- Add function to expand folder path to a specific note
- Recursively expand parent folders
- Update folder tree state

## Data Structures

### Unified Search Result
```typescript
interface SearchResult {
  id: string;
  type: 'note' | 'thought';
  title: string;
  content: string;
  preview: string; // First 150 chars
  folder?: { id: string; name: string; color?: string };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  // For navigation
  folderId?: string | null;
}
```

## API Changes

### Thoughts API - Add Search
```typescript
// Query params
{
  search?: string; // Search content and meta.title
  // ... existing params
}

// Implementation
if (search) {
  where.OR = [
    { content: { contains: search, mode: "insensitive" } },
    { meta: { path: ["title"], string_contains: search } } // JSON search
  ];
}
```

## UI/UX Flow

1. User clicks search icon or presses Cmd+Shift+F
2. Search dialog opens (modal overlay)
3. User types search query
4. Results appear in real-time (debounced)
5. User can filter by All/Notes/Thoughts
6. Click result:
   - Dialog closes
   - For notes: Opens editor view, expands folder in sidebar
   - For thoughts: Opens thoughts view, scrolls to thought
7. Press Esc to close without selection

## Files to Create
- `components/nabu/notes/search-dialog.tsx`
- `components/nabu/notes/use-search.ts`
- `components/nabu/notes/search-result-item.tsx`
- `components/nabu/notes/types-search.ts` (search types)

## Files to Modify
- `lib/validations/nabu.ts` (add search to thoughtQuerySchema)
- `app/api/nabu/thoughts/route.ts` (implement search)
- `components/nabu/notes/notes-activity-page.tsx` (add search, navigation)
- `components/nabu/notes/notes-sidebar.tsx` (folder expansion logic)

## Testing Considerations
- Search with special characters
- Search with no results
- Search with many results
- Filter switching
- Navigation to nested folders
- Keyboard navigation through results
- Performance with large datasets

## Future Enhancements (Not in scope)
- Search history
- Recent searches
- Advanced filters (date range, tags)
- Fuzzy matching
- Search result ranking algorithm

