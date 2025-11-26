/**
 * Auth Callback Page
 * 
 * This page is the redirect target after Kinde authentication.
 * It syncs the authenticated user to our database and handles:
 * - Creating new users with Free plan
 * - Updating Kinde user properties (db_id, tenant_id)
 * - Checking for pending workspace invites
 * - Redirecting to appropriate destination
 */

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prismaClient, MAIN_TENANT_ID } from "@/lib/db";
import { updateUserPropertiesInKinde } from "@/lib/kinde";

export default async function AuthCallbackPage() {
  console.log("[AuthCallback] Starting user sync...");
  
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  // If no user, redirect to login
  if (!kindeUser?.id || !kindeUser?.email) {
    console.log("[AuthCallback] No Kinde user found, redirecting to login");
    redirect("/api/auth/login");
  }

  console.log(`[AuthCallback] Processing user: ${kindeUser.email} (${kindeUser.id})`);

  try {
    // Check if user exists by Kinde ID
    let dbUser = await prismaClient.user.findUnique({
      where: { id: kindeUser.id },
      select: { id: true, email: true, plan: true, tenantId: true },
    });

    // Also check by email if not found by ID (handles edge cases)
    if (!dbUser) {
      dbUser = await prismaClient.user.findUnique({
        where: { email: kindeUser.email },
        select: { id: true, email: true, plan: true, tenantId: true },
      });

      // Update the ID if found by email but with different ID
      if (dbUser && dbUser.id !== kindeUser.id) {
        console.log(`[AuthCallback] Updating user ID from ${dbUser.id} to ${kindeUser.id}`);
        await prismaClient.user.update({
          where: { id: dbUser.id },
          data: { id: kindeUser.id },
        });
        dbUser.id = kindeUser.id;
      }
    }

    let isNewUser = false;

    // Create user if they don't exist
    if (!dbUser) {
      isNewUser = true;
      console.log(`[AuthCallback] Creating new user: ${kindeUser.email}`);
      
      dbUser = await prismaClient.user.create({
        data: {
          id: kindeUser.id,
          email: kindeUser.email,
          firstName: kindeUser.given_name || null,
          lastName: kindeUser.family_name || null,
          plan: "free", // Default to Free plan
          tenantId: MAIN_TENANT_ID,
        },
        select: { id: true, email: true, plan: true, tenantId: true },
      });

      console.log(`[AuthCallback] Created user: ${dbUser.id} with plan: ${dbUser.plan}`);
    }

    // Update Kinde user properties with db_id and tenant_id
    try {
      await updateUserPropertiesInKinde(kindeUser.id, {
        db_id: dbUser.id,
        tenant_id: dbUser.tenantId || MAIN_TENANT_ID,
      });
      console.log(`[AuthCallback] Updated Kinde properties for user: ${dbUser.id}`);
    } catch (kindeError) {
      // Log but don't fail - Kinde properties are nice-to-have
      console.error("[AuthCallback] Failed to update Kinde properties:", kindeError);
    }

    // Check for pending workspace invites
    const pendingInvite = await prismaClient.workspaceInvite.findFirst({
      where: {
        email: { equals: kindeUser.email, mode: 'insensitive' },
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { token: true },
    });

    // Redirect to invite acceptance if there's a pending invite
    if (pendingInvite) {
      console.log(`[AuthCallback] Found pending invite, redirecting to accept`);
      redirect(`/invite/${pendingInvite.token}`);
    }

    // Otherwise redirect to notes (main app)
    console.log(`[AuthCallback] User sync complete, redirecting to notes`);
    redirect("/notes");
  } catch (error) {
    console.error("[AuthCallback] Error syncing user:", error);
    // Still redirect to notes - the app will handle missing user gracefully
    redirect("/notes");
  }
}

