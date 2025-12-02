/**
 * Utility endpoint to create default folders for an existing workspace
 * POST /api/workspace/create-default-folders
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { createDefaultWorkspaceFolders } from "@/lib/workspace-helpers";

export async function POST(req: NextRequest) {
  try {
    const kindeUser = await getCurrentUser();
    
    if (!kindeUser || !kindeUser.id) {
      return errorResponse("Not authenticated", 401);
    }

    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    // Verify user has access to the workspace
    const membership = await prismaClient.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId: kindeUser.id,
        status: "active",
      },
    });

    if (!membership) {
      return errorResponse("You don't have access to this workspace", 403);
    }

    // Check if folders already exist
    const existingFolders = await prismaClient.folder.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        parentId: null,
      },
      take: 1,
    });

    if (existingFolders.length > 0) {
      return errorResponse("Default folders already exist for this workspace", 400);
    }

    // Create default folders
    await createDefaultWorkspaceFolders(
      prismaClient,
      workspaceId,
      kindeUser.id
    );

    return NextResponse.json(
      successResponse(
        { workspaceId },
        "Default folders created successfully"
      )
    );
  } catch (error) {
    console.error("[create-default-folders] Error:", error);
    return handleApiError(error);
  }
}


