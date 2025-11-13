import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * POST /api/nabu/notes/[id]/links
 * Add links to a note (create links if needed, restore if soft-deleted)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;
    const body = await req.json();
    const { noteIds } = body as { noteIds: string[] };

    if (!noteIds || !Array.isArray(noteIds)) {
      return errorResponse("noteIds array is required", 400);
    }

    // Verify note ownership
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!note) {
      return errorResponse("Note not found", 404);
    }
    
    // Process each link
    await Promise.all(
      noteIds.map(async (toNoteId) => {
        // Verify target note exists and user has access
        const targetNote = await prisma.note.findFirst({
          where: {
            id: toNoteId,
            userId,
            tenantId,
            deletedAt: null,
          },
        });

        if (!targetNote) {
          return;
        }

        // Check if link already exists (including soft-deleted)
        const activeLink = await prisma.noteLink.findFirst({
          where: {
            fromNoteId: noteId,
            toNoteId,
            deletedAt: null,
          },
        });

        const deletedLink = await prisma.noteLink.findFirst({
          where: {
            fromNoteId: noteId,
            toNoteId,
            deletedAt: { not: null },
          },
        });

        if (activeLink) {
          // Already linked, skip
        } else if (deletedLink) {
          // Restore the soft-deleted link
          await prisma.noteLink.update({
            where: {
              id: deletedLink.id,
            },
            data: {
              deletedAt: null,
              updatedBy: userId,
            },
          });
        } else {
          // Create new link with default relation "RELATED"
          await prisma.noteLink.create({
            data: {
              fromNoteId: noteId,
              toNoteId,
              tenantId,
              relation: "RELATED",
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }
      })
    );

    // Fetch updated links for this note (middleware-safe pattern)
    const noteWithLinks = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        outgoingLinks: {
          where: {
            deletedAt: null,
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
      },
    });

    const links = (noteWithLinks?.outgoingLinks || []).map((link) => ({
      id: link.id,
      toNoteId: link.toNoteId,
      toNoteTitle: link.to.title,
    }));

    return new Response(JSON.stringify(successResponse({ links })), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/nabu/notes/[id]/links
 * Remove links from a note (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;
    const body = await req.json();
    const { noteIds } = body as { noteIds: string[] };

    if (!noteIds || !Array.isArray(noteIds)) {
      return errorResponse("noteIds array is required", 400);
    }

    // Verify note ownership
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!note) {
      return errorResponse("Note not found", 404);
    }
    
    // Soft delete links (NOT hard delete!)
    if (noteIds.length > 0) {
      const deleteResult = await prisma.noteLink.updateMany({
        where: {
          fromNoteId: noteId,
          toNoteId: { in: noteIds },
          deletedAt: null, // Only update records that aren't already deleted
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    // Fetch remaining links for this note (middleware-safe pattern)
    const noteWithLinks = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        outgoingLinks: {
          where: {
            deletedAt: null,
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
      },
    });

    const remainingLinks = (noteWithLinks?.outgoingLinks || []).map((link) => ({
      id: link.id,
      toNoteId: link.toNoteId,
      toNoteTitle: link.to.title,
    }));

    return new Response(JSON.stringify(successResponse({ links: remainingLinks })), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

