/**
 * User Entitlements API
 * 
 * Returns the current user's entitlements for frontend consumption.
 */

import { NextResponse } from "next/server";
import { getCurrentUserEntitlements } from "@/lib/entitlements/context";

export async function GET() {
  try {
    const entitlements = await getCurrentUserEntitlements();
    
    if (!entitlements) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({ entitlements });
  } catch (error) {
    console.error("Error fetching entitlements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


