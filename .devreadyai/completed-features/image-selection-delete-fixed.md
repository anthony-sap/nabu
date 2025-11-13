# Image Selection and Delete Fix

**Feature ID**: image-selection-delete-fix  
**Phase**: Phase 1 - Core Features  
**Date**: 2025-11-13  
**Status**: ✅ Completed

## Initial Feature Request

User reported that images in the Lexical editor could not be selected (via mouse or keyboard) and could not be deleted (via keyboard or delete button).

## Root Causes Identified

1. **Display: contents issue**: The `createDOM()` method was using `display: contents`, which removes the element from the DOM selection tree, making it impossible to select.

2. **Event propagation issue**: Click events were bubbling up to the editor container, which immediately cleared the node selection after it was set.

3. **Selection state not tracked**: The component wasn't tracking whether it was selected to provide visual feedback.

## Implementation Details

### Changes to `CustomImageNode` class

#### 1. Fixed `createDOM()` method
```typescript
createDOM(): HTMLElement {
  const div = document.createElement("div");
  // Block-level container for the image decorator
  div.className = "image-node-wrapper";
  div.style.display = "block";  // Changed from "contents" to "block"
  div.style.userSelect = "none";
  div.style.width = "100%";
  div.style.pointerEvents = "auto";
  div.tabIndex = -1; // Make focusable but not in tab order
  return div;
}
```

**Key changes**:
- Changed from `display: contents` to `display: block`
- Added `width: 100%` to ensure full-width display
- Added `pointerEvents: auto` to ensure clicks are registered
- Added `tabIndex: -1` to make the element focusable

#### 2. Node selection properties (already present)
```typescript
isInline(): boolean { return false; }
isIsolated(): boolean { return true; }
isKeyboardSelectable(): boolean { return true; }
```

### Changes to `ImageComponent`

#### 1. Added selection state tracking
```typescript
const [isSelected, setIsSelected] = React.useState(false);

React.useEffect(() => {
  return editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const selection = $getSelection();
      if ($isNodeSelection(selection)) {
        setIsSelected(selection.has(nodeKey));
      } else {
        setIsSelected(false);
      }
    });
  });
}, [editor, nodeKey]);
```

#### 2. Implemented click-to-select handler
```typescript
const handleClick = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation(); // Critical: prevents editor from clearing selection
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if (node) {
      const nodeSelection = $createNodeSelection();
      nodeSelection.add(nodeKey);
      $setSelection(nodeSelection);
    }
  });
};
```

**Key change**: `e.stopPropagation()` prevents the click from reaching the editor, which would clear the selection.

#### 3. Added visual selection indicator
```typescript
<div
  className={`relative group my-4 cursor-pointer select-none transition-all ${
    isSelected ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""
  }`}
  onClick={handleClick}
>
```

Shows a blue ring around the image when selected.

## Deletion Methods

### 1. Keyboard Deletion (Delete/Backspace)
- Click image to select (blue ring appears)
- Press `Delete` or `Backspace`
- Confirm in dialog
- Image is removed from editor, database, and storage

### 2. Hover Delete Button
- Hover over image
- Click red trash icon in top-right corner
- Confirm in dialog
- Image is removed from editor, database, and storage

Both methods call the same `handleDelete()` function which:
1. Calls `/api/nabu/images/[imageId]` DELETE endpoint
2. Removes record from database
3. Deletes file from Supabase storage
4. Removes node from editor
5. Shows success/error toast

## Technical Lessons Learned

1. **display: contents and selection**: The CSS property `display: contents` makes an element "transparent" to the DOM tree, preventing it from being selectable. Block or inline-block must be used for selectable nodes.

2. **Event propagation in editors**: Rich text editors often have click handlers at the root level that manage selection. Custom nodes must use `e.stopPropagation()` to prevent their selection from being immediately cleared.

3. **Lexical node selection**: Use `$createNodeSelection()` and `$setSelection()` APIs, not `node.select()` (which doesn't exist on DecoratorNode).

4. **Selection state tracking**: Use `editor.registerUpdateListener()` to track when the editor's selection changes and update component state accordingly.

## Files Modified

- `components/nabu/notes/lexical-image-node.tsx`
  - Modified `createDOM()` method
  - Added selection state tracking
  - Added click handler with `stopPropagation`
  - Added visual selection indicator
  - Imported `React` for hooks

## Future Enhancements

- [ ] Implement Lexical Playground-style resize handles with drag-to-resize (see TODO)
- [ ] Add multi-image selection support
- [ ] Add keyboard shortcuts for image operations (e.g., Cmd+D to duplicate)

## Testing Checklist

✅ Image displays at correct size  
✅ Image can be selected by clicking  
✅ Image shows visual indicator when selected (blue ring)  
✅ Image can be deleted with Delete/Backspace key  
✅ Image can be deleted with hover button  
✅ Image deletion removes from database and storage  
✅ Multiple images in same note work correctly  
✅ SVG images work correctly
