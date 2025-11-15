import { NextRequest } from "next/server";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { suggestFolders } from "@/lib/ai/folder-suggestions";
import { prisma } from "@/lib/db";

/**
 * GET /api/nabu/notes/:id/suggest-folder
 * 
 * Suggests folders for a note based on:
 * - Semantic search using embeddings to find similar notes
 * - Analysis of folder patterns from similar notes
 * - AI-generated new folder names if no good match
 * 
 * Returns:
 * - type: 'existing' | 'new'
 * - suggestions: Array of folder suggestions with confidence scores
 * - similarNotes: Context from semantic search (optional)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;

    // Verify the note exists and belongs to the user
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        folderId: true,
      },
    });

    if (!note) {
      return errorResponse("Note not found", 404);
    }

    // Generate folder suggestions
    const suggestions = await suggestFolders(noteId, userId, tenantId);

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
    console.error("Error generating folder suggestions:", error);
    return handleApiError(error);
  }
}

/**
 * POST /api/nabu/notes/:id/suggest-folder
 * 
 * Apply a folder suggestion to a note
 * Can either:
 * - Move note to existing folder (provide folderId)
 * - Create new folder and move note (provide newFolderName)
 * 
 * Request body:
 * - folderId?: string - Move to existing folder
 * - newFolderName?: string - Create new folder and move
 * - newFolderColor?: string - Color for new folder (optional)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id: noteId } = await params;
    const body = await req.json();

    const { folderId, newFolderName, newFolderColor } = body;

    // Verify the note exists and belongs to the user
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!note) {
      return errorResponse("Note not found", 404);
    }

    let targetFolderId: string;

    // Case 1: Moving to existing folder
    if (folderId) {
      // Verify folder exists and belongs to user
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

      targetFolderId = folderId;
    }
    // Case 2: Creating new folder
    else if (newFolderName) {
      // Check if folder with same name already exists
      const existingFolder = await prisma.folder.findFirst({
        where: {
          name: newFolderName,
          userId,
          tenantId,
          deletedAt: null,
        },
      });

      if (existingFolder) {
        // Use existing folder instead of creating duplicate
        targetFolderId = existingFolder.id;
      } else {
        // Create new folder
        const newFolder = await prisma.folder.create({
          data: {
            name: newFolderName,
            color: newFolderColor || "#00B3A6", // Default mint color
            userId,
            tenantId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        targetFolderId = newFolder.id;
      }
    } else {
      return errorResponse(
        "Must provide either folderId or newFolderName",
        400
      );
    }

    // Update note with new folder
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        folderId: targetFolderId,
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

    return new Response(
      JSON.stringify(
        successResponse(
          {
            note: {
              id: updatedNote.id,
              title: updatedNote.title,
              folderId: updatedNote.folderId,
              folder: updatedNote.folder,
            },
          },
          newFolderName
            ? `Note moved to new folder "${newFolderName}"`
            : "Note moved successfully"
        )
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error applying folder suggestion:", error);
    return handleApiError(error);
  }
}

