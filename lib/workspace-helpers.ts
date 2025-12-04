import { PrismaClient } from "@prisma/client";
import { prismaClient } from "./db";

/**
 * Models that have workspaceId field
 */
const WORKSPACE_AWARE_MODELS = ["Folder", "Note", "Tag", "Thought"];

/**
 * Check if a model has workspaceId field
 */
export function hasWorkspaceIdField(model: string): boolean {
  return WORKSPACE_AWARE_MODELS.includes(model);
}

/**
 * Get user's active workspace IDs (cached per request)
 */
const workspaceIdsCache = new Map<string, { ids: string[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const cached = workspaceIdsCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.ids;
  }

  const memberships = await prismaClient.workspaceMembership.findMany({
    where: {
      userId,
      status: "active",
    },
    select: {
      workspaceId: true,
    },
  });

  const workspaceIds = memberships.map((m) => m.workspaceId);
  workspaceIdsCache.set(userId, { ids: workspaceIds, timestamp: now });
  
  return workspaceIds;
}

/**
 * Verify user has active membership in workspace, throw error if not
 */
export async function verifyWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<void> {
  const membership = await prismaClient.workspaceMembership.findFirst({
    where: {
      userId,
      workspaceId,
      status: "active",
    },
  });

  if (!membership) {
    throw new Error(`User ${userId} does not have access to workspace ${workspaceId}`);
  }
}

/**
 * Get user's tenantId
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  return user?.tenantId || null;
}

/**
 * Default folder structure for new workspaces
 */
const DEFAULT_WORKSPACE_FOLDERS = [
  {
    name: "Inbox",
    children: [],
    order: 0,
  },
  {
    name: "Ideas and Experiments",
    children: [],
    order: 1,
  },
  {
    name: "Projects",
    children: [],
    order: 2,
  },
  {
    name: "SOPs and Processes",
    children: [],
    order: 3,
  },
  {
    name: "Marketing",
    children: [
      {
        name: "Video Content",
        order: 0,
      },
      {
        name: "Articles and Writing",
        order: 1,
      },
      {
        name: "Ads and Funnels",
        order: 2,
      },
    ],
    order: 4,
  },
  {
    name: "Other",
    children: [],
    order: 5,
  },
];

/**
 * Creates default folders for a new workspace
 * @param prisma - Prisma client instance (can be transaction client)
 * @param workspaceId - The workspace ID
 * @param userId - The user ID of the workspace owner
 */
export async function createDefaultWorkspaceFolders(
  prisma: PrismaClient | any,
  workspaceId: string,
  userId: string
): Promise<void> {
  try {
    console.log(`[createDefaultWorkspaceFolders] Starting folder creation for workspace: ${workspaceId}, userId: ${userId}`);
    
    // Create root folders and their children
    for (const folderConfig of DEFAULT_WORKSPACE_FOLDERS) {
      console.log(`[createDefaultWorkspaceFolders] Creating folder: ${folderConfig.name}`);
      
      const rootFolder = await prisma.folder.create({
        data: {
          name: folderConfig.name,
          workspaceId,
          userId,
          tenantId: null, // Workspace folders don't have tenantId
          parentId: null,
          order: folderConfig.order,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      console.log(`[createDefaultWorkspaceFolders] Created root folder: ${rootFolder.id} - ${rootFolder.name}`);

      // Create child folders if any
      if (folderConfig.children && folderConfig.children.length > 0) {
        for (const childConfig of folderConfig.children) {
          console.log(`[createDefaultWorkspaceFolders] Creating child folder: ${childConfig.name} under ${rootFolder.name}`);
          
          const childFolder = await prisma.folder.create({
            data: {
              name: childConfig.name,
              workspaceId,
              userId,
              tenantId: null,
              parentId: rootFolder.id,
              order: childConfig.order,
              createdBy: userId,
              updatedBy: userId,
            },
          });
          
          console.log(`[createDefaultWorkspaceFolders] Created child folder: ${childFolder.id} - ${childFolder.name}`);
        }
      }
    }
    
    console.log(`[createDefaultWorkspaceFolders] Successfully created all default folders for workspace: ${workspaceId}`);
  } catch (error) {
    console.error(`[createDefaultWorkspaceFolders] Error creating folders:`, error);
    throw error; // Re-throw to let transaction handle rollback
  }
}

