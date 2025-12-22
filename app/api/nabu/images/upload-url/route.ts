import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  validateOwnership,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import {
  generateSignedUploadUrl,
  generateUniqueFilename,
  buildStoragePath,
} from "@/lib/supabase";

/**
 * Request schema for upload URL generation
 */
const uploadUrlSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
  filename: z.string().min(1, "Filename is required"),
  fileSize: z.number().positive("File size must be positive"),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/, "Invalid image type"),
  width: z.number().nonnegative().optional(), // Allow 0 for SVGs (vector graphics have no fixed dimensions)
  height: z.number().nonnegative().optional(), // Allow 0 for SVGs (vector graphics have no fixed dimensions)
});

/**
 * POST /api/nabu/images/upload-url
 * Generate a signed upload URL for client-side image upload
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Validate tenant exists
    if (!tenantId) {
      return errorResponse("User must be associated with a tenant", 403);
    }

    const body = await req.json();
    
    // Debug logging
    console.log("📤 Image upload URL request:", {
      filename: body.filename,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      width: body.width,
      height: body.height,
      noteId: body.noteId,
    });

    // Validate request body
    const validationResult = uploadUrlSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("❌ Validation failed:", validationResult.error.errors);
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }
    
    console.log("✅ Validation passed");

    const { noteId, filename, fileSize, mimeType, width, height } =
      validationResult.data;

    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return errorResponse(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        400
      );
    }

    // Verify user owns the note
    const isOwner = await validateOwnership("note", noteId, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Note not found or access denied", 404);
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(filename);

    // Build storage path: {tenantId}/note-images/{noteId}/{filename}
    const storagePath = buildStoragePath(tenantId, noteId, uniqueFilename);

    // Generate signed upload URL (expires in 5 minutes)
    console.log("🔐 Generating signed URL for path:", storagePath);
    const uploadUrl = await generateSignedUploadUrl(storagePath, 300);
    console.log("✅ Signed URL generated");

    // Create pending ImageAttachment record (URL will be set after upload confirmation)
    console.log("💾 Creating ImageAttachment record...");
    const imageAttachment = await prisma.imageAttachment.create({
      data: {
        noteId,
        tenantId,
        filename: uniqueFilename,
        originalFilename: filename,
        storagePath,
        url: null, // Will be set after upload confirmation
        fileSize,
        mimeType,
        width: width || null,
        height: height || null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    
    console.log("✅ ImageAttachment created:", imageAttachment.id);

    return new Response(
      JSON.stringify(
        successResponse(
          {
            uploadUrl,
            imageId: imageAttachment.id,
            storagePath,
          },
          "Upload URL generated successfully"
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

