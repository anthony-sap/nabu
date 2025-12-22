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

    // Check if we need to return grouped folders (personal + workspaces)
    const includeWorkspaces = searchParams.get("includeWorkspaces") === "true";

    // If includeWorkspaces is true, return grouped folders
    if (includeWorkspaces) {
      // Get user's workspace memberships
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          workspaceMemberships: {
            where: { status: "active" },
            include: {
              workspace: true,
            },
          },
        },
      });

      // Fetch personal folders (workspaceId IS NULL)
      const personalFolders = await prisma.folder.findMany({
        where: {
          userId,
          tenantId,
          workspaceId: null,
          deletedAt: null,
          parentId: null,
        },
        include: {
          _count: {
            select: { notes: true, children: true },
          },
          children: {
            where: { 
              deletedAt: null,
              workspaceId: null, // Only personal folder children
            },
            include: {
              _count: {
                select: { notes: true, children: true },
              },
            },
            orderBy: [{ order: "asc" }, { name: "asc" }],
          },
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });

      // Fetch personal uncategorised notes
      const personalUncategorisedNotes = await prisma.note.findMany({
        where: {
          userId,
          tenantId,
          workspaceId: null,
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

      // Fetch workspace folders for each workspace
      const workspaceGroups = await Promise.all(
        (user?.workspaceMemberships || []).map(async (membership) => {
          const workspaceFolders = await prisma.folder.findMany({
            where: {
              workspaceId: membership.workspaceId,
              deletedAt: null,
              parentId: null,
            },
            include: {
              _count: {
                select: { notes: true, children: true },
              },
              children: {
                where: { deletedAt: null },
                include: {
                  _count: {
                    select: { notes: true, children: true },
                  },
                },
                orderBy: [{ order: "asc" }, { name: "asc" }],
              },
            },
            orderBy: [{ order: "asc" }, { name: "asc" }],
          });

          // Fetch workspace uncategorised notes
          const workspaceUncategorisedNotes = await prisma.note.findMany({
            where: {
              workspaceId: membership.workspaceId,
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

          return {
            id: membership.workspaceId,
            name: membership.workspace.name,
            role: membership.role,
            folders: workspaceFolders.map((folder) =>
              formatFolderResponse(folder, true, false)
            ),
            uncategorisedNotes: workspaceUncategorisedNotes,
          };
        })
      );

      return new Response(
        JSON.stringify(
          successResponse({
            personal: {
              folders: personalFolders.map((folder) =>
                formatFolderResponse(folder, true, false)
              ),
              uncategorisedNotes: personalUncategorisedNotes,
            },
            workspaces: workspaceGroups,
          })
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate query params
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

    // If includeFullTree is true, use recursive CTE to fetch entire hierarchy
    if (includeFullTree) {
      const fullTree = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        color: string | null;
        parentId: string | null;
        userId: string;
        tenantId: string | null;
        level: number;
        path: string[];
        note_count: bigint;
        child_count: bigint;
      }>>`
        WITH RECURSIVE folder_tree AS (
          -- Base: root folders (personal only)
          SELECT 
            id, name, color, "parentId", "userId", "tenantId", "order",
            0 as level,
            ARRAY[id] as path
          FROM "Folder"
          WHERE "userId" = ${userId}
            AND ("tenantId" = ${tenantId} OR ("tenantId" IS NULL AND ${tenantId}::text IS NULL))
            AND "workspaceId" IS NULL
            AND "deletedAt" IS NULL 
            AND "parentId" IS NULL
          
          UNION ALL
          
          -- Recursive: child folders (personal only)
          SELECT 
            f.id, f.name, f.color, f."parentId", f."userId", f."tenantId", f."order",
            ft.level + 1,
            ft.path || f.id
          FROM "Folder" f
          INNER JOIN folder_tree ft ON f."parentId" = ft.id
          WHERE f."deletedAt" IS NULL
            AND f."workspaceId" IS NULL
        )
        SELECT 
          ft.id,
          ft.name,
          ft.color,
          ft."parentId",
          ft."userId",
          ft."tenantId",
          ft.level,
          ft.path,
          ft."order",
          COUNT(DISTINCT n.id)::int as note_count,
          COUNT(DISTINCT cf.id)::int as child_count
        FROM folder_tree ft
        LEFT JOIN "Note" n ON n."folderId" = ft.id AND n."deletedAt" IS NULL
        LEFT JOIN "Folder" cf ON cf."parentId" = ft.id AND cf."deletedAt" IS NULL
        GROUP BY ft.id, ft.name, ft.color, ft."parentId", ft."userId", ft."tenantId", ft.level, ft.path, ft."order"
        ORDER BY ft.path, ft."order", ft.name;
      `;


      // Transform flat results into nested structure
      const folderMap = new Map<string, any>();
      const rootFolders: any[] = [];

      // First pass: create all folder objects
      fullTree.forEach((folder) => {
        folderMap.set(folder.id, {
          id: folder.id,
          name: folder.name,
          color: folder.color,
          parentId: folder.parentId,
          _count: {
            notes: Number(folder.note_count),
            children: Number(folder.child_count),
          },
          children: [],
        });
      });

      // Second pass: build hierarchy
      fullTree.forEach((folder) => {
        const folderObj = folderMap.get(folder.id);
        if (folder.parentId && folderMap.has(folder.parentId)) {
          const parent = folderMap.get(folder.parentId);
          parent.children.push(folderObj);
        } else {
          rootFolders.push(folderObj);
        }
      });

      const formattedFolders = rootFolders.map((folder) =>
        formatFolderResponse(folder, true, false)
      );

      return new Response(JSON.stringify(successResponse(formattedFolders)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build query for non-full-tree requests
    // For regular queries (not includeWorkspaces), only return personal folders
    // Explicitly filter workspaceId: null so middleware only returns personal folders
    const where: any = {
      deletedAt: null,
      workspaceId: null, // Explicitly filter for personal folders only
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

    // If parentId is provided, verify it exists and belongs to user/workspace
    if (data.parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: data.parentId,
          ...(data.workspaceId 
            ? { workspaceId: data.workspaceId }
            : { userId, tenantId, workspaceId: null }
          ),
          deletedAt: null,
        },
      });

      if (!parentFolder) {
        return errorResponse("Parent folder not found", 404);
      }
    }

    // If workspaceId is provided, verify user has access to the workspace
    if (data.workspaceId) {
      const membership = await prisma.workspaceMembership.findFirst({
        where: {
          workspaceId: data.workspaceId,
          userId,
          status: "active",
        },
      });

      if (!membership) {
        return errorResponse("You don't have access to this workspace", 403);
      }
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        parentId: data.parentId,
        workspaceId: data.workspaceId || null,
        order: data.order,
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

