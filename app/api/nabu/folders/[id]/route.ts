import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { folderUpdateSchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  validateOwnership,
  formatFolderResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/folders/[id]
 * Get a single folder by ID with optional children
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);
    const includeChildren = searchParams.get("includeChildren") === "true";

    const folder = await prisma.folder.findFirst({
      where: {
        id: params.id,
        userId,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            notes: true,
            children: true,
          },
        },
        ...(includeChildren && {
          children: {
            where: { deletedAt: null },
            include: {
              _count: {
                select: {
                  notes: true,
                  children: true,
                },
              },
            },
            orderBy: [{ order: "asc" }, { name: "asc" }],
          },
        }),
      },
    });

    if (!folder) {
      return errorResponse("Folder not found", 404);
    }

    return new Response(
      JSON.stringify(successResponse(formatFolderResponse(folder, includeChildren))),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/nabu/folders/[id]
 * Update a folder
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Verify ownership
    const isOwner = await validateOwnership("folder", params.id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Folder not found or access denied", 404);
    }

    const body = await req.json();

    // Validate request body
    const validationResult = folderUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const data = validationResult.data;

    // If parentId is being changed, verify it exists and prevent circular references
    if (data.parentId !== undefined) {
      if (data.parentId) {
        // Check if new parent exists and belongs to user
        const parentFolder = await prisma.folder.findFirst({
          where: {
            id: data.parentId,
            userId,
            tenantId,
            deletedAt: null,
          },
        });

        if (!parentFolder) {
          return errorResponse("Parent folder not found", 404);
        }

        // Prevent setting self as parent
        if (data.parentId === params.id) {
          return errorResponse("Cannot set folder as its own parent", 400);
        }

        // Prevent circular references (check if new parent is a descendant)
        const descendants = await getDescendantIds(params.id);
        if (descendants.includes(data.parentId)) {
          return errorResponse("Cannot create circular folder hierarchy", 400);
        }
      }
    }

    // Update folder
    const folder = await prisma.folder.update({
      where: { id: params.id },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        _count: {
          select: {
            notes: true,
            children: true,
          },
        },
      },
    });

    return new Response(
      JSON.stringify(successResponse(formatFolderResponse(folder), "Folder updated successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/nabu/folders/[id]
 * Soft-delete a folder (only if no notes or children exist)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Verify ownership
    const isOwner = await validateOwnership("folder", params.id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Folder not found or access denied", 404);
    }

    // Check if folder has notes or children
    const folder = await prisma.folder.findFirst({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            notes: true,
            children: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!folder) {
      return errorResponse("Folder not found", 404);
    }

    if (folder._count.notes > 0) {
      return errorResponse("Cannot delete folder with notes. Move or delete notes first.", 400);
    }

    if (folder._count.children > 0) {
      return errorResponse("Cannot delete folder with subfolders. Delete subfolders first.", 400);
    }

    // Soft delete
    await prisma.folder.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return new Response(
      JSON.stringify(successResponse(null, "Folder deleted successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Helper: Get all descendant IDs of a folder (for circular reference prevention)
 */
async function getDescendantIds(folderId: string): Promise<string[]> {
  const descendants: string[] = [];

  async function traverse(id: string) {
    const children = await prisma.folder.findMany({
      where: { parentId: id, deletedAt: null },
      select: { id: true },
    });

    for (const child of children) {
      descendants.push(child.id);
      await traverse(child.id);
    }
  }

  await traverse(folderId);
  return descendants;
}

