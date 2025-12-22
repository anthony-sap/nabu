# Image Upload Support for Lexical Editor - Implementation Details

**Feature ID:** image-upload-support  
**Phase:** Nabu Note-Taking System  
**Completed:** November 13, 2024  
**Status:** ✅ Complete

## Overview

Implemented comprehensive image upload functionality for the Lexical editor using Supabase storage, client-side compression, direct client-to-storage uploads via signed URLs, and storage management dashboard.

## Implementation Summary

### 1. Database Schema

**Created `ImageAttachment` Model** (`prisma/schema.prisma`)
- Full audit trail fields (tenantId, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy)
- File metadata (filename, originalFilename, storagePath, url)
- File properties (fileSize, mimeType, width, height)
- Optimized versions support (thumbnailUrl, mediumUrl) for future use
- Proper indexes for performance (noteId, tenantId, fileSize, createdAt)
- Relations to Note and Tenant models

**Migration:** `20251113085620_add_image_attachment_model`

### 2. Documentation

**Created `.devreadyai/other/database-audit-standards.md`**
- Documents required audit fields for all database models
- Explains automatic handling via Prisma middleware
- Provides example model structure and best practices

### 3. Environment Configuration

**Updated `env.ts`**
- Added server-side: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- No client-side Supabase variables needed (uses signed URLs)
- Full validation with Zod schemas

### 4. Backend Infrastructure

#### Supabase Client Utilities (`lib/supabase.ts`)
- Server-side client with service role key (backend only)
- Deprecated client-side client (no longer used)
- Signed upload URL generation for secure client uploads
- Public URL retrieval
- File deletion from storage
- Filename sanitization and unique generation
- Storage path building helpers

