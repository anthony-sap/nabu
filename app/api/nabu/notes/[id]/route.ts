import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { noteUpdateSchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  validateOwnership,
  formatNoteResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/notes/[id]
 * Get a single note by ID with all relations
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId,
        tenantId,
        deletedAt: null,
      },
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
        attachments: {
          where: { deletedAt: null },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            createdAt: true,
          },
        },
        outgoingLinks: {
          include: {
            to: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        incomingLinks: {
          include: {
            from: {
              select: {
                id: true,
                title: true,
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

    if (!note) {
      return errorResponse("Note not found", 404);
    }

    const formattedNote = formatNoteResponse(note);

    // Add additional relations
    (formattedNote as any).attachments = note.attachments;
    (formattedNote as any).outgoingLinks = note.outgoingLinks.map((link: any) => ({
      id: link.id,
      relation: link.relation,
      to: link.to,
    }));
    (formattedNote as any).incomingLinks = note.incomingLinks.map((link: any) => ({
      id: link.id,
      relation: link.relation,
      from: link.from,
    }));

    return new Response(JSON.stringify(successResponse(formattedNote)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/nabu/notes/[id]
 * Update a note
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Verify ownership
    const isOwner = await validateOwnership("note", params.id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Note not found or access denied", 404);
    }

    const body = await req.json();

    // Validate request body
    const validationResult = noteUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const { tagIds, ...noteData } = validationResult.data;

    // If folderId is being changed, verify it exists
    if (noteData.folderId !== undefined && noteData.folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: noteData.folderId,
          userId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!folder) {
        return errorResponse("Folder not found", 404);
      }
    }

    // If tagIds provided, verify they exist
    if (tagIds && tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          userId,
          tenantId,
          deletedAt: null,
        },
      });

      if (tags.length !== tagIds.length) {
        return errorResponse("One or more tags not found", 404);
      }
    }

    // Update note with tags in a transaction
    const note = await prisma.$transaction(async (tx) => {
      // Update note
      const updatedNote = await tx.note.update({
        where: { id: params.id },
        data: {
          ...noteData,
          updatedBy: userId,
        },
      });

      // Update tags if provided
      if (tagIds !== undefined) {
        // Remove existing tags
        await tx.noteTag.deleteMany({
          where: { noteId: params.id },
        });

        // Add new tags
        if (tagIds.length > 0) {
          await tx.noteTag.createMany({
            data: tagIds.map((tagId) => ({
              noteId: params.id,
              tagId,
              createdBy: userId,
            })),
          });
        }
      }

      // Fetch note with relations
      return await tx.note.findUnique({
        where: { id: params.id },
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

    return new Response(
      JSON.stringify(successResponse(formatNoteResponse(note), "Note updated successfully")),
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
 * DELETE /api/nabu/notes/[id]
 * Soft-delete a note
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Verify ownership
    const isOwner = await validateOwnership("note", params.id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Note not found or access denied", 404);
    }

    // Soft delete note (thoughts relation preserved)
    await prisma.note.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return new Response(
      JSON.stringify(successResponse(null, "Note deleted successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

