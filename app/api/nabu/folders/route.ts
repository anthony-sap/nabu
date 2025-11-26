import { NextRequest } from "next/server";
import { prisma, prismaClient } from "@/lib/db";
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
 * Helper to fetch folder tree for a specific context (personal or workspace)
 */
async function fetchFolderTree(
  userId: string,
  tenantId: string | null,
  workspaceId: string | null
) {
  const workspaceCondition = workspaceId 
    ? prisma.$queryRaw`AND "workspaceId" = ${workspaceId}`
    : prisma.$queryRaw`AND "workspaceId" IS NULL`;

  const fullTree = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    color: string | null;
    parentId: string | null;
    userId: string;
    tenantId: string | null;
    workspaceId: string | null;
    level: number;
    path: string[];
    order: number | null;
    note_count: bigint;
    child_count: bigint;
  }>>`
    WITH RECURSIVE folder_tree AS (
      -- Base: root folders
      SELECT 
        id, name, color, "parentId", "userId", "tenantId", "workspaceId", "order",
        0 as level,
        ARRAY[id] as path
      FROM "Folder"
      WHERE "userId" = ${userId}
        AND ("tenantId" = ${tenantId} OR ("tenantId" IS NULL AND ${tenantId}::text IS NULL))
        AND "deletedAt" IS NULL 
        AND "parentId" IS NULL
        AND (${workspaceId}::text IS NULL AND "workspaceId" IS NULL OR "workspaceId" = ${workspaceId})
      
      UNION ALL
      
      -- Recursive: child folders
      SELECT 
        f.id, f.name, f.color, f."parentId", f."userId", f."tenantId", f."workspaceId", f."order",
        ft.level + 1,
        ft.path || f.id
      FROM "Folder" f
      INNER JOIN folder_tree ft ON f."parentId" = ft.id
      WHERE f."deletedAt" IS NULL
    )
    SELECT 
      ft.id,
      ft.name,
      ft.color,
      ft."parentId",
      ft."userId",
      ft."tenantId",
      ft."workspaceId",
      ft.level,
      ft.path,
      ft."order",
      COUNT(DISTINCT n.id)::int as note_count,
      COUNT(DISTINCT cf.id)::int as child_count
    FROM folder_tree ft
    LEFT JOIN "Note" n ON n."folderId" = ft.id AND n."deletedAt" IS NULL
    LEFT JOIN "Folder" cf ON cf."parentId" = ft.id AND cf."deletedAt" IS NULL
    GROUP BY ft.id, ft.name, ft.color, ft."parentId", ft."userId", ft."tenantId", ft."workspaceId", ft.level, ft.path, ft."order"
    ORDER BY ft.path, ft."order", ft.name;
  `;

  // Transform flat results into nested structure
  const folderMap = new Map<string, any>();
  const rootFolders: any[] = [];

  fullTree.forEach((folder) => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      color: folder.color,
      parentId: folder.parentId,
      workspaceId: folder.workspaceId,
      _count: {
        notes: Number(folder.note_count),
        children: Number(folder.child_count),
      },
      children: [],
    });
  });

  fullTree.forEach((folder) => {
    const folderObj = folderMap.get(folder.id);
    if (folder.parentId && folderMap.has(folder.parentId)) {
      const parent = folderMap.get(folder.parentId);
      parent.children.push(folderObj);
    } else {
      rootFolders.push(folderObj);
    }
  });

  return rootFolders.map((folder) => formatFolderResponse(folder, true, false));
}

/**
 * Fetch uncategorised notes for a context (personal or workspace)
 */
async function fetchUncategorisedNotes(
  userId: string,
  tenantId: string | null,
  workspaceId: string | null
) {
  const notes = await prismaClient.note.findMany({
    where: {
      userId,
      tenantId,
      workspaceId,
      folderId: null,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return notes;
}

/**
 * GET /api/nabu/folders
 * List user's folders with optional filtering and hierarchy
 * 
 * Query params:
 * - includeFullTree: boolean - fetch entire folder hierarchy
 * - includeWorkspaces: boolean - include workspace folders grouped separately
 * - parentId: string - filter by parent folder
 * - includeChildren: boolean - include child folders
 * - includeNotes: boolean - include notes in each folder
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Check for workspace-grouped response
    const includeWorkspaces = searchParams.get("includeWorkspaces") === "true";

    // If includeWorkspaces, return grouped structure
    if (includeWorkspaces) {
      // Fetch personal folders (workspaceId IS NULL)
      const personalFolders = await fetchFolderTree(userId, tenantId, null);
      const personalUncategorised = await fetchUncategorisedNotes(userId, tenantId, null);

      // Fetch user's workspace memberships
      const memberships = await prismaClient.workspaceMembership.findMany({
        where: {
          userId,
          status: "active",
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Fetch folders and notes for each workspace
      const workspaces = await Promise.all(
        memberships.map(async (m) => {
          const folders = await fetchFolderTree(userId, tenantId, m.workspace.id);
          const uncategorisedNotes = await fetchUncategorisedNotes(userId, tenantId, m.workspace.id);
          return {
            id: m.workspace.id,
            name: m.workspace.name,
            role: m.role,
            folders,
            uncategorisedNotes,
          };
        })
      );

      return new Response(
        JSON.stringify(
          successResponse({
            personal: {
              folders: personalFolders,
              uncategorisedNotes: personalUncategorised,
            },
            workspaces,
          })
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate query params for standard request
    const queryResult = folderQuerySchema.safeParse({
      parentId: searchParams.get("parentId") || undefined,
      includeChildren: searchParams.get("includeChildren") || undefined,
      includeNotes: searchParams.get("includeNotes") || undefined,
      includeFullTree: searchParams.get("includeFullTree") || undefined,
    });

    if (!queryResult.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const { parentId, includeChildren, includeNotes, includeFullTree } = queryResult.data;

    // If includeFullTree is true, use helper function (personal folders only for backwards compat)
    if (includeFullTree) {
      const formattedFolders = await fetchFolderTree(userId, tenantId, null);
      return new Response(JSON.stringify(successResponse(formattedFolders)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build query for non-full-tree requests
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

