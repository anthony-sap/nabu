/**
 * WhatsApp Phone Link Management API
 * 
 * DELETE /api/whatsapp/link/[linkId]
 * Unlink a WhatsApp phone number from user account
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/nabu-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const { userId } = await getUserContext();

    // Verify ownership
    const link = await prisma.userPhoneLink.findFirst({
      where: {
        id: linkId,
        userId,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Phone link not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.userPhoneLink.update({
      where: { id: linkId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking phone:", error);
    return NextResponse.json(
      { error: "Failed to unlink phone number" },
      { status: 500 }
    );
  }
}

