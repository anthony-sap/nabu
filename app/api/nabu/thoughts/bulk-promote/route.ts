import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { ThoughtState } from "@prisma/client";
import { z } from "zod";
import { generateBulkNoteTitle } from "@/lib/ai/title-generator";

/**
 * Request validation schema
 */
const bulkPromoteSchema = z.object({
  thoughtIds: z.array(z.string().min(1)).min(1).max(50), // Accept any non-empty string ID
  folderId: z.union([z.string().cuid(), z.null()]).optional(),
});

/**
 * POST /api/nabu/thoughts/bulk-promote
 * 
 * Promotes multiple thoughts by merging them into a single note
 * - Fetches all thoughts
 * - Combines their content with headings
 * - Creates one note with all content
 * - Links all thoughts to the new note (sets noteId and state=PROMOTED)
 * 
 * Request body:
 * - thoughtIds: string[] - Array of thought IDs to merge (max 50)
 * - folderId?: string | null - Optional folder for the new note
 * 
 * Returns: The newly created merged note
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    console.log('🔍 API DEBUG: Received body:', JSON.stringify(body, null, 2));

    // Validate request
    const validationResult = bulkPromoteSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error);
      return errorResponse(
        `Validation error: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      );
    }

    const { thoughtIds, folderId } = validationResult.data;

    // Verify all thoughts exist and belong to user
    const thoughts = await prisma.thought.findMany({
      where: {
        id: { in: thoughtIds },
        userId,
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc', // Keep chronological order
      },
    });

    if (thoughts.length === 0) {
      return errorResponse("No valid thoughts found", 404);
    }

    if (thoughts.length !== thoughtIds.length) {
      return errorResponse("Some thoughts not found or access denied", 400);
    }

    // Check if any thoughts are already promoted
    const alreadyPromoted = thoughts.filter(t => t.noteId !== null);
    if (alreadyPromoted.length > 0) {
      return errorResponse(
        `${alreadyPromoted.length} thought(s) already promoted`,
        400
      );
    }

    // If folder ID provided, verify it exists
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

    // Generate AI-powered title from all thought contents
    // This creates a title that represents the common theme
    const thoughtContents = thoughts.map(t => t.content);
    const title = await generateBulkNoteTitle(thoughtContents);

    // Combine all thought content with markdown headings
    const combinedContent = thoughts
      .map((thought, index) => {
        const thoughtTitle = (thought.meta as any)?.title || `Thought ${index + 1}`;
        return `## ${thoughtTitle}\n\n${thought.content}`;
      })
      .join('\n\n---\n\n');

    // Create the merged note
    const note = await prisma.note.create({
      data: {
        title,
        content: combinedContent,
        contentState: null, // Plain markdown, no Lexical state
        userId,
        tenantId,
        folderId: folderId || null,
        sourceThoughts: thoughtIds, // Track all source thoughts
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
      },
    });

    // Update all thoughts to mark them as promoted
    await prisma.thought.updateMany({
      where: {
        id: { in: thoughtIds },
        userId,
        tenantId,
      },
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
        folderId: note.folderId,
        folder: note.folder,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
      thoughtsPromoted: thoughtIds.length,
    };

    return new Response(
      JSON.stringify(
        successResponse(
          responseData,
          `Merged ${thoughtIds.length} thoughts into one note successfully`
        )
      ),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in bulk promote:", error);
    return handleApiError(error);
  }
}

