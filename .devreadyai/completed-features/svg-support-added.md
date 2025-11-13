# SVG Support Added to Image Upload

**Date:** November 13, 2024  
**Type:** Feature Enhancement  
**Parent Feature:** Image Upload Support

## Overview

Added SVG (Scalable Vector Graphics) support to the image upload system. SVGs bypass compression and dimension extraction since they're vector graphics that scale infinitely without quality loss.

## Changes Made

### 1. Image Compression Library (`lib/image-compression.ts`)

**Added:**
- `image/svg+xml` to `SUPPORTED_IMAGE_TYPES` array
- `isSvgFile()` helper function to detect SVG files
- Early return in `compressImage()` to skip compression for SVGs

**SVG Handling:**
```typescript
if (isSvgFile(file)) {
  return {
    file,
    metadata: {
      width: 0,  // SVGs don't have fixed dimensions
      height: 0,
      fileSize: file.size,
      mimeType: file.type,
    },
    wasCompressed: false,
  };
}
```

### 2. API Validation (`app/api/nabu/images/upload-url/route.ts`)

**Updated regex pattern:**
```typescript
mimeType: z.string().regex(
  /^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/,
  "Invalid image type"
)
```

### 3. Frontend Upload Hook (`components/nabu/notes/use-image-upload.ts`)

**Added comment:**
```typescript
// Step 1: Compress image (20% progress)
// Note: SVGs are not compressed (they're vector graphics and don't benefit from it)
```

### 4. Image Node Component (`components/nabu/notes/lexical-image-node.tsx`)

**Enhanced rendering:**
- Detects SVG files by URL pattern
- Removes fixed width/height for SVGs (they scale naturally)
- Adds light background for SVGs in dark mode
- Adds padding for better visual appearance

```typescript
const isSvg = src.includes('.svg') || src.includes('image/svg');

<img
  width={!isSvg && width ? width : undefined}
  height={!isSvg && height ? height : undefined}
  className={`w-full h-auto rounded-lg border border-border ${
    isSvg ? 'bg-white dark:bg-slate-50 p-2' : ''
  }`}
/>
```

### 5. Toolbar File Input (`components/nabu/notes/lexical-toolbar.tsx`)

**Updated accept attribute:**
```typescript
<input
  type="file"
  accept="image/*,.svg"  // Explicitly include .svg
/>
```

## Benefits

✅ **Perfect Quality:** SVGs maintain crisp edges at any zoom level  
✅ **Smaller Files:** SVGs are usually small text-based files  
✅ **Faster Upload:** No compression step needed  
✅ **Infinite Scaling:** No pixelation when resized  
✅ **Dark Mode Support:** Added light background for visibility  

## Use Cases

- **Logos and icons** - Perfect for brand assets
- **Diagrams and charts** - Technical documentation
- **Illustrations** - Design work and mockups
- **Simple graphics** - UI elements and shapes

## Technical Details

### File Size Limits
- Same 10MB limit applies to SVGs
- Most SVGs are < 100KB (text-based)

### Metadata Stored
- `width: 0` (SVGs have no fixed dimensions)
- `height: 0` (SVGs scale infinitely)
- `fileSize`: Actual file size in bytes
- `mimeType`: "image/svg+xml"

### Compression Behavior
- **Raster images** (JPEG, PNG, WebP, GIF): Compressed to max 2MB / 1920px
- **SVG files**: Passed through unchanged (no compression)

### Database Storage
Same `ImageAttachment` model used, with `width` and `height` set to 0 for SVGs.

## Security Considerations

⚠️ **SVG files can contain JavaScript** - Current implementation:
- Supabase storage serves SVGs with proper Content-Type
- Browser security handles SVG rendering
- Consider adding SVG sanitization in future if needed

**Recommendation:** For user-generated SVGs, consider adding sanitization using a library like `DOMPurify` in a future update.

## Testing Checklist

- [x] Upload SVG via toolbar button
- [x] Drag and drop SVG file
- [x] Paste SVG from clipboard
- [x] SVG renders correctly in editor
- [x] SVG scales properly (no fixed dimensions)
- [x] Delete SVG works correctly
- [x] SVG shows in storage dashboard
- [x] Light background in dark mode
- [x] No linting errors

## Files Modified

1. `lib/image-compression.ts` - Added SVG detection and bypass
2. `app/api/nabu/images/upload-url/route.ts` - Updated validation regex
3. `components/nabu/notes/use-image-upload.ts` - Added explanatory comment
4. `components/nabu/notes/lexical-image-node.tsx` - SVG-specific rendering
5. `components/nabu/notes/lexical-toolbar.tsx` - File input accept attribute

## Future Enhancements

Potential improvements for SVG handling:

1. **SVG Sanitization** - Remove potentially malicious scripts
2. **SVG Optimization** - Remove unnecessary metadata (SVGO)
3. **SVG Preview** - Better thumbnail generation for SVGs
4. **Color Theming** - Apply theme colors to SVG elements
5. **Inline Editing** - Basic SVG editing capabilities

## Compatibility

- ✅ All modern browsers support SVG
- ✅ Next.js Image component handles SVGs
- ✅ Supabase storage supports SVG files
- ✅ Lexical editor displays SVGs correctly

