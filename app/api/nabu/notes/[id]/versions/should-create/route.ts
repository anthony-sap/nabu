/**
 * API Route to check if an autosave version should be created
 * 
 * GET /api/nabu/notes/[id]/versions/should-create
 */

import { NextRequest } from "next/server";
import {
  getUserContext,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/nabu-helpers";
import { shouldCreateVersion } from "@/lib/note-version-service";
import { prisma } from "@/lib/db";

/**
 * GET /api/nabu/notes/[id]/versions/should-create
 * Check if a new autosave version should be created for this note
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;

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
      return errorResponse("Note not found or access denied", 404);
    }

    // Check if we should create a version
    const shouldCreate = await shouldCreateVersion(noteId);

    return new Response(
      JSON.stringify(successResponse({ shouldCreate })),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}


