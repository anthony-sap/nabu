/**
 * API Route for Version Restore
 * 
 * POST /api/nabu/notes/[id]/versions/[versionId]/restore - Restore a previous version
 */

import { NextRequest } from "next/server";
import {
  getUserContext,
  successResponse,
  errorResponse,
  handleApiError,
  formatNoteResponse,
} from "@/lib/nabu-helpers";
import { restoreVersion } from "@/lib/note-version-service";

/**
 * POST /api/nabu/notes/[id]/versions/[versionId]/restore
 * Restore a version to the current note
 * Creates a backup version before overwriting
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId, versionId } = await params;

    // Restore the version
    const result = await restoreVersion(noteId, versionId, userId, tenantId);

    return new Response(
      JSON.stringify(
        successResponse(
          {
            note: formatNoteResponse(result.note),
            backupVersion: result.backupVersion,
          },
          "Version restored successfully. Your previous version was saved."
        )
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return errorResponse(error.message, 404);
    }
    if (error.message?.includes("does not belong")) {
      return errorResponse(error.message, 400);
    }
    return handleApiError(error);
  }
}


