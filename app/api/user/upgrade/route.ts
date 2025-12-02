/**
 * Plan Upgrade API
 * 
 * POST /api/user/upgrade
 * Handles plan upgrades without payment (for testing).
 * 
 * Supported upgrade paths:
 * - Free → Personal
 * - Free → Teams (creates workspace)
 * - Personal → Teams (creates workspace)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getDbUser } from "@/lib/user-sync";
import { successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";
import { PlanCode } from "@/lib/entitlements/types";
import { createDefaultWorkspaceFolders } from "@/lib/workspace-helpers";

// Valid upgrade paths
const VALID_UPGRADES: Record<PlanCode, PlanCode[]> = {
  free: ["personal", "teams"],
  personal: ["teams"],
  teams: [], // No upgrades from teams
};

const upgradeSchema = z.object({
  targetPlan: z.enum(["personal", "teams"]),
  // For Teams upgrade, workspace name is required
  workspaceName: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const kindeUser = await getCurrentUser();
    
    if (!kindeUser || !kindeUser.id) {
      return errorResponse("Not authenticated", 401);
    }

    // Parse and validate request body
    const body = await req.json();
    const { targetPlan, workspaceName } = upgradeSchema.parse(body);

    // Get user from database
    const dbUser = await getDbUser(kindeUser.id);
    
    if (!dbUser) {
      return errorResponse("User not found in database. Please refresh and try again.", 404);
    }

    const currentPlan = dbUser.plan as PlanCode;
    
    // Validate upgrade path
    const validTargets = VALID_UPGRADES[currentPlan];
    if (!validTargets.includes(targetPlan)) {
      if (currentPlan === targetPlan) {
        return errorResponse(`You are already on the ${targetPlan} plan`, 400);
      }
      return errorResponse(
        `Cannot upgrade from ${currentPlan} to ${targetPlan}. Valid upgrades: ${validTargets.join(", ") || "none"}`,
        400
      );
    }

    // Handle Teams upgrade - requires workspace creation
    if (targetPlan === "teams") {
      if (!workspaceName) {
        return errorResponse("Workspace name is required for Teams upgrade", 400);
      }

      // Create workspace and upgrade user in a transaction
      const result = await prismaClient.$transaction(async (tx) => {
        // Create the workspace
        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            planCode: "teams",
            billingMode: "self_service",
            createdBy: kindeUser.id,
            updatedBy: kindeUser.id,
          },
        });

        // Add user as workspace owner
        await tx.workspaceMembership.create({
          data: {
            workspaceId: workspace.id,
            userId: kindeUser.id,
            role: "owner",
            status: "active",
            acceptedAt: new Date(),
          },
        });

        // Create default folders for the workspace
        await createDefaultWorkspaceFolders(tx, workspace.id, kindeUser.id);
        console.log(`[Upgrade] Created default folders for workspace: ${workspace.id}`);

        // Update user plan
        const updatedUser = await tx.user.update({
          where: { id: kindeUser.id },
          data: { 
            plan: targetPlan,
            updatedBy: kindeUser.id,
          },
          select: {
            id: true,
            email: true,
            plan: true,
          },
        });

        return {
          user: updatedUser,
          workspace: {
            id: workspace.id,
            name: workspace.name,
          },
        };
      });

      console.log(`[Upgrade] User ${kindeUser.email} upgraded from ${currentPlan} to ${targetPlan}, created workspace: ${result.workspace.name}`);

      return NextResponse.json(
        successResponse({
          previousPlan: currentPlan,
          newPlan: targetPlan,
          workspace: result.workspace,
        }, `Successfully upgraded to Teams plan! Your workspace "${result.workspace.name}" is ready.`)
      );
    }

    // Handle Personal upgrade (simpler - just update plan field)
    const updatedUser = await prismaClient.user.update({
      where: { id: kindeUser.id },
      data: { 
        plan: targetPlan,
        updatedBy: kindeUser.id,
      },
      select: {
        id: true,
        email: true,
        plan: true,
      },
    });

    console.log(`[Upgrade] User ${kindeUser.email} upgraded from ${currentPlan} to ${targetPlan}`);

    return NextResponse.json(
      successResponse({
        previousPlan: currentPlan,
        newPlan: targetPlan,
      }, `Successfully upgraded to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} plan!`)
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(`Invalid request: ${error.errors[0].message}`, 400);
    }
    console.error("[Upgrade] Error upgrading user:", error);
    return handleApiError(error);
  }
}

/**
 * GET /api/user/upgrade
 * Get available upgrade options for current user
 */
export async function GET(req: NextRequest) {
  try {
    const kindeUser = await getCurrentUser();
    
    if (!kindeUser || !kindeUser.id) {
      return errorResponse("Not authenticated", 401);
    }

    const dbUser = await getDbUser(kindeUser.id);
    
    if (!dbUser) {
      return errorResponse("User not found", 404);
    }

    const currentPlan = dbUser.plan as PlanCode;
    const availableUpgrades = VALID_UPGRADES[currentPlan];

    return NextResponse.json(
      successResponse({
        currentPlan,
        availableUpgrades,
        workspaces: dbUser.workspaceMemberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          role: m.role,
        })),
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

