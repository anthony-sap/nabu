/**
 * WhatsApp Phone Number Linking API
 * 
 * POST /api/whatsapp/link
 * Confirms and completes the phone number linking process
 */

import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { verifyLinkToken, linkPhoneToUser } from "@/lib/whatsapp-link";
import { getWhatsAppClient } from "@/lib/whatsapp-client";
import { getUserContext } from "@/lib/nabu-helpers";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    // Get authenticated user
    const { userId, tenantId } = await getUserContext();

    // Verify token
    const verification = await verifyLinkToken(token);

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Link phone to user
    await linkPhoneToUser(verification.tokenId!, userId, tenantId);

    // Send confirmation message via WhatsApp
    const client = await getWhatsAppClient(tenantId);
    if (client) {
      await client.sendTextMessage(
        verification.phoneNumber!,
        "✅ Successfully linked! You can now send messages to capture thoughts in Nabu."
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error linking phone:", error);
    return NextResponse.json(
      { error: "Failed to link phone number" },
      { status: 500 }
    );
  }
}

