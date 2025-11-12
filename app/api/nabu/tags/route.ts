import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { tagCreateSchema, tagQuerySchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  formatTagResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/tags
 * List user's tags with usage counts
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Validate query params
    const queryResult = tagQuerySchema.safeParse({
      type: searchParams.get("type") || undefined,
    });

    if (!queryResult.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const { type } = queryResult.data;

    // Build query
    const where: any = {
      userId,
      tenantId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    const tags = await prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            noteTags: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const formattedTags = tags.map(formatTagResponse);

    return new Response(JSON.stringify(successResponse(formattedTags)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/nabu/tags
 * Create a new tag
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request body
    const validationResult = tagCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const data = validationResult.data;

    // Check if tag with same name already exists for this user/tenant
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: data.name,
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (existingTag) {
      return errorResponse("Tag with this name already exists", 409);
    }

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        ...data,
        userId,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        _count: {
          select: {
            noteTags: true,
          },
        },
      },
    });

    return new Response(
      JSON.stringify(successResponse(formatTagResponse(tag), "Tag created successfully")),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