#### Image Compression (`lib/image-compression.ts`)
- Browser-based compression using `browser-image-compression`
- Target: 2MB max, 1920px max dimension
- Dimension extraction from images
- Comprehensive validation (file type, size)
- Support for JPEG, PNG, WebP, GIF, **SVG**
- **SVGs bypass compression** (they're vector graphics)
- File size formatting utilities

### 5. API Routes

#### Upload URL Generation (`app/api/nabu/images/upload-url/route.ts`)
- POST endpoint for requesting signed upload URL
- Validates user owns the note
- 10MB max file size enforcement
- Creates pending ImageAttachment record
- Returns uploadUrl, imageId, storagePath

#### Upload Confirmation (`app/api/nabu/images/[imageId]/confirm/route.ts`)
- POST endpoint to confirm upload completion
- Updates ImageAttachment with public URL
- Triggers future optimization (placeholder for edge function)

#### Image Deletion (`app/api/nabu/images/[imageId]/route.ts`)
- DELETE endpoint with ownership validation
- Soft-deletes ImageAttachment record
- Removes file from Supabase storage
- Graceful handling if storage deletion fails

#### Storage Statistics (`app/api/nabu/storage/stats/route.ts`)
- GET endpoint for storage usage analytics
- Total usage in bytes/MB/GB
- Total image count
- Top 20 files by size with note details

### 6. Frontend Components

#### Image Upload Hook (`components/nabu/notes/use-image-upload.ts`)
- React hook for managing upload state
- Handles compression, signed URL request, direct upload, confirmation
- Progress tracking (0-100%)
- Error handling and state management
- Support for single and multiple image uploads

#### Custom Lexical Image Node (`components/nabu/notes/lexical-image-node.tsx`)
- Custom DecoratorNode for Lexical editor
- Supports serialization/deserialization
- DOM import/export for copy-paste
- Delete button overlay on hover
- Loading state with Suspense
- Stores imageId for backend reference

#### Image Plugin (`components/nabu/notes/lexical-image-plugin.tsx`)
- Drag-and-drop support
- Paste image support
- INSERT_IMAGE_COMMAND for programmatic insertion
- DELETE_IMAGE_COMMAND with API integration
- Toast notifications for user feedback

#### Lexical Editor Integration (`components/nabu/notes/lexical-editor.tsx`)
- Added CustomImageNode to nodes configuration
- Added ImagePlugin to plugin list
- New `noteId` prop (optional)
- Plugin only active when noteId is provided

#### Lexical Toolbar (`components/nabu/notes/lexical-toolbar.tsx`)
- Image upload button with file picker
- Integration with useImageUpload hook
- Disabled state during upload
- Dispatches INSERT_IMAGE_COMMAND after upload
- Only shown when noteId is available

#### Note Editor (`components/nabu/notes/note-editor.tsx`)
- Passes noteId prop to LexicalEditor
- Enables image upload in note editing context

#### Storage Dashboard (`app/nabu/storage/page.tsx`)
- Overview cards: Total storage, total images, average size
- Top 20 files by size table
- Image thumbnails
- File metadata display
- Linked note navigation
- Delete functionality per image
- Real-time updates after deletion

### 7. Next.js Configuration

**Updated `next.config.ts`**
- Added `*.supabase.co` to image remote patterns
- Enables Next.js Image optimization for Supabase-hosted images

### 8. Package Dependencies

**Installed:**
- `@supabase/supabase-js` - Supabase client library
- `browser-image-compression` - Client-side image compression

**Already available:**
- `@lexical/react` - Lexical editor framework

## Technical Architecture

### Upload Flow

1. **User Action:** User clicks image button, drags image, or pastes image
2. **Compression:** Client compresses image (2MB max, 1920px max)
3. **Request Signed URL:** API validates note ownership and creates pending ImageAttachment
4. **Direct Upload:** Client uploads directly to Supabase storage using signed URL via plain `fetch()` (no Supabase SDK)
5. **Confirmation:** Client confirms upload, API updates ImageAttachment with public URL
6. **Editor Insertion:** ImageNode inserted into Lexical editor with URL and imageId

**Key Security Feature:** No Supabase credentials exposed to frontend - signed URLs are temporary (5 min expiry) and single-use

### Security Features

- **Signed URLs:** Expire after 5 minutes, prevent unauthorized uploads
- **Ownership Validation:** API validates user owns note before issuing upload URL
- **Tenant Isolation:** RLS policies enforce tenant-level access control
- **File Size Limits:** Enforced at API level (10MB) and compression level (2MB target)
- **Audit Trail:** Full tracking of who created/updated/deleted images

### Performance Optimizations

- **Client-Side Compression:** Reduces bandwidth and server load
- **Direct Upload to Storage:** Bypasses API server for file transfer
- **Lazy Loading:** Images load on-demand in editor
- **Indexed Queries:** Fast retrieval for storage statistics
- **Soft Deletes:** Preserves history without cluttering active data

## Future Enhancements

### Planned (Not Yet Implemented)

1. **Supabase Edge Function for Image Optimization**
   - Generate thumbnail (300px width)
   - Generate medium size (800px width)
   - Update ImageAttachment with optimized URLs

2. **Database Cleanup Triggers**
   - Automatic cleanup on note deletion
   - Cascade delete to ImageAttachment records
   - Remove orphaned files from storage

3. **Advanced Features**
   - Image captions
   - Alt text editing
   - Image resizing in editor
   - Alignment options (left, center, right)
   - Image galleries
   - Lightbox for full-screen view

## Testing Checklist

### User Testing Required

- [ ] Upload image via toolbar button
- [ ] Drag and drop image into editor
- [ ] Paste image from clipboard
- [ ] Delete image from editor
- [ ] View storage dashboard
- [ ] Delete image from storage dashboard
- [ ] Navigate to note from storage dashboard
- [ ] Test with various image formats (JPEG, PNG, WebP, GIF)
- [ ] Test with large images (> 2MB)
- [ ] Test with images exceeding 10MB (should fail gracefully)
- [ ] Test upload when not logged in (should fail)
- [ ] Test upload to note user doesn't own (should fail)

### Environment Setup Required

User must configure these environment variables (server-side only):

```env
# Supabase Configuration (Backend Only)
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

**Note:** No public/client-side Supabase variables needed. The frontend uses signed URLs generated by the backend.

### Supabase Setup Required

1. Create storage bucket named `note-images`
2. Set bucket to public access
3. Configure file size limit (10MB)
4. Set up RLS policies:
   - Allow authenticated users to upload to their tenant's path
   - Allow public read access

## Files Created

### Backend
- `lib/supabase.ts` - Supabase client utilities
- `lib/image-compression.ts` - Image compression utilities
- `app/api/nabu/images/upload-url/route.ts` - Signed URL generation
- `app/api/nabu/images/[imageId]/confirm/route.ts` - Upload confirmation
- `app/api/nabu/images/[imageId]/route.ts` - Image deletion
- `app/api/nabu/storage/stats/route.ts` - Storage statistics

### Frontend
- `components/nabu/notes/use-image-upload.ts` - Upload hook
- `components/nabu/notes/lexical-image-node.tsx` - Custom ImageNode
- `components/nabu/notes/lexical-image-plugin.tsx` - Image plugin
- `app/nabu/storage/page.tsx` - Storage dashboard

### Documentation
- `.devreadyai/other/database-audit-standards.md` - Audit standards documentation
- `.devreadyai/completed-features/image-upload-support_details.md` - This file

## Files Modified

- `prisma/schema.prisma` - Added ImageAttachment model
- `env.ts` - Added Supabase environment variables
- `next.config.ts` - Added Supabase domain to image patterns
- `components/nabu/notes/lexical-editor.tsx` - Integrated image support
- `components/nabu/notes/lexical-toolbar.tsx` - Added image upload button
- `components/nabu/notes/note-editor.tsx` - Passed noteId to editor
- `package.json` - Added Supabase and compression dependencies

## Database Migration

```bash
npx prisma migrate dev --name add_image_attachment_model
```

## Known Limitations

1. **No Image Optimization Yet:** Edge function for thumbnail/medium generation not implemented
2. **No Batch Upload UI:** Currently one image at a time via button (drag/paste support multiple)
3. **No Image Editing:** No built-in cropping or filtering
4. **Storage Limits:** No per-tenant storage quotas enforced
5. **No Progress Bar:** Upload progress is tracked but not displayed visually in toolbar

## Alignment with Plan

✅ All items from `image-upload-support.plan.md` implemented except:
- Edge function for background optimization (marked as TODO in code)
- Database trigger for cleanup on note deletion (can be added later)

## Dependencies

- PostgreSQL database
- Supabase project with storage enabled
- Next.js 15+
- React 19+
- Prisma 6+
- Lexical 0.38+

