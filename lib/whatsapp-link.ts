/**
 * WhatsApp Phone Number Linking
 * 
 * Handles secure linking of WhatsApp phone numbers to Nabu user accounts
 * using one-time tokens with expiration.
 */

import { prisma } from "@/lib/db";
import crypto from "crypto";
import { env } from "@/env";

/**
 * Generate a secure linking token for a phone number
 * 
 * Creates a cryptographically secure token that expires in 15 minutes.
 * The token is used in a one-time link sent to the user via WhatsApp.
 */
export async function generateLinkToken(
  phoneNumber: string,
  whatsappMessageId?: string
): Promise<string> {
  // Generate secure random token
  const token = crypto.randomBytes(32).toString("base64url");
  
  // Token expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.whatsAppLinkToken.create({
    data: {
      token,
      phoneNumber,
      whatsappMessageId,
      expiresAt,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    },
  });

  return token;
}

/**
 * Verify and validate a link token
 * 
 * Checks if the token exists, hasn't been used, and hasn't expired.
 */
export async function verifyLinkToken(token: string): Promise<{
  valid: boolean;
  phoneNumber?: string;
  tokenId?: string;
}> {
  const linkToken = await prisma.whatsAppLinkToken.findUnique({
    where: { token },
  });

  if (!linkToken) {
    return { valid: false };
  }

  // Check if already used
  if (linkToken.usedAt) {
    return { valid: false };
  }

  // Check if expired
  if (linkToken.expiresAt < new Date()) {
    return { valid: false };
  }

  return {
    valid: true,
    phoneNumber: linkToken.phoneNumber,
    tokenId: linkToken.id,
  };
}

/**
 * Mark token as used and link phone to user
 * 
 * Creates or updates the UserPhoneLink record and marks the token as consumed.
 */
export async function linkPhoneToUser(
  tokenId: string,
  userId: string,
  tenantId: string | null
): Promise<void> {
  const token = await prisma.whatsAppLinkToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    throw new Error("Token not found");
  }

  // Mark token as used
  await prisma.whatsAppLinkToken.update({
    where: { id: tokenId },
    data: {
      usedAt: new Date(),
      userId,
    },
  });

  // Create or update phone link
  await prisma.userPhoneLink.upsert({
    where: {
      phoneNumber_tenantId: {
        phoneNumber: token.phoneNumber,
        tenantId: tenantId,
      },
    },
    create: {
      userId,
      tenantId,
      phoneNumber: token.phoneNumber,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    },
    update: {
      userId,
      isActive: true,
      updatedBy: userId,
    },
  });
}

/**
 * Check if phone number is linked to a user
 * 
 * Returns the linked user information if the phone number is active,
 * or null if not linked.
 */
export async function getLinkedUser(
  phoneNumber: string,
  tenantId: string | null
): Promise<{ userId: string; tenantId: string | null } | null> {
  const link = await prisma.userPhoneLink.findFirst({
    where: {
      phoneNumber,
      tenantId,
      isActive: true,
      deletedAt: null,
    },
  });

  if (!link) {
    return null;
  }

  return {
    userId: link.userId,
    tenantId: link.tenantId,
  };
}

