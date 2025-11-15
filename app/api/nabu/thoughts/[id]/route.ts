import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { thoughtUpdateSchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  validateOwnership,
  formatThoughtResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { enqueueThoughtEmbeddingJobs, shouldRegenerateEmbeddings } from "@/lib/embeddings";

/**
 * GET /api/nabu/thoughts/[id]
 * Get a single thought by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: thoughtId } = await params;

    const thought = await prisma.thought.findFirst({
      where: {
        id: thoughtId,
        userId,
        tenantId,
        deletedAt: null,
      },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            folderId: true,
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
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    if (!thought) {
      return errorResponse("Thought not found", 404);
    }

    const formattedThought = formatThoughtResponse(thought);

    // Add attachments
    (formattedThought as any).attachments = thought.attachments;

    return new Response(JSON.stringify(successResponse(formattedThought)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/nabu/thoughts/[id]
 * Update a thought (including promotion to note)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: thoughtId } = await params;

    // Verify ownership and get existing thought
    const existingThought = await prisma.thought.findFirst({
      where: {
        id: thoughtId,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingThought) {
      return errorResponse("Thought not found or access denied", 404);
    }

    const body = await req.json();

    // Validate request body
    const validationResult = thoughtUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const data = validationResult.data;

    // If noteId is being set (promoting to note), verify it exists
    if (data.noteId !== undefined && data.noteId) {
      const note = await prisma.note.findFirst({
        where: {
          id: data.noteId,
          userId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!note) {
        return errorResponse("Note not found", 404);
      }
    }

    // Check if content has changed
    const contentChanged = data.content
      ? shouldRegenerateEmbeddings(existingThought.content, data.content)
      : false;

    // Update thought
    const thought = await prisma.thought.update({
      where: { id: thoughtId },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        note: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    // Regenerate embeddings if content changed (async, don't wait)
    if (contentChanged) {
      enqueueThoughtEmbeddingJobs(
        thought.id,
        thought.content,
        userId,
        tenantId
      ).catch((error) => {
        console.error("Failed to enqueue embedding jobs for thought update:", error);
        // Don't fail the request if embedding jobs fail
      });
    }

    return new Response(
      JSON.stringify(successResponse(formatThoughtResponse(thought), "Thought updated successfully")),
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
 * DELETE /api/nabu/thoughts/[id]
 * Soft-delete a thought
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: thoughtId } = await params;

    // Verify ownership
    const isOwner = await validateOwnership("thought", thoughtId, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Thought not found or access denied", 404);
    }

    // Soft delete thought
    await prisma.thought.update({
      where: { id: thoughtId },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return new Response(
      JSON.stringify(successResponse(null, "Thought deleted successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

