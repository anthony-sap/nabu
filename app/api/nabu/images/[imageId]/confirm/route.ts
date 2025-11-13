import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { getPublicUrl } from "@/lib/supabase";

/**
 * POST /api/nabu/images/[imageId]/confirm
 * Confirm that client-side upload completed and update ImageAttachment with public URL
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { imageId } = await params;
    
    console.log("✅ Confirming upload for imageId:", imageId);

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
      console.error("❌ Image attachment not found:", imageId);
      return errorResponse("Image attachment not found", 404);
    }
    
    console.log("📄 Found image attachment:", {
      id: imageAttachment.id,
      filename: imageAttachment.filename,
      mimeType: imageAttachment.mimeType,
      noteId: imageAttachment.noteId,
    });

    // Verify user owns the note
    if (imageAttachment.note.userId !== userId) {
      console.error("❌ Access denied for user:", userId);
      return errorResponse("Access denied", 403);
    }

    // Check if already confirmed
    if (imageAttachment.url) {
      console.log("ℹ️ Image already confirmed");

      return new Response(
        JSON.stringify(
          successResponse(
            {
              url: imageAttachment.url,
              imageId: imageAttachment.id,
            },
            "Image already confirmed"
          )
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL for the uploaded file
    console.log("🔗 Getting public URL for:", imageAttachment.storagePath);
    const publicUrl = getPublicUrl(imageAttachment.storagePath);
    console.log("✅ Public URL:", publicUrl);

    // Update ImageAttachment with public URL
    console.log("💾 Updating ImageAttachment with public URL...");
    const updatedAttachment = await prisma.imageAttachment.update({
      where: { id: imageId },
      data: {
        url: publicUrl,
        updatedBy: userId,
      },
    });

    console.log("✅ Upload confirmed successfully:", imageId);
    
    // TODO: Trigger edge function for background optimization
    // This would generate thumbnailUrl and mediumUrl
    // For now, we'll just return the main URL

    return new Response(
      JSON.stringify(
        successResponse(
          {
            url: updatedAttachment.url,
            imageId: updatedAttachment.id,
            storagePath: updatedAttachment.storagePath,
          },
          "Image upload confirmed successfully"
        )
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

