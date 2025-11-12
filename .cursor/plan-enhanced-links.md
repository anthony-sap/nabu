# Enhanced Link Display and Editing for Lexical

## Current State
The Lexical editor already has:
- **LinkPlugin** - Basic link creation
- **AutoLinkPlugin** - Auto-detects URLs and emails
- **ClickableLinkPlugin** - Makes links clickable
- **Link Toolbar Button** - Uses browser `prompt()` for URL input
- **Link Styling**: `text-primary hover:text-primary/80 underline cursor-pointer`

## Proposed Enhancements

### Option 1: Floating Link Editor (Recommended)
Add a floating toolbar that appears when you click/select a link, similar to Medium or Notion.

**Features:**
- Click link → Floating editor appears with URL and Edit/Remove buttons
- Better UX than browser prompt
- Visual feedback
- Easy editing and removal

**Implementation:**
- Use `@lexical/react/LexicalLinkPlugin` with FloatingLinkEditor
- Create custom floating UI component
- Position near selected link

### Option 2: Visual Link Indicators
Make links more visually distinctive:

**Features:**
- External link icon after URL (🔗 or ↗)
- Different color/style for external vs internal links
- Underline with color accent
- Hover preview showing full URL in tooltip

**Implementation:**
- Custom LinkNode decorator
- CSS styling changes
- Optional: Link preview plugin

### Option 3: Link Preview Cards
Show rich previews for pasted URLs:

**Features:**
- Paste URL → Fetch metadata (title, description, image)
- Display as card with preview
- Fallback to regular link if metadata unavailable

**Implementation:**
- Custom paste handler
- Metadata fetching service
- Custom preview node component

### Option 4: Improved Link Dialog
Replace browser `prompt()` with proper dialog:

**Features:**
- Modal dialog for link insertion
- Text and URL fields
- Validation
- "Open in new tab" checkbox
- Recent links list

**Implementation:**
- Custom Dialog component
- Update toolbar insertLink function
- Link history storage

## Recommended Approach

I recommend **Option 1 (Floating Link Editor)** + **Option 2 (Visual Indicators)** because:
1. Best UX - easy to edit/remove links
2. Professional appearance
3. Low implementation effort
4. Matches modern editor standards (Notion, Medium, etc.)

## Implementation Plan (Option 1 + 2)

### 1. Create FloatingLinkEditor Component
**File:** `components/nabu/notes/floating-link-editor.tsx`
- Floating toolbar that appears on link selection
- Input field to edit URL
- Edit and Remove buttons
- Positioned dynamically near link

### 2. Add FloatingLinkEditorPlugin
**File:** `components/nabu/notes/lexical-editor.tsx`
- Import and use the FloatingLinkEditor
- Integrate with existing LinkPlugin

### 3. Enhanced Link Styling
**File:** `components/nabu/notes/lexical-editor.tsx`
- Update link theme with icon/indicator
- Add hover effects
- Show external link icon
- Optional: Add URL tooltip on hover

### 4. Improve Toolbar Link Button
**File:** `components/nabu/notes/lexical-toolbar.tsx`
- Replace `prompt()` with inline input
- Or open floating editor
- Better UX for link creation

## Files to Create
- `components/nabu/notes/floating-link-editor.tsx`

## Files to Modify
- `components/nabu/notes/lexical-editor.tsx`
- `components/nabu/notes/lexical-toolbar.tsx`

## Questions for User

Before implementing, I need to know:

1. **What specific enhancement do you want?**
   - a) Floating link editor (edit links by clicking them)
   - b) Visual indicators (icons, special styling)
   - c) Link preview cards (rich metadata)
   - d) Better link insertion dialog
   - e) Something else?

2. **For pasted links, should they:**
   - a) Stay as clickable text links (current)
   - b) Show as preview cards with metadata
   - c) Show URL in a special format/badge

3. **What makes links "different" in your ideal vision?**
   - Describe what you'd like to see visually

