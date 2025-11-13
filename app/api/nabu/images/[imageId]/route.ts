import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { deleteFile } from "@/lib/supabase";

/**
 * DELETE /api/nabu/images/[imageId]
 * Soft-delete an image attachment and remove from storage
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { imageId } = await params;

    // Find the image attachment and verify ownership
    const imageAttachment = await prisma.imageAttachment.findFirst({
      where: {
        id: imageId,
        tenantId,
        deletedAt: null,
      },
      include: {
        note: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!imageAttachment) {
      return errorResponse("Image attachment not found", 404);
    }

    // Verify user owns the note
    if (imageAttachment.note.userId !== userId) {
      return errorResponse("Access denied", 403);
    }

    // Soft delete the ImageAttachment record
    await prisma.imageAttachment.update({
      where: { id: imageId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
      },
    });

    // Delete file from Supabase storage
    // Note: We do this after soft-delete so if storage deletion fails,
    // we still have the record marked as deleted
    try {
      await deleteFile(imageAttachment.storagePath);
    } catch (storageError) {
      console.error("Failed to delete file from storage:", storageError);
      // Continue anyway - the file can be cleaned up later by a background job
    }

    return new Response(
      JSON.stringify(
        successResponse(null, "Image deleted successfully")
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

