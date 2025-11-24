/**
 * API Route for Individual Version
 * 
 * GET /api/nabu/notes/[id]/versions/[versionId] - Get specific version details
 */

import { NextRequest } from "next/server";
import {
  getUserContext,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/nabu-helpers";
import { getVersion } from "@/lib/note-version-service";

/**
 * GET /api/nabu/notes/[id]/versions/[versionId]
 * Get a specific version with full content
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId, versionId } = await params;

    // Get the version
    const version = await getVersion(versionId, userId, tenantId);

    // Verify it belongs to the requested note
    if (version.noteId !== noteId) {
      return errorResponse("Version does not belong to this note", 400);
    }

    return new Response(JSON.stringify(successResponse(version)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return errorResponse(error.message, 404);
    }
    return handleApiError(error);
  }
}


