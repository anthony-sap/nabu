import { ThoughtSource, ThoughtState, NoteVisibility, TagType } from "@prisma/client";
import * as z from "zod";

// ============================================================================
// Folder Schemas
// ============================================================================

export const folderCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional(),
  parentId: z.string().cuid().optional(),
  order: z.number().int().min(0).optional(),
});

export const folderUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const folderResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  order: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  // Relations can be added as needed
  children: z.array(z.lazy(() => folderResponseSchema)).optional(),
  _count: z.object({
    notes: z.number(),
    children: z.number(),
  }).optional(),
  // Notes list (titles only, no content)
  notes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })).optional(),
});

// ============================================================================
// Tag Schemas
// ============================================================================

export const tagCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional(),
  type: z.nativeEnum(TagType).optional(),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional().nullable(),
  type: z.nativeEnum(TagType).optional().nullable(),
});

export const tagResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  userId: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  type: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  _count: z.object({
    noteTags: z.number(),
  }).optional(),
});

// ============================================================================
// Note Schemas
// ============================================================================

export const noteCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required"),
  contentState: z.string().optional(), // Lexical JSON state
  folderId: z.string().cuid().optional(),
  summary: z.string().max(2000).optional(),
  visibility: z.nativeEnum(NoteVisibility).optional(),
  sourceThoughts: z.array(z.string().cuid()).default([]),
  tagIds: z.array(z.string().cuid()).default([]),
});

export const noteUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  contentState: z.string().optional().nullable(),
  folderId: z.string().cuid().optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  visibility: z.nativeEnum(NoteVisibility).optional(),
  sourceThoughts: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const noteResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  userId: z.string(),
  folderId: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  contentState: z.string().nullable().optional(),
  sourceThoughts: z.array(z.string()),
  summary: z.string().nullable(),
  visibility: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  folder: folderResponseSchema.pick({ id: true, name: true, color: true }).nullable().optional(),
  tags: z.array(tagResponseSchema.pick({ id: true, name: true, color: true, type: true })).optional(),
  _count: z.object({
    noteTags: z.number(),
    attachments: z.number(),
    thoughts: z.number(),
  }).optional(),
});

// ============================================================================
// Thought Schemas
// ============================================================================

export const thoughtCreateSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentState: z.string().optional(), // Lexical JSON state
  source: z.nativeEnum(ThoughtSource),
  suggestedTags: z.array(z.string()).default([]),
  meta: z.record(z.any()).optional(),
  noteId: z.string().cuid().optional(),
});

export const thoughtUpdateSchema = z.object({
  content: z.string().optional(),
  contentState: z.string().optional().nullable(),
  state: z.nativeEnum(ThoughtState).optional(),
  suggestedTags: z.array(z.string()).optional(),
  meta: z.record(z.any()).optional().nullable(),
  noteId: z.string().cuid().optional().nullable(),
});

export const thoughtResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  userId: z.string(),
  noteId: z.string().nullable(),
  content: z.string(),
  contentState: z.string().nullable().optional(),
  source: z.string(),
  state: z.string(),
  suggestedTags: z.array(z.string()),
  meta: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  note: noteResponseSchema.pick({ id: true, title: true }).nullable().optional(),
  _count: z.object({
    attachments: z.number(),
  }).optional(),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const folderQuerySchema = z.object({
  parentId: z.string().cuid().optional(),
  includeChildren: z.string().transform(val => val === "true").optional(),
  includeNotes: z.string().transform(val => val === "true").optional(),
});

export const tagQuerySchema = z.object({
  type: z.nativeEnum(TagType).optional(),
});

export const noteQuerySchema = z.object({
  folderId: z.string().cuid().optional(),
  tagId: z.string().cuid().optional(),
  search: z.string().max(500).optional(),
  visibility: z.nativeEnum(NoteVisibility).optional(),
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
});

export const thoughtQuerySchema = z.object({
  state: z.nativeEnum(ThoughtState).optional(),
  source: z.nativeEnum(ThoughtSource).optional(),
  noteId: z.string().cuid().optional(),
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type FolderCreate = z.infer<typeof folderCreateSchema>;
export type FolderUpdate = z.infer<typeof folderUpdateSchema>;
export type FolderResponse = z.infer<typeof folderResponseSchema>;

export type TagCreate = z.infer<typeof tagCreateSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;

export type NoteCreate = z.infer<typeof noteCreateSchema>;
export type NoteUpdate = z.infer<typeof noteUpdateSchema>;
export type NoteResponse = z.infer<typeof noteResponseSchema>;

export type ThoughtCreate = z.infer<typeof thoughtCreateSchema>;
export type ThoughtUpdate = z.infer<typeof thoughtUpdateSchema>;
export type ThoughtResponse = z.infer<typeof thoughtResponseSchema>;

