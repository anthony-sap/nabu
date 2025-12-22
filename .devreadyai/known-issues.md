## When updating a folder and getting an API response we have a render issue 

Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.

components\ui\scroll-area.tsx (12:3) @ _c


div@unknown:0:0
Primitive</Node<@webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-primitive/dist/index.mjs:44:82
_c<@webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-scroll-area/dist/index.mjs:92:89
_c@webpack-internal:///(app-pages-browser)/./components/ui/scroll-area.tsx:17:87
NotesSidebar@webpack-internal:///(app-pages-browser)/./components/nabu/notes/notes-sidebar.tsx:72:92
NotesActivityPage@webpack-internal:///(app-pages-browser)/./components/nabu/notes/notes-activity-page.tsx:463:96
NotesPage@rsc://React/Server/webpack-internal:///(rsc)/./app/nabu/notes/page.tsx?15:14:87

## Drag-and-Drop: Tree state not preserved after folder/note move

When dropping a folder into another folder (or moving a note), the tree reloads from the API and loses its UI state:
- Expanded/collapsed state of folders is not preserved
- Chevrons disappear or show incorrect state
- User loses their place in the tree navigation

**Current Behavior:**
- `handleMoveFolder()` and `handleMoveNote()` in `notes-activity-page.tsx` call `fetchRootFolders()` to reload the entire tree
- This causes all folders to reset to their default collapsed state
- No mechanism to preserve which folders were expanded before the reload

**Desired Behavior:**
- After a successful move operation, preserve the expanded/collapsed state of folders
- Keep the target folder expanded to show the newly moved item
- Maintain smooth user experience without losing navigation context

**Potential Solutions:**
1. Track expanded folder IDs before reload and reapply them after
2. Use optimistic updates to move items in the tree without full reload
3. Implement partial tree updates - only refresh affected branches
4. Store folder expansion state in component state and persist across reloads

**Related Files:**
- `components/nabu/notes/notes-activity-page.tsx` (handleMoveFolder, handleMoveNote)
- `components/nabu/notes/folder-item.tsx` (drag-drop logic)
- `components/nabu/notes/types.ts` (FolderItem.expanded property)

**Priority:** Medium - Feature works but UX is degraded