/**
 * Generic Webhook Ingress Endpoint
 * 
 * Receives incoming webhook payloads from external services
 * - Accepts any HTTP method (POST, GET, PUT, etc.)
 * - Authenticates via unguessable token in URL path
 * - Creates Note and WebhookProcessingJob immediately
 * - Returns 200 OK without awaiting background processing
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { extractTitleFromBody } from "@/lib/ai/webhook-classifier";

/**
 * Handle all HTTP methods for webhook ingress
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleWebhookRequest(req, params);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleWebhookRequest(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleWebhookRequest(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleWebhookRequest(req, params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleWebhookRequest(req, params);
}

/**
 * Main webhook handler
 */
async function handleWebhookRequest(
  req: NextRequest,
  params: Promise<{ token: string }>
) {
  try {
    const { token } = await params;
    const method = req.method;

    // Find webhook endpoint by token
    const webhookEndpoint = await prisma.webhookEndpoint.findUnique({
      where: {
        token,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        tenantId: true,
      },
    });

    if (!webhookEndpoint) {
      return NextResponse.json(
        { error: "Webhook endpoint not found or inactive" },
        { status: 404 }
      );
    }

    // Extract headers (convert Headers to plain object)
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Extract IP address
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Extract body based on content type
    let body: any;
    let rawBody: string | null = null;

    try {
      const contentType = req.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        rawBody = await req.text();
        body = JSON.parse(rawBody);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        rawBody = await req.text();
        const params = new URLSearchParams(rawBody);
        body = Object.fromEntries(params);
      } else if (contentType.includes("text/")) {
        rawBody = await req.text();
        body = rawBody;
      } else {
        // Try to parse as JSON, fallback to text
        try {
          rawBody = await req.text();
          body = JSON.parse(rawBody);
        } catch {
          body = rawBody;
        }
      }
    } catch (error) {
      // If body parsing fails, store as text
      try {
        rawBody = await req.text();
        body = rawBody || "";
      } catch {
        body = "";
        rawBody = "";
      }
    }

    // Extract basic title and content from payload
    // Use enhanced title extraction (will be refined during classification)
    const title = extractTitleFromBody(body, headers, undefined, webhookEndpoint.name || undefined);
    const content = extractContent(body, headers);

    // Create Note with minimal processing
    const note = await prisma.note.create({
      data: {
        userId: webhookEndpoint.userId,
        tenantId: webhookEndpoint.tenantId,
        title,
        content,
        visibility: "PRIVATE",
        meta: {
          source: "WEBHOOK",
          webhookEndpointId: webhookEndpoint.id,
          method,
          headers,
          ipAddress,
          receivedAt: new Date().toISOString(),
        },
        createdBy: webhookEndpoint.userId,
        updatedBy: webhookEndpoint.userId,
      },
    });

    // Create WebhookProcessingJob for background processing
    await prisma.webhookProcessingJob.create({
      data: {
        tenantId: webhookEndpoint.tenantId,
        noteId: note.id,
        webhookEndpointId: webhookEndpoint.id,
        status: "PENDING",
        headers,
        body: body || {},
        rawBody: rawBody || null,
        method,
        ipAddress,
      },
    });

    // Return 200 OK immediately (do NOT await background processing)
    return NextResponse.json(
      { success: true, message: "Webhook received" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook ingress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


/**
 * Extract content from webhook payload
 */
function extractContent(body: any, headers: Record<string, string>): string {
  // If body is a string, use it directly
  if (typeof body === "string") {
    return body;
  }

  // If body is an object, try common content fields
  if (body && typeof body === "object") {
    if (body.content) return String(body.content);
    if (body.text) return String(body.text);
    if (body.body) return String(body.body);
    if (body.message) return String(body.message);
    if (body.transcript) return String(body.transcript);
    if (body.data) {
      if (typeof body.data === "string") return body.data;
      if (typeof body.data === "object") {
        return JSON.stringify(body.data, null, 2);
      }
    }
    // Fallback: stringify the entire object
    return JSON.stringify(body, null, 2);
  }

  // Try headers
  if (headers["x-content"]) return headers["x-content"];

  // Default: empty content (will be refined in background processing)
  return "";
}


