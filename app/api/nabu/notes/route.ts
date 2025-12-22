import { NextRequest } from "next/server";
import { prisma, prismaClient } from "@/lib/db";
import { noteCreateSchema, noteQuerySchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  formatNoteResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { syncContentHashtagsToNote } from "@/lib/tag-sync-helper";
import { verifyWorkspaceMembership } from "@/lib/workspace-helpers";

/**
 * GET /api/nabu/notes
 * List user's notes with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Validate query params
    const queryResult = noteQuerySchema.safeParse({
      folderId: searchParams.get("folderId") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      search: searchParams.get("search") || undefined,
      visibility: searchParams.get("visibility") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    if (!queryResult.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const { folderId, tagId, search, visibility, page = 1, limit = 20 } = queryResult.data;

    // Build query - middleware automatically handles workspace filtering and tenant isolation
    const where: any = {
      deletedAt: null,
    };

    if (folderId !== undefined) {
      // Handle string "null" as actual null for uncategorised notes
      where.folderId = folderId === 'null' ? null : folderId;
    }

    if (visibility) {
      where.visibility = visibility;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tagId) {
      where.noteTags = {
        some: {
          tagId,
        },
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch notes and total count
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          noteTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  type: true,
                },
              },
            },
          },
          _count: {
            select: {
              noteTags: true,
              attachments: true,
              thoughts: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    const formattedNotes = notes.map(formatNoteResponse);

    return new Response(
      JSON.stringify(
        successResponse({
          notes: formattedNotes,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        })
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/nabu/notes
 * Create a new note with tags
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request body
    const validationResult = noteCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const { tagIds, ...noteData } = validationResult.data;

    // If folderId is provided, verify it exists and user has access (middleware handles filtering)
    if (noteData.folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: noteData.folderId,
          deletedAt: null,
        },
      });

      if (!folder) {
        return errorResponse("Folder not found", 404);
      }
      
      // If folder belongs to a workspace, ensure note's workspaceId matches (if provided)
      if (folder.workspaceId && noteData.workspaceId && folder.workspaceId !== noteData.workspaceId) {
        return errorResponse("Folder belongs to a different workspace", 400);
      }
      // If folder is workspace folder but note doesn't have workspaceId, inherit it
      if (folder.workspaceId && !noteData.workspaceId) {
        noteData.workspaceId = folder.workspaceId;
      }
    }

    // If tagIds provided, verify they exist and user has access (middleware handles filtering)
    if (tagIds && tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          deletedAt: null,
        },
      });

      if (tags.length !== tagIds.length) {
        return errorResponse("One or more tags not found", 404);
      }
      
      // Ensure tags belong to same workspace as note (if workspace note)
      if (noteData.workspaceId) {
        const invalidTags = tags.filter(tag => tag.workspaceId !== noteData.workspaceId);
        if (invalidTags.length > 0) {
          return errorResponse("Tags must belong to the same workspace as the note", 400);
        }
      }
    }

    // Create note with tags in a transaction
    // Use prismaClient (base client) for transactions - middleware extensions don't work with transactions
    // We need to manually set tenantId and verify workspace membership
    const note = await prismaClient.$transaction(async (tx) => {
      // Determine tenantId based on workspaceId
      // If workspaceId is set, tenantId should be null (workspace items)
      // Otherwise, use session tenantId (personal items)
      const finalTenantId = noteData.workspaceId ? null : tenantId;
      
      // Verify workspace membership if workspaceId is provided
      if (noteData.workspaceId) {
        await verifyWorkspaceMembership(userId, noteData.workspaceId);
      }
      
      // Create note - manually set fields that middleware would set
      const createdNote = await tx.note.create({
        data: {
          ...noteData,
          userId,
          tenantId: finalTenantId, // Set manually (null for workspace, tenantId for personal)
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Link tags
      if (tagIds && tagIds.length > 0) {
        await tx.noteTag.createMany({
          data: tagIds.map((tagId) => ({
            noteId: createdNote.id,
            tagId,
            tenantId: finalTenantId, // Set manually for consistency
            createdBy: userId,
          })),
        });
      }

      // Fetch note with relations
      return await tx.note.findUnique({
        where: { id: createdNote.id },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          noteTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  type: true,
                },
              },
            },
          },
          _count: {
            select: {
              noteTags: true,
              attachments: true,
              thoughts: true,
            },
          },
        },
      });
    });

    // Embeddings will be generated by background cron job
    // This prevents excessive embedding generation during active editing
    console.log(`[NOTE CREATE] Note ${note!.id} created, embeddings will be generated by background job after 2 minutes of inactivity`);

    // Sync hashtags from content to tags (fallback for when mention plugin doesn't capture them)
    if (note!.content) {
      await syncContentHashtagsToNote(
        note!.id,
        note!.content,
        userId,
        tenantId
      );
    }

    return new Response(
      JSON.stringify(successResponse(formatNoteResponse(note), "Note created successfully")),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

