import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { ThoughtState } from "@prisma/client";

/**
 * POST /api/nabu/thoughts/:id/promote
 * 
 * Promotes a Thought to a Note
 * - Creates a new Note with the thought's content
 * - Links the Thought to the new Note (sets noteId and state=PROMOTED)
 * - Optionally accepts a folderId to organize the new note
 * 
 * Request body:
 * - folderId?: string (optional) - folder to place the new note in
 * 
 * Returns: The newly created note
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: thoughtId } = await params;
    
    // Parse optional request body
    let folderId: string | undefined;
    try {
      const body = await req.json();
      folderId = body.folderId;
    } catch {
      // Body is optional, so ignore parse errors
    }

    // Verify the thought exists and belongs to the user
    const thought = await prisma.thought.findFirst({
      where: {
        id: thoughtId,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!thought) {
      return errorResponse("Thought not found", 404);
    }

    // Check if thought is already promoted
    if (thought.noteId) {
      return errorResponse("Thought is already promoted to a note", 400);
    }

    // If folder ID is provided, verify it exists and belongs to the user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!folder) {
        return errorResponse("Folder not found", 404);
      }
    }

    // Extract title from meta, or generate from content
    let title = (thought.meta as any)?.title;
    
    // If no title in meta, generate from content (first 50 chars)
    if (!title || title.trim() === '' || title === 'Untitled') {
      const contentPreview = thought.content.trim().substring(0, 50);
      title = contentPreview + (thought.content.length > 50 ? '...' : '');
    }
    
    const contentState = (thought.meta as any)?.contentState;

    // Create the new note
    const note = await prisma.note.create({
      data: {
        title,
        content: thought.content,
        contentState: contentState || null,
        userId,
        tenantId,
        folderId: folderId || null,
        sourceThoughts: [thoughtId], // Track that this note came from this thought
        createdBy: userId,
        updatedBy: userId,
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
      },
    });

    // Update the thought to mark it as promoted
    await prisma.thought.update({
      where: { id: thoughtId },
      data: {
        noteId: note.id,
        state: ThoughtState.PROMOTED,
        updatedBy: userId,
      },
    });

    // Format response
    const responseData = {
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        contentState: note.contentState,
        folderId: note.folderId,
        folder: note.folder,
        tags: note.noteTags.map((nt) => nt.tag),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
      thought: {
        id: thoughtId,
        state: ThoughtState.PROMOTED,
        noteId: note.id,
      },
    };

    return new Response(
      JSON.stringify(
        successResponse(
          responseData,
          "Thought promoted to note successfully"
        )
      ),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

