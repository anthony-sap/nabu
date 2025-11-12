import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  folderCreateSchema,
  folderQuerySchema,
} from "@/lib/validations/nabu";
import {
  getUserContext,
  formatFolderResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/folders
 * List user's folders with optional filtering and hierarchy
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Validate query params
    const queryResult = folderQuerySchema.safeParse({
      parentId: searchParams.get("parentId") || undefined,
      includeChildren: searchParams.get("includeChildren") || undefined,
      includeNotes: searchParams.get("includeNotes") || undefined,
    });

    if (!queryResult.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const { parentId, includeChildren, includeNotes } = queryResult.data;

    // Build query
    const where: any = {
      userId,
      tenantId,
      deletedAt: null,
    };

    // If parentId is not specified, get only root folders (parentId is null)
    // If parentId is specified, get children of that folder
    if (parentId !== undefined) {
      where.parentId = parentId;
    } else {
      where.parentId = null; // Only root-level folders
    }

    const folders = await prisma.folder.findMany({
      where,
      include: {
        _count: {
          select: {
            notes: true,
            children: true,
          },
        },
        ...(includeNotes && {
          notes: {
            where: { deletedAt: null },
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        }),
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
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    const formattedFolders = folders.map((folder) =>
      formatFolderResponse(folder, includeChildren, includeNotes)
    );

    return new Response(JSON.stringify(successResponse(formattedFolders)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/nabu/folders
 * Create a new folder
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    
    const body = await req.json();

    // Validate request body
    const validationResult = folderCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const data = validationResult.data;

    // If parentId is provided, verify it exists and belongs to user
    if (data.parentId) {
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
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        ...data,
        userId,
        tenantId,
        createdBy: userId,
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
      JSON.stringify(successResponse(formatFolderResponse(folder), "Folder created successfully")),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

