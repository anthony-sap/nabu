import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { z } from "zod";

// Validation schema
const restoreSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["note", "thought"]),
    })
  ).min(1, "At least one item is required"),
});

/**
 * POST /api/nabu/trash/restore
 * Restore one or more deleted notes or thoughts
 * 
 * Body:
 * {
 *   "items": [
 *     { "id": "note-id-1", "type": "note" },
 *     { "id": "thought-id-1", "type": "thought" }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request body
    const validation = restoreSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.errors[0].message,
        400
      );
    }

    const { items } = validation.data;

    // Separate notes and thoughts
    const noteIds = items.filter((item) => item.type === "note").map((item) => item.id);
    const thoughtIds = items.filter((item) => item.type === "thought").map((item) => item.id);

    let restoredCount = 0;
    const restoredItems: any[] = [];

    // Restore notes if any
    if (noteIds.length > 0) {
      // Verify ownership of all notes (use includeDeleted flag to query deleted items)
      const notes = await prisma.note.findMany({
        where: {
          id: { in: noteIds },
          userId,
          tenantId,
          deletedAt: { not: null }, // Must be deleted
        },
        includeDeleted: true, // Special flag to bypass soft-delete middleware
        select: {
          id: true,
          title: true,
        },
      } as any);

      if (notes.length > 0) {
        // Restore notes by setting deletedAt and deletedBy to null
        const noteResult = await prisma.note.updateMany({
          where: {
            id: { in: notes.map((n) => n.id) },
            userId,
            tenantId,
          },
          data: {
            deletedAt: null,
            deletedBy: null,
            updatedBy: userId,
          },
        });

        restoredCount += noteResult.count;
        restoredItems.push(...notes.map((n) => ({ ...n, type: "note" })));

        // Log to audit log
        for (const note of notes) {
          await prisma.auditLog.create({
            data: {
              entityType: "Note",
              entityId: note.id,
              action: "restore",
              eventStatus: "success",
              newData: {
                id: note.id,
                title: note.title,
                restoredAt: new Date().toISOString(),
              },
              createdBy: userId,
              tenantId,
            },
          });
        }
      }
    }

    // Restore thoughts if any
    if (thoughtIds.length > 0) {
      // Verify ownership of all thoughts (use includeDeleted flag to query deleted items)
      const thoughts = await prisma.thought.findMany({
        where: {
          id: { in: thoughtIds },
          userId,
          tenantId,
          deletedAt: { not: null }, // Must be deleted
        },
        includeDeleted: true, // Special flag to bypass soft-delete middleware
        select: {
          id: true,
          content: true,
        },
      } as any);

      if (thoughts.length > 0) {
        // Restore thoughts by setting deletedAt (and deletedBy if it exists) to null
        const thoughtResult = await prisma.thought.updateMany({
          where: {
            id: { in: thoughts.map((t) => t.id) },
            userId,
            tenantId,
          },
          data: {
            deletedAt: null,
            // deletedBy: null, // TODO: Uncomment after migration is applied
            updatedBy: userId,
          },
        });

        restoredCount += thoughtResult.count;
        restoredItems.push(...thoughts.map((t) => ({ ...t, type: "thought" })));

        // Log to audit log
        for (const thought of thoughts) {
          await prisma.auditLog.create({
            data: {
              entityType: "Thought",
              entityId: thought.id,
              action: "restore",
              eventStatus: "success",
              newData: {
                id: thought.id,
                content: thought.content.substring(0, 100),
                restoredAt: new Date().toISOString(),
              },
              createdBy: userId,
              tenantId,
            },
          });
        }
      }
    }

    if (restoredCount === 0) {
      return errorResponse("No deleted items found with the provided IDs", 404);
    }

    return new Response(
      JSON.stringify(
        successResponse(
          {
            restored: restoredCount,
            items: restoredItems,
          },
          `Successfully restored ${restoredCount} item(s)`
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

