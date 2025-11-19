import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * POST /api/nabu/notes/[id]/tags
 * Add tags to a note (create tags if they don't exist)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;
    const body = await req.json();
    const { tagNames } = body as { tagNames: string[] };

    if (!tagNames || !Array.isArray(tagNames)) {
      return errorResponse("tagNames array is required", 400);
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
    
    // Process each tag
    const results = await Promise.all(
      tagNames.map(async (tagName) => {
        // Find or create tag
        let tag = await prisma.tag.findFirst({
          where: {
            name: tagName,
            userId,
            tenantId,
            deletedAt: null,
          },
        });

        if (!tag) {
          // Create new tag with USER_ADDED source
          tag = await prisma.tag.create({
            data: {
              name: tagName,
              userId,
              tenantId,
              status: "ENABLE",
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }

        // Check if tag is already linked to note (including soft-deleted)
        // Check for both active and deleted records
        const activeLink = await prisma.noteTag.findFirst({
          where: {
            noteId,
            tagId: tag.id,
            deletedAt: null,
          },
        });

        const deletedLink = await prisma.noteTag.findFirst({
          where: {
            noteId,
            tagId: tag.id,
            deletedAt: { not: null },
          },
        });

        if (activeLink) {
          // Already linked, skip
        } else if (deletedLink) {
          // Restore the soft-deleted link
          await prisma.noteTag.update({
            where: {
              noteId_tagId: {
                noteId,
                tagId: tag.id,
              },
            },
            data: {
              deletedAt: null,
              source: "USER_ADDED", // Update source in case it was different
            },
          });
        } else {
          // Create link between note and tag
          await prisma.noteTag.create({
            data: {
              noteId,
              tagId: tag.id,
              source: "USER_ADDED",
            },
          });
        }

        return tag;
      })
    );

    // Update lastTagModifiedAt on note
    await prisma.note.update({
      where: { id: noteId },
      data: {
        lastTagModifiedAt: new Date(),
      },
    });

    // Fetch updated tags for this note (same pattern as GET endpoint)
    const noteWithTags = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
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
      },
    });

    const tags = (noteWithTags?.noteTags || []).map((nt) => ({
      id: nt.tag.id,
      name: nt.tag.name,
      color: nt.tag.color,
      source: nt.source,
      confidence: nt.confidence,
    }));

    return new Response(JSON.stringify(successResponse({ tags })), {
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
 * DELETE /api/nabu/notes/[id]/tags
 * Remove tags from a note (unlink but don't delete the tag itself)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;
    const body = await req.json();
    const { tagNames } = body as { tagNames: string[] };

    if (!tagNames || !Array.isArray(tagNames)) {
      return errorResponse("tagNames array is required", 400);
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
    
    // Find tags by names
    const tags = await prisma.tag.findMany({
      where: {
        name: { in: tagNames },
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    // Soft delete links between note and tags (set deletedAt)
    if (tags.length > 0) {
      const deleteResult = await prisma.noteTag.updateMany({
        where: {
          noteId,
          tagId: { in: tags.map((t) => t.id) },
          deletedAt: null, // Only update records that aren't already deleted
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Update lastTagModifiedAt on note
      await prisma.note.update({
        where: { id: noteId },
        data: {
          lastTagModifiedAt: new Date(),
        },
      });
    }

    // Fetch remaining tags for this note (same pattern as GET endpoint)
    const noteWithTags = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
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
      },
    });

    const remainingTags = (noteWithTags?.noteTags || []).map((nt) => ({
      id: nt.tag.id,
      name: nt.tag.name,
      color: nt.tag.color,
      source: nt.source,
      confidence: nt.confidence,
    }));

    return new Response(JSON.stringify(successResponse({ tags: remainingTags })), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

