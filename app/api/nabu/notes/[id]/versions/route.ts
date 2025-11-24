/**
 * API Routes for Note Version History
 * 
 * GET /api/nabu/notes/[id]/versions - List versions with pagination
 * POST /api/nabu/notes/[id]/versions - Create a manual version snapshot
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  getUserContext,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/nabu-helpers";
import {
  getVersionHistory,
  createVersion,
  type VersionReason,
} from "@/lib/note-version-service";

/**
 * GET /api/nabu/notes/[id]/versions
 * Get paginated list of versions for a note
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const reasonFilter = searchParams.get("reasonFilter") as VersionReason | undefined;

    // Get version history
    const result = await getVersionHistory(noteId, userId, tenantId, {
      page,
      limit,
      reasonFilter,
    });

    return new Response(JSON.stringify(successResponse(result)), {
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

/**
 * POST /api/nabu/notes/[id]/versions
 * Create a manual version snapshot
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;

    // Parse and validate request body
    const bodySchema = z.object({
      reason: z.enum(["manual", "autosave"]),
      changesSummary: z.string().optional(),
    });

    const body = await req.json();
    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        validation.error.errors[0]?.message || "Invalid request body",
        400
      );
    }

    const { reason, changesSummary } = validation.data;

    // Create the version
    const version = await createVersion(noteId, reason, userId, changesSummary);

    return new Response(
      JSON.stringify(successResponse(version, "Version created successfully")),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return errorResponse(error.message, 404);
    }
    return handleApiError(error);
  }
}


