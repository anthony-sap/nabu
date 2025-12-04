/**
 * User Sync API
 * 
 * POST /api/user/sync
 * Called after Kinde authentication to sync user to our database.
 * Creates user with Free plan if they don't exist.
 * Returns pending workspace invites.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { syncUser } from "@/lib/user-sync";
import { successResponse, errorResponse, handleApiError } from "@/lib/nabu-helpers";

export async function POST(req: NextRequest) {
  try {
    const kindeUser = await getCurrentUser();
    
    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      return errorResponse("Not authenticated", 401);
    }

    const result = await syncUser(kindeUser);

    return NextResponse.json(
      successResponse(result, result.user.isNewUser 
        ? "Welcome! Your account has been created."
        : "User synced successfully"
      )
    );
  } catch (error) {
    console.error("[UserSync] Error syncing user:", error);
    return handleApiError(error);
  }
}

