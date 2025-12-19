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
import { headers, cookies } from "next/headers";
import { prismaClient, MAIN_TENANT_ID } from "@/lib/db";
import { updateUserPropertiesInKinde, refreshUserClaimsInKinde } from "@/lib/kinde";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
    console.log(`[AuthCallback] Checking for existing user with ID: ${kindeUser.id}`);
    let dbUser = await prismaClient.user.findUnique({
      where: { id: kindeUser.id },
      select: { id: true, email: true, plan: true, tenantId: true },
    });

    // Also check by email if not found by ID (handles edge cases)
    if (!dbUser) {
      console.log(`[AuthCallback] User not found by ID, checking by email: ${kindeUser.email}`);
      dbUser = await prismaClient.user.findUnique({
        where: { email: kindeUser.email },
        select: { id: true, email: true, plan: true, tenantId: true },
      });

      // Update the ID if found by email but with different ID
      if (dbUser && dbUser.id !== kindeUser.id) {
        console.log(`[AuthCallback] Updating user ID from ${dbUser.id} to ${kindeUser.id}`);
        try {
          await prismaClient.user.update({
            where: { id: dbUser.id },
            data: { id: kindeUser.id },
          });
          dbUser.id = kindeUser.id;
          console.log(`[AuthCallback] Successfully updated user ID`);
        } catch (updateError: any) {
          console.error(`[AuthCallback] Failed to update user ID:`, updateError);
          throw updateError;
        }
      }
    } else {
      console.log(`[AuthCallback] Found existing user: ${dbUser.id}`);
    }

    let isNewUser = false;

    // Create user if they don't exist
    if (!dbUser) {
      isNewUser = true;
      console.log(`[AuthCallback] Creating new user: ${kindeUser.email} (${kindeUser.id})`);
      console.log(`[AuthCallback] Using MAIN_TENANT_ID: ${MAIN_TENANT_ID}`);
      
      try {
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

        console.log(`[AuthCallback] Successfully created user: ${dbUser.id} with plan: ${dbUser.plan}, tenantId: ${dbUser.tenantId}`);
      } catch (createError: any) {
        console.error(`[AuthCallback] Failed to create user:`, createError);
        console.error(`[AuthCallback] Error details:`, {
          code: createError.code,
          meta: createError.meta,
          message: createError.message,
        });
        // Re-throw to be caught by outer catch block
        throw new Error(`Failed to create user in database: ${createError.message}`);
      }
    }

    // Update Kinde user properties with db_id and tenant_id
    try {
      await updateUserPropertiesInKinde(kindeUser.id, {
        db_id: dbUser.id,
        tenant_id: dbUser.tenantId || MAIN_TENANT_ID,
      });
      console.log(`[AuthCallback] Updated Kinde properties for user: ${dbUser.id}`);
      
      // Refresh user claims to ensure next token includes updated properties
      try {
        await refreshUserClaimsInKinde(kindeUser.id);
        console.log(`[AuthCallback] Refreshed user claims for user: ${dbUser.id}`);
        
        // Force re-authentication to get fresh token with updated claims
        // Redirect to logout then login to get new token
        console.log(`[AuthCallback] Redirecting to logout to refresh token...`);
        redirect("/api/auth/logout?post_logout_redirect_uri=/api/auth/login");
      } catch (refreshError) {
        console.error("[AuthCallback] Failed to refresh user claims:", refreshError);
        // Continue anyway - user can refresh token on next login
      }
    } catch (kindeError) {
      // Log but don't fail - Kinde properties are nice-to-have
      console.error("[AuthCallback] Failed to update Kinde properties:", kindeError);
    }

    // Check for invite token from multiple sources (priority order)
    let inviteToken: string | null = null;
    
    // 1. Check cookie (set before login redirect)
    try {
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get('pendingInviteToken')?.value;
      if (cookieToken) {
        inviteToken = cookieToken;
        console.log(`[AuthCallback] Found invite token in cookie: ${inviteToken}`);
        // Delete the cookie after reading
        cookieStore.delete('pendingInviteToken');
      }
    } catch (error) {
      console.log("[AuthCallback] Could not access cookies");
    }
    
    // 2. Check query params (from postLoginRedirectURL or direct navigation)
    if (!inviteToken) {
      const params = await searchParams;
      // Check for inviteToken query param
      const tokenParam = params.inviteToken;
      if (tokenParam && typeof tokenParam === 'string') {
        inviteToken = tokenParam;
        console.log(`[AuthCallback] Found invite token in query params: ${inviteToken}`);
      }
      // Also check if the returnTo URL contains an invite path
      const returnTo = params.returnTo || params.return_to;
      if (!inviteToken && returnTo && typeof returnTo === 'string' && returnTo.includes('/invite/')) {
        const match = returnTo.match(/\/invite\/([^/?]+)/);
        if (match && match[1]) {
          inviteToken = match[1];
          console.log(`[AuthCallback] Found invite token in returnTo URL: ${inviteToken}`);
        }
      }
    }
    
    // 3. Check referrer header for invite URL
    if (!inviteToken) {
      try {
        const headersList = await headers();
        const referer = headersList.get('referer');
        if (referer && referer.includes('/invite/')) {
          const match = referer.match(/\/invite\/([^/?]+)/);
          if (match && match[1]) {
            inviteToken = match[1];
            console.log(`[AuthCallback] Found invite token in referer: ${inviteToken}`);
          }
        }
      } catch (error) {
        // Headers might not be available in all contexts
        console.log("[AuthCallback] Could not access headers");
      }
    }

    // If we have a specific invite token, redirect to it
    if (inviteToken) {
      // Verify the invite exists and is valid
      const invite = await prismaClient.workspaceInvite.findUnique({
        where: { token: inviteToken },
        select: { 
          email: true, 
          acceptedAt: true, 
          expiresAt: true 
        },
      });

      if (invite && !invite.acceptedAt && invite.expiresAt > new Date()) {
        // Verify email matches (or allow if no email check needed)
        if (invite.email.toLowerCase() === kindeUser.email.toLowerCase()) {
          console.log(`[AuthCallback] Redirecting to specific invite: ${inviteToken}`);
          redirect(`/invite/${inviteToken}`);
        } else {
          console.log(`[AuthCallback] Invite email mismatch: invite=${invite.email}, user=${kindeUser.email}`);
        }
      } else {
        console.log(`[AuthCallback] Invite token ${inviteToken} is invalid or expired`);
      }
    }

    // Fallback: Check for pending workspace invites by email
    const pendingInvite = await prismaClient.workspaceInvite.findFirst({
      where: {
        email: { equals: kindeUser.email, mode: 'insensitive' },
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { token: true },
      orderBy: { createdAt: 'desc' }, // Get most recent invite
    });

    // Redirect to invite acceptance if there's a pending invite
    if (pendingInvite) {
      console.log(`[AuthCallback] Found pending invite by email, redirecting to accept`);
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

