import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { analyzeBulkFolderSuggestions } from "@/lib/ai/bulk-folder-suggestions";
import { z } from "zod";

/**
 * Request validation schema
 */
const autoMoveRequestSchema = z.object({
  noteIds: z.array(z.string().cuid()).min(1).max(50),
});

/**
 * POST /api/nabu/notes/auto-move
 * 
 * Analyzes multiple uncategorised notes and suggests folder destinations
 * Uses semantic search to find similar notes and analyze folder patterns
 * 
 * Request body:
 * - noteIds: string[] - Array of note IDs to analyze (max 50)
 * 
 * Returns:
 * - suggestions: Grouped by existing folders and new folder suggestions
 * - analysis: Summary statistics
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request
    const validationResult = autoMoveRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const { noteIds } = validationResult.data;

    // Verify all notes exist and belong to user (security check)
    const noteCount = await prisma.note.count({
      where: {
        id: { in: noteIds },
        userId,
        tenantId,
        deletedAt: null,
        folderId: null, // Should all be uncategorised
      },
    });

    if (noteCount !== noteIds.length) {
      return errorResponse(
        "Some notes not found or already categorised",
        400
      );
    }

    // Analyze and generate suggestions
    const suggestions = await analyzeBulkFolderSuggestions(
      noteIds,
      userId,
      tenantId
    );

    return new Response(
      JSON.stringify(
        successResponse(suggestions, "Folder suggestions generated successfully")
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error analyzing auto-move:", error);
    return handleApiError(error);
  }
}

