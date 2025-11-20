import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { webhookUpdateSchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/webhooks/[id]
 * Get webhook endpoint details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id } = await params;

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        id,
        userId,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            processingJobs: true,
          },
        },
      },
    });

    if (!webhook) {
      return errorResponse("Webhook endpoint not found", 404);
    }

    // Get last received timestamp
    const lastJob = await prisma.webhookProcessingJob.findFirst({
      where: {
        webhookEndpointId: webhook.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    return new Response(
      JSON.stringify(successResponse(
        {
          id: webhook.id,
          token: webhook.token,
          name: webhook.name,
          description: webhook.description,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
          totalReceived: webhook._count.processingJobs,
          lastReceived: lastJob?.createdAt || null,
        },
        "Webhook endpoint retrieved successfully"
      )),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/nabu/webhooks/[id]
 * Soft delete webhook endpoint
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id } = await params;

    // Verify webhook exists and belongs to user
    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        id,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!webhook) {
      return errorResponse("Webhook endpoint not found", 404);
    }

    // Soft delete
    await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return new Response(
      JSON.stringify(successResponse(null, "Webhook endpoint deleted successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/nabu/webhooks/[id]
 * Update webhook endpoint
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { id } = await params;
    const body = await req.json();

    // Validate request body
    const validationResult = webhookUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    // Verify webhook exists and belongs to user
    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        id,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!webhook) {
      return errorResponse("Webhook endpoint not found", 404);
    }

    // Update webhook
    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...validationResult.data,
        updatedBy: userId,
      },
    });

    return new Response(
      JSON.stringify(successResponse(
        {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          isActive: updated.isActive,
          updatedAt: updated.updatedAt,
        },
        "Webhook endpoint updated successfully"
      )),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

