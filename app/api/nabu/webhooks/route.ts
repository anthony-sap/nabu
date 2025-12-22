import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { webhookCreateSchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import crypto from "crypto";
import { env } from "@/env";

/**
 * POST /api/nabu/webhooks
 * Create a new webhook endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request body
    const validationResult = webhookCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const { name, description } = validationResult.data;

    // Generate unguessable token (32+ characters, base64url encoded)
    const token = crypto.randomBytes(32).toString("base64url");

    // Create webhook endpoint
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        tenantId,
        token,
        name,
        description: description || null,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Construct webhook URL
    const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/inbound/${token}`;

    return new Response(
      JSON.stringify(successResponse(
        {
          id: webhook.id,
          token: webhook.token,
          url: webhookUrl,
          name: webhook.name,
          description: webhook.description,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
        },
        "Webhook endpoint created successfully"
      )),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/nabu/webhooks
 * List user's webhook endpoints
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Get webhook endpoints
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get stats for each webhook (last received, total received)
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
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

        return {
          id: webhook.id,
          token: webhook.token,
          name: webhook.name,
          description: webhook.description,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
          totalReceived: webhook._count.processingJobs,
          lastReceived: lastJob?.createdAt || null,
        };
      })
    );

    return new Response(
      JSON.stringify(successResponse(webhooksWithStats, "Webhooks retrieved successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

