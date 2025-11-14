import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { z } from "zod";

/**
 * Request validation schema
 */
const executeMoveSchema = z.object({
  moves: z.array(z.object({
    noteId: z.string().cuid(),
    folderId: z.string().cuid().optional(),
    createFolder: z.object({
      name: z.string().min(1).max(100),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }).optional(),
  })).min(1),
});

/**
 * POST /api/nabu/notes/execute-auto-move
 * 
 * Executes bulk note moves with folder creation
 * Creates new folders first, then moves all notes
 * Uses transaction to ensure atomicity
 * 
 * Request body:
 * - moves: Array of move operations
 *   - noteId: Note to move
 *   - folderId?: Move to existing folder
 *   - createFolder?: Create new folder and move there
 * 
 * Returns:
 * - results: Per-note results with success/error
 * - summary: Total counts
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request
    const validationResult = executeMoveSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const { moves } = validationResult.data;

    // Execute all moves in a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Track created folders to avoid duplicates
      const createdFolders = new Map<string, string>(); // folderName -> folderId
      const results: Array<{
        noteId: string;
        success: boolean;
        error?: string;
        folderId?: string;
      }> = [];

      // Group moves by whether they need folder creation
      const movesToExisting: Array<{ noteId: string; folderId: string }> = [];
      const movesToNew: Array<{ noteId: string; folderName: string; folderColor: string }> = [];

      for (const move of moves) {
        if (move.folderId) {
          movesToExisting.push({ noteId: move.noteId, folderId: move.folderId });
        } else if (move.createFolder) {
          movesToNew.push({
            noteId: move.noteId,
            folderName: move.createFolder.name,
            folderColor: move.createFolder.color,
          });
        }
      }

      // Verify all existing folders exist and belong to user
      if (movesToExisting.length > 0) {
        const folderIds = [...new Set(movesToExisting.map(m => m.folderId))];
        const folders = await tx.folder.findMany({
          where: {
            id: { in: folderIds },
            userId,
            tenantId,
            deletedAt: null,
          },
          select: { id: true },
        });

        const validFolderIds = new Set(folders.map(f => f.id));
        
        // Move to existing folders
        for (const move of movesToExisting) {
          if (!validFolderIds.has(move.folderId)) {
            results.push({
              noteId: move.noteId,
              success: false,
              error: "Folder not found",
            });
            continue;
          }

          try {
            await tx.note.update({
              where: { id: move.noteId },
              data: {
                folderId: move.folderId,
                updatedBy: userId,
              },
            });

            results.push({
              noteId: move.noteId,
              success: true,
              folderId: move.folderId,
            });
          } catch (error) {
            results.push({
              noteId: move.noteId,
              success: false,
              error: error instanceof Error ? error.message : "Failed to move note",
            });
          }
        }
      }

      // Create new folders and move notes
      if (movesToNew.length > 0) {
        // Group by folder name to avoid creating duplicates
        const groupedByFolder = new Map<string, { noteIds: string[]; color: string }>();
        
        for (const move of movesToNew) {
          const existing = groupedByFolder.get(move.folderName);
          if (existing) {
            existing.noteIds.push(move.noteId);
          } else {
            groupedByFolder.set(move.folderName, {
              noteIds: [move.noteId],
              color: move.folderColor,
            });
          }
        }

        // Create folders and move notes
        for (const [folderName, data] of groupedByFolder.entries()) {
          try {
            // Check if folder with this name already exists
            let folder = await tx.folder.findFirst({
              where: {
                name: folderName,
                userId,
                tenantId,
                deletedAt: null,
              },
            });

            // Create if doesn't exist
            if (!folder) {
              folder = await tx.folder.create({
                data: {
                  name: folderName,
                  color: data.color,
                  userId,
                  tenantId,
                  createdBy: userId,
                  updatedBy: userId,
                },
              });
            }

            // Move all notes to this folder
            for (const noteId of data.noteIds) {
              try {
                await tx.note.update({
                  where: { id: noteId },
                  data: {
                    folderId: folder.id,
                    updatedBy: userId,
                  },
                });

                results.push({
                  noteId,
                  success: true,
                  folderId: folder.id,
                });
              } catch (error) {
                results.push({
                  noteId,
                  success: false,
                  error: error instanceof Error ? error.message : "Failed to move note",
                });
              }
            }
          } catch (error) {
            // Folder creation failed - mark all notes as failed
            for (const noteId of data.noteIds) {
              results.push({
                noteId,
                success: false,
                error: `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
            }
          }
        }
      }

      return results;
    });

    // Calculate summary
    const summary = {
      total: moves.length,
      successful: result.filter(r => r.success).length,
      failed: result.filter(r => !r.success).length,
    };

    return new Response(
      JSON.stringify(
        successResponse(
          { results: result, summary },
          `Moved ${summary.successful} of ${summary.total} notes successfully`
        )
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error executing auto-move:", error);
    return handleApiError(error);
  }
}

