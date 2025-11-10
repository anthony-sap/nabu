# Lexical Text Editor Integration

This project uses [Lexical](https://github.com/facebook/lexical), Facebook's extensible text editor framework, for rich text editing in notes and thoughts.

## Components

### LexicalEditor (`lexical-editor.tsx`)
The main editor component that wraps Lexical's functionality. It's a fully reusable component used throughout the application.

**Props:**
- `value?: string` - Plain text value for initial content
- `editorState?: string` - Serialized editor state (JSON) - takes priority over value
- `onChange: (plainText: string, serializedState: string) => void` - Callback with both plain text and serialized state
- `placeholder?: string` - Placeholder text
- `autoFocus?: boolean` - Auto-focus on mount
- `className?: string` - Additional CSS classes
- `showToolbar?: boolean` - Show formatting toolbar

**Features:**
- Rich text editing with formatting preservation
- Auto-focus support
- Content synchronization with serialized state
- History (undo/redo)
- Keyboard shortcuts
- Exports both plain text (for search/display) and serialized state (for formatting preservation)

### LexicalToolbar (`lexical-toolbar.tsx`)
Comprehensive formatting toolbar with all editing features.

**Features:**

**Block Formatting:**
- Heading 1, 2, 3
- Quote blocks

**Text Formatting:**
- Bold (Ctrl+B)
- Italic (Ctrl+I)
- Underline (Ctrl+U)
- Strikethrough

**Lists:**
- Bullet lists
- Numbered lists
- Checklists (with check/uncheck)

**Links:**
- Insert/edit links
- Auto-link detection (URLs and emails)
- Clickable links

**Alignment:**
- Left, Center, Right, Justify

**Indentation:**
- Indent/Outdent for nested content

## Usage

### Basic Usage (No Toolbar)
```tsx
import { LexicalEditor } from "./notes/lexical-editor";

const [content, setContent] = useState("");
const [editorState, setEditorState] = useState("");

<LexicalEditor
  value={content}
  editorState={editorState}
  onChange={(plainText, serializedState) => {
    setContent(plainText);
    setEditorState(serializedState);
  }}
  placeholder="Start typing..."
/>
```

### With Formatting Toolbar
```tsx
<LexicalEditor
  value={content}
  editorState={editorState}
  onChange={(plainText, serializedState) => {
    setContent(plainText);
    setEditorState(serializedState);
  }}
  placeholder="Start typing..."
  showToolbar
  autoFocus
/>
```

## How It Works

The editor maintains two pieces of state:
1. **Plain Text (`plainText`)** - Used for search, display in cards, and text-only contexts
2. **Serialized State (`serializedState`)** - JSON representation of the full editor state including formatting

When you minimize and restore a thought, the serialized state ensures all formatting is preserved.

## Where It's Used

1. **Quick Thought Modal** - Rich text editing with toolbar for capturing detailed thoughts
2. **Quick Capture Form** - Simple editor without toolbar for quick note-taking in the activity feed
3. **Note Detail View** - Full editing experience with toolbar for detailed note editing

## Enabled Features

✅ **Text Formatting** - Bold, italic, underline, strikethrough  
✅ **Headings** - H1, H2, H3 for document structure  
✅ **Lists** - Bullet lists, numbered lists, checklists  
✅ **Links** - Manual insertion and auto-detection  
✅ **Quotes** - Block quotes for emphasis  
✅ **Hashtags** - Automatic #hashtag detection  
✅ **Mentions** - Beautiful @mentions and #tags with autocomplete  
✅ **Tables** - Full table support with cells  
✅ **Tab Indentation** - Proper tab handling  
✅ **History** - Full undo/redo support  
✅ **Alignment** - Left, center, right, justify  
✅ **Tailwind Theme** - Integrated with your Nabu brand colors  

## Future Enhancements

Potential additions to consider:
- Markdown import/export
- Code blocks with syntax highlighting
- Images and media embeds
- Mentions (@username)
- File attachments
- Collaborative editing
- Table of contents generation
- Keyboard shortcuts reference

## How to Use Mentions

### @Mentions for Folders, Notes & Thoughts
Type `@` to link to your content:
- **Folders**: `@Inbox`, `@Work`, `@Personal`, `@Projects`, `@Archive`
- **Your Thoughts**: All your saved thoughts appear in the list with previews
- **Create New**: Type `@NewFolder` and select "Add folder/note" from the menu
- **Tooltips**: Hover over mentions to see descriptions

### #Tags for Organization
Type `#` to categorize with tags:
- `#urgent` - High priority
- `#work` - Work-related
- `#todo` - Action items
- `#idea` - Ideas and brainstorming
- `#meeting` - Meeting notes
- `#project` - Project-related
- **Create New**: Type any tag like `#mytag` and add it on the fly!

### Features Enabled

✅ **Creatable** - Add new mentions/tags that aren't in the list  
✅ **Insert on Blur** - Mentions insert automatically when you click away  
✅ **Auto Space** - Spaces are added around mentions automatically  
✅ **Custom Tooltips** - Hover over mentions to see descriptions  

The autocomplete menu appears as you type, styled with your Nabu theme colors!

## Packages Installed

```json
{
  "lexical": "^0.x.x",
  "@lexical/react": "^0.x.x",
  "@lexical/rich-text": "^0.x.x",
  "@lexical/plain-text": "^0.x.x",
  "@lexical/utils": "^0.x.x",
  "@lexical/list": "^0.x.x",
  "@lexical/link": "^0.x.x",
  "@lexical/table": "^0.x.x",
  "@lexical/hashtag": "^0.x.x",
  "@lexical/code": "^0.x.x",
  "lexical-beautiful-mentions": "^0.x.x"
}
```

## Resources

- [Lexical Documentation](https://lexical.dev/)
- [Lexical Playground](https://playground.lexical.dev/)
- [GitHub Repository](https://github.com/facebook/lexical)
- [Beautiful Mentions Plugin](https://github.com/sodenn/lexical-beautiful-mentions)

