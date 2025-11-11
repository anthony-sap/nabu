import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

/**
 * API Response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Extract user context (userId and tenantId) from session
 */
export async function getUserContext(): Promise<{
  userId: string;
  tenantId: string | null;
  email: string;
}> {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    throw new Error("Unauthorized");
  }

  return {
    userId: user.id,
    tenantId: user.tenantId || null,
    email: user.email || "",
  };
}

/**
 * Validate that the current user owns a resource
 */
export async function validateOwnership(
  resourceType: "folder" | "tag" | "note" | "thought",
  resourceId: string,
  userId: string,
  tenantId: string | null
): Promise<boolean> {
  let resource: any;

  switch (resourceType) {
    case "folder":
      resource = await prisma.folder.findFirst({
        where: { id: resourceId, userId, tenantId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "tag":
      resource = await prisma.tag.findFirst({
        where: { id: resourceId, userId, tenantId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "note":
      resource = await prisma.note.findFirst({
        where: { id: resourceId, userId, tenantId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "thought":
      resource = await prisma.thought.findFirst({
        where: { id: resourceId, userId, tenantId, deletedAt: null },
        select: { id: true },
      });
      break;
    default:
      return false;
  }

  return !!resource;
}

/**
 * Format Note with relations for API response
 */
export function formatNoteResponse(note: any) {
  return {
    id: note.id,
    tenantId: note.tenantId,
    userId: note.userId,
    folderId: note.folderId,
    title: note.title,
    content: note.content,
    contentState: note.contentState || null,
    sourceThoughts: note.sourceThoughts || [],
    summary: note.summary,
    visibility: note.visibility,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt,
    folder: note.folder
      ? {
          id: note.folder.id,
          name: note.folder.name,
          color: note.folder.color,
        }
      : null,
    tags: note.noteTags
      ? note.noteTags.map((nt: any) => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color,
          type: nt.tag.type,
        }))
      : [],
    _count: note._count,
  };
}

/**
 * Format Thought with relations for API response
 */
export function formatThoughtResponse(thought: any) {
  return {
    id: thought.id,
    tenantId: thought.tenantId,
    userId: thought.userId,
    noteId: thought.noteId,
    content: thought.content,
    contentState: thought.contentState || null,
    source: thought.source,
    state: thought.state,
    suggestedTags: thought.suggestedTags || [],
    meta: thought.meta,
    createdAt: thought.createdAt,
    updatedAt: thought.updatedAt,
    deletedAt: thought.deletedAt,
    note: thought.note
      ? {
          id: thought.note.id,
          title: thought.note.title,
        }
      : null,
    _count: thought._count,
  };
}

/**
 * Format Folder with relations for API response
 */
export function formatFolderResponse(folder: any, includeChildren = false) {
  const formatted: any = {
    id: folder.id,
    tenantId: folder.tenantId,
    userId: folder.userId,
    name: folder.name,
    description: folder.description,
    color: folder.color,
    parentId: folder.parentId,
    order: folder.order,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    deletedAt: folder.deletedAt,
    _count: folder._count,
  };

  if (includeChildren && folder.children) {
    formatted.children = folder.children.map((child: any) =>
      formatFolderResponse(child, true)
    );
  }

  return formatted;
}

/**
 * Format Tag with relations for API response
 */
export function formatTagResponse(tag: any) {
  return {
    id: tag.id,
    tenantId: tag.tenantId,
    userId: tag.userId,
    name: tag.name,
    color: tag.color,
    type: tag.type,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    deletedAt: tag.deletedAt,
    _count: tag._count,
  };
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create error response
 */
export function errorResponse(error: string, status = 500): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): Response {
  console.error("API Error:", error);

  if (error.message === "Unauthorized") {
    return errorResponse("Unauthorized", 401);
  }

  if (error.code === "P2002") {
    return errorResponse("Resource already exists", 409);
  }

  if (error.code === "P2025") {
    return errorResponse("Resource not found", 404);
  }

  return errorResponse(
    error.message || "Internal server error",
    error.status || 500
  );
}

