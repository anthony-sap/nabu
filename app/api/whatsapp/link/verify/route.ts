/**
 * WhatsApp Link Verification API
 * 
 * Endpoint for verifying the code entered on the website
 * and completing the phone number linking process
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyCodeAndLink } from "@/lib/whatsapp-link";
import { normalizePhoneNumber } from "@/lib/phone-utils";

/**
 * POST /api/whatsapp/link/verify
 * Verify the code and complete phone linking
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phoneNumber, code } = body;

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { success: false, error: "Phone number and code are required" },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Verify the code matches what was sent
    const result = await verifyCodeAndLink(
      normalizedPhone,
      code.trim(),
      user.tenantId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Phone number linked successfully",
        phoneNumber: normalizedPhone,
      },
    });

  } catch (error) {
    console.error("Error verifying phone link:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

