/**
 * WhatsApp Link Initiation API
 * 
 * Endpoint for initiating the phone number linking flow
 * Validates phone, updates user record, generates verification code, and sends WhatsApp message
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { normalizePhoneNumber, generateVerificationCode, isValidAustralianMobile } from "@/lib/phone-utils";
import { getWhatsAppClient } from "@/lib/whatsapp-client";

/**
 * POST /api/whatsapp/link/initiate
 * Initiate phone number linking with verification code
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
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate Australian mobile format
    if (!isValidAustralianMobile(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid Australian mobile number format. Please use format like 0400 000 000 or +61 400 000 000" },
        { status: 400 }
      );
    }

    // Check if phone is already linked to another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        id: { not: user.id },
        deletedAt: null,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "This phone number is already linked to another account" },
        { status: 400 }
      );
    }

    // Update user's phone number
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneNumber: normalizedPhone },
    });

    // Generate 6-digit verification code
    const verificationCode = generateVerificationCode();

    // Create WhatsAppLinkToken with verification code
    const token = await prisma.whatsAppLinkToken.create({
      data: {
        token: crypto.randomUUID(), // Generate unique token ID
        phoneNumber: normalizedPhone,
        verificationCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        metadata: {
          userId: user.id,
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    // Get WhatsApp client for the tenant
    const client = await getWhatsAppClient(user.tenantId);

    if (!client) {
      return NextResponse.json(
        { success: false, error: "WhatsApp integration not configured for your account" },
        { status: 500 }
      );
    }

    // Send verification code via WhatsApp
    try {
      await client.sendTextMessage(
        normalizedPhone,
        `🔐 Your Nabu verification code is: *${verificationCode}*\n\nEnter this code on the website to complete linking.\n\nThis code expires in 15 minutes.`
      );
    } catch (error) {
      console.error("Failed to send WhatsApp verification message:", error);
      
      // Clean up the token since we couldn't send the message
      await prisma.whatsAppLinkToken.delete({
        where: { id: token.id },
      });

      return NextResponse.json(
        { success: false, error: "Failed to send verification code via WhatsApp. Please check your phone number." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        phoneNumber: normalizedPhone,
        expiresAt: token.expiresAt,
        message: "Verification code sent to your WhatsApp",
      },
    });

  } catch (error) {
    console.error("Error initiating phone link:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

