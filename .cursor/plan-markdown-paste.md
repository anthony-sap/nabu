# Markdown Paste Support for Lexical Editor

## Overview
Add Markdown paste support to the Lexical editor so users can paste Markdown content and have it automatically converted to rich text formatting.

## Current State
- Lexical editor has rich text support with many features
- No Markdown import/export functionality
- Pasting Markdown currently pastes as plain text
- LEXICAL_INTEGRATION.md lists "Markdown import/export" as future enhancement

## Requirements
1. When user pastes Markdown text → Convert to formatted rich text
2. Support common Markdown syntax:
   - Headings (# ## ###)
   - Bold (**text** or __text__)
   - Italic (*text* or _text_)
   - Links ([text](url))
   - Lists (-, *, 1.)
   - Code blocks (```)
   - Inline code (`code`)
   - Quotes (>)
   - Strikethrough (~~text~~)

## Implementation Plan

### 1. Install Dependencies
Check if `@lexical/markdown` is installed, if not:
```bash
npm install @lexical/markdown
```

### 2. Import Markdown Utilities
**File:** `components/nabu/notes/lexical-editor.tsx`
- Import `MarkdownShortcutPlugin` from `@lexical/react/LexicalMarkdownShortcutPlugin`
- Import transformers from `@lexical/markdown`:
  - `TRANSFORMERS` (default set)
  - Or create custom transformers for specific nodes

### 3. Configure Transformers
**File:** `components/nabu/notes/lexical-editor.tsx`
Create transformer array matching existing nodes:
```typescript
import {
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CODE,
  LINK,
  // ... other transformers
} from "@lexical/markdown";

const MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CODE,
  LINK,
  // Add custom transformers if needed
];
```

### 4. Add MarkdownShortcutPlugin
**File:** `components/nabu/notes/lexical-editor.tsx`
Add plugin to the editor:
```tsx
<MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
```

This plugin:
- Detects Markdown patterns as you type
- Converts them to rich text automatically
- Handles paste events with Markdown content

### 5. Test Markdown Paste
Test scenarios:
- Paste heading: `# Heading 1`
- Paste list: `- Item 1\n- Item 2`
- Paste bold: `**bold text**`
- Paste link: `[Google](https://google.com)`
- Paste code block: ` ```javascript\ncode\n``` `
- Paste mixed content with multiple formats

## Files to Modify
- `package.json` (potentially - if @lexical/markdown not installed)
- `components/nabu/notes/lexical-editor.tsx` (add plugin and transformers)

## Benefits
- Seamless Markdown workflow
- Copy content from docs/notes and paste with formatting preserved
- Type Markdown shortcuts (e.g., `# ` for heading)
- Improved user experience for power users
- No breaking changes - existing content works as before

## Alternative: Rich Text Paste
If Markdown is not needed, Lexical already supports:
- Pasting HTML and preserving formatting
- Pasting from Word, Google Docs, etc.
- This is built-in and already works

## Decision Point
The user specifically requested "paste Markdown" - so we'll implement Markdown paste support using `@lexical/markdown`.

