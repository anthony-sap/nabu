# Quick Thought Feature

A global quick capture modal accessible from anywhere in the Nabu application.

## Features

### 🎯 Quick Access
- **Button in Header**: Always visible "Quick thought..." button
- **Keyboard Shortcut**: `Cmd/Ctrl + K` to open from anywhere
- **Visual Cue**: Shows keyboard shortcut hint on desktop

### 📝 Capture Form
- **Optional Title**: Give your thought a descriptive title
- **Required Content**: Main content area with autofocus
- **Folder Organization**: Choose from Inbox, Work, Personal, Projects, Archive
- **Tag System**: Multi-select tags (idea, todo, meeting, research, planning, personal)

### ⌨️ Keyboard Shortcuts
- `Cmd/Ctrl + K` - Open modal
- `Cmd/Ctrl + S` - Save thought (when modal is open)
- `Esc` - Close/minimize modal

### 💾 Data Persistence
- Saves to localStorage (`nabu-saved-thoughts`)
- Auto-syncs with activity feed via storage events
- Thoughts appear immediately in the feed

## Components

### QuickThoughtTrigger
**Location**: `components/nabu/quick-thought-trigger.tsx`

The trigger button that appears in the header.

**Features**:
- Global keyboard shortcut listener
- Responsive design (hides text on small screens)
- Shows keyboard hint on desktop

**Usage**:
```tsx
import { QuickThoughtTrigger } from "@/components/nabu/quick-thought-trigger";

<QuickThoughtTrigger />
```

### QuickThoughtModal
**Location**: `components/nabu/quick-thought-modal.tsx`

The modal dialog for capturing thoughts.

**Props**:
```tsx
interface QuickThoughtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Features**:
- Form validation (content required)
- Folder selection with visual feedback
- Multi-select tag system
- Auto-reset on close
- Keyboard shortcuts for save
- LocalStorage integration

**Usage**:
```tsx
import { QuickThoughtModal } from "@/components/nabu/quick-thought-modal";

const [open, setOpen] = useState(false);

<QuickThoughtModal open={open} onOpenChange={setOpen} />
```

## Integration

### Header Integration
Added to `app/nabu/layout.tsx`:
```tsx
import { QuickThoughtTrigger } from "@/components/nabu/quick-thought-trigger";

// In header right side actions
<div className="flex items-center gap-3">
  <QuickThoughtTrigger />
  <ModeToggle />
  <UserAccountNav />
</div>
```

### Activity Feed Sync
The modal automatically:
1. Saves thoughts to localStorage
2. Dispatches storage event
3. Activity feed listens for storage events
4. New thoughts appear instantly

## Styling

### Theme-Aware
- Uses Nabu brand colors (mint primary)
- Works in both light and dark modes
- Consistent with overall design system

### Key Classes
- `bg-card` - Modal background
- `bg-primary` - Selected folder button
- `text-primary` - Active tags
- `border-primary` - Focus states

## Data Structure

### SavedThought
```typescript
{
  id: string;           // "thought-{timestamp}"
  title: string;        // Optional, defaults to "Untitled"
  content: string;      // Required
  tags: string[];       // Selected tags
  folder: string;       // Selected folder
  createdAt: string;    // ISO timestamp
  pinned: boolean;      // Always false for quick thoughts
}
```

## User Flow

1. User presses `Cmd+K` or clicks "Quick thought..." button
2. Modal opens with content field autofocused
3. User types thought content (required)
4. Optionally adds title
5. Selects folder (defaults to "Inbox")
6. Selects tags (optional, multi-select)
7. Clicks "Save Thought" or presses `Cmd+S`
8. Thought saves to localStorage
9. Modal closes and resets
10. Thought appears in activity feed immediately

## Future Enhancements

- [ ] Voice input support
- [ ] Rich text formatting
- [ ] File attachments
- [ ] AI-powered tag suggestions
- [ ] Quick templates
- [ ] Related notes suggestions
- [ ] Emoji picker for titles
- [ ] Custom folder creation
- [ ] Custom tag creation
- [ ] Keyboard navigation for folder/tag selection

## Accessibility

- ✅ Keyboard shortcuts clearly indicated
- ✅ Focus management (autofocus on content)
- ✅ Escape key to close
- ✅ Visual feedback for all interactions
- ✅ ARIA labels via shadcn Dialog component
- ✅ Disabled state for save button

## Browser Compatibility

- Works in all modern browsers with localStorage support
- Keyboard shortcuts use standard metaKey/ctrlKey detection
- Responsive design for mobile and desktop

## Testing Checklist

- [ ] Open modal with `Cmd+K`
- [ ] Open modal with button click
- [ ] Save thought with `Cmd+S`
- [ ] Close modal with `Esc`
- [ ] Close modal with X button
- [ ] Close modal with "Discard" button
- [ ] Folder selection works
- [ ] Multiple tag selection works
- [ ] Content validation (required)
- [ ] Thought appears in feed
- [ ] Form resets after save
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Responsive on mobile
- [ ] Storage event triggers feed update

