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
import { syncContentHashtagsToNote } from "@/lib/tag-sync-helper";
import { shouldRegenerateEmbeddings, prepareNoteContent, extractTextContent } from "@/lib/embeddings";

/**
 * GET /api/nabu/notes/[id]
 * Get a single note by ID with all relations
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: {
        id,
        userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        content: true,
        contentState: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
        tagSuggestionStatus: true,
        lastTagSuggestionAt: true,
        lastTagModifiedAt: true,
        pendingJobId: true,
        folder: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        noteTags: {
          where: {
            deletedAt: null, // Only include active NoteTag links
          },
          select: {
            source: true,
            confidence: true,
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
          where: {
            deletedAt: null, // Only include active links
          },
          select: {
            id: true,
            toNoteId: true,
            to: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        incomingLinks: {
          where: {
            deletedAt: null, // Only include active links
          },
          select: {
            id: true,
            fromNoteId: true,
            from: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        thoughts: {
          where: {
            state: 'PROMOTED',
            deletedAt: null,
          },
          select: {
            id: true,
            content: true,
            meta: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
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
      toNoteId: link.toNoteId,
      toNoteTitle: link.to.title,
    }));
    (formattedNote as any).incomingLinks = note.incomingLinks.map((link: any) => ({
      id: link.id,
      fromNoteId: link.fromNoteId,
      fromNoteTitle: link.from.title,
    }));
    (formattedNote as any).thoughts = note.thoughts || [];

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id } = await params;

    // Verify ownership and get existing note
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingNote) {
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

    // Check if content has changed (title or content/contentState)
    const oldContentForComparison = prepareNoteContent(
      existingNote.title,
      extractTextContent(existingNote.contentState) || existingNote.content
    );
    const newContentForComparison = prepareNoteContent(
      noteData.title ?? existingNote.title,
      noteData.contentState
        ? extractTextContent(noteData.contentState)
        : noteData.content ?? existingNote.content
    );
    const contentChanged = shouldRegenerateEmbeddings(
      oldContentForComparison,
      newContentForComparison
    );

    // Update note with tags in a transaction
    const note = await prisma.$transaction(async (tx) => {
      // Update note
      const updatedNote = await tx.note.update({
        where: { id },
        data: {
          ...noteData,
          updatedBy: userId,
        },
      });

      // Update tags if provided
      if (tagIds !== undefined) {
        // Remove existing tags
        await tx.noteTag.deleteMany({
          where: { noteId: id },
        });

        // Add new tags
        if (tagIds.length > 0) {
          await tx.noteTag.createMany({
            data: tagIds.map((tagId) => ({
              noteId: id,
              tagId,
              createdBy: userId,
            })),
          });
        }
      }

      // Fetch note with relations
      return await tx.note.findUnique({
        where: { id },
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
    if (contentChanged) {
      console.log(`[NOTE UPDATE] Content changed for note ${note!.id}, embeddings will be generated by background job after 2 minutes of inactivity`);
    } else {
      console.log(`[NOTE UPDATE] Content not changed for note ${note!.id}, skipping embeddings`);
    }

    // Sync hashtags from content to tags (fallback for when mention plugin doesn't capture them)
    if (noteData.content !== undefined || noteData.contentState !== undefined) {
      const contentToCheck = noteData.content ?? note!.content;
      if (contentToCheck) {
        await syncContentHashtagsToNote(
          id,
          contentToCheck,
          userId,
          tenantId
        );
      }
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id } = await params;

    // Verify ownership
    const isOwner = await validateOwnership("note", id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Note not found or access denied", 404);
    }

    // Soft delete note (thoughts relation preserved)
    await prisma.note.update({
      where: { id },
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

