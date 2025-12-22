/**
 * User Sync Service
 * 
 * Handles syncing Kinde users to our database on first login.
 * Creates users with Free plan by default and checks for pending workspace invites.
 */

import "server-only";

import { prisma, prismaClient, MAIN_TENANT_ID } from "@/lib/db";
import { CurrentUser } from "@/lib/session";

export interface UserSyncResult {
  user: {
    id: string;
    email: string;
    plan: string;
    isNewUser: boolean;
  };
  pendingInvites: Array<{
    id: string;
    token: string;
    workspaceId: string;
    workspaceName: string;
    role: string;
  }>;
}

/**
 * Sync a Kinde user to our database
 * 
 * - Creates user with Free plan if they don't exist
 * - Returns any pending workspace invites for the user's email
 */
export async function syncUser(kindeUser: CurrentUser): Promise<UserSyncResult> {
  if (!kindeUser || !kindeUser.id || !kindeUser.email) {
    throw new Error("Invalid Kinde user data");
  }

  // Check if user exists by Kinde ID
  let existingUser = await prismaClient.user.findUnique({
    where: { id: kindeUser.id },
    select: {
      id: true,
      email: true,
      plan: true,
    },
  });

  // Also check by email if not found by ID (handles ID changes)
  if (!existingUser) {
    existingUser = await prismaClient.user.findUnique({
      where: { email: kindeUser.email },
      select: {
        id: true,
        email: true,
        plan: true,
      },
    });

    // Update the ID if found by email
    if (existingUser && existingUser.id !== kindeUser.id) {
      await prismaClient.user.update({
        where: { id: existingUser.id },
        data: { id: kindeUser.id },
      });
      existingUser.id = kindeUser.id;
    }
  }

  let isNewUser = false;

  // Create user if they don't exist
  if (!existingUser) {
    isNewUser = true;
    console.log(`[UserSync] Creating new user: ${kindeUser.email}`);

    existingUser = await prismaClient.user.create({
      data: {
        id: kindeUser.id,
        email: kindeUser.email,
        firstName: kindeUser.firstName || null,
        lastName: kindeUser.lastName || null,
        plan: "free", // Default to Free plan
        tenantId: kindeUser.tenantId || MAIN_TENANT_ID,
      },
      select: {
        id: true,
        email: true,
        plan: true,
      },
    });

    console.log(`[UserSync] Created user with ID: ${existingUser.id}, plan: ${existingUser.plan}`);
  }

  // Check for pending workspace invites
  const pendingInvites = await prismaClient.workspaceInvite.findMany({
    where: {
      email: {
        equals: kindeUser.email,
        mode: 'insensitive',
      },
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
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

  return {
    user: {
      id: existingUser.id,
      email: existingUser.email!,
      plan: existingUser.plan,
      isNewUser,
    },
    pendingInvites: pendingInvites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      workspaceId: invite.workspace.id,
      workspaceName: invite.workspace.name,
      role: invite.role,
    })),
  };
}

/**
 * Get user from database by ID
 */
export async function getDbUser(userId: string) {
  return prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      plan: true,
      firstName: true,
      lastName: true,
      tenantId: true,
      workspaceMemberships: {
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              planCode: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Check if user exists in database
 */
export async function userExistsInDb(userId: string): Promise<boolean> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return !!user;
}

