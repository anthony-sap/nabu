import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { thoughtCreateSchema, thoughtQuerySchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  formatThoughtResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";
import { enqueueThoughtEmbeddingJobs } from "@/lib/embeddings";

/**
 * GET /api/nabu/thoughts
 * List user's thoughts with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Validate query params
    const queryResult = thoughtQuerySchema.safeParse({
      state: searchParams.get("state") || undefined,
      source: searchParams.get("source") || undefined,
      noteId: searchParams.get("noteId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    if (!queryResult.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const { state, source, noteId, search, page = 1, limit = 20 } = queryResult.data;
    
    // Check includePromoted parameter (default: false to hide promoted thoughts)
    const includePromoted = searchParams.get("includePromoted") === "true";

    // Build query
    const where: any = {
      userId,
      tenantId,
      deletedAt: null,
    };

    if (state) {
      where.state = state;
    } else if (!includePromoted) {
      // By default, exclude promoted thoughts unless explicitly requested
      where.state = { not: 'PROMOTED' };
    }

    if (source) {
      where.source = source;
    }

    if (noteId !== undefined) {
      where.noteId = noteId;
    }

    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        {
          meta: {
            path: ["title"],
            string_contains: search,
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch thoughts and total count
    const [thoughts, total] = await Promise.all([
      prisma.thought.findMany({
        where,
        include: {
          note: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              attachments: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.thought.count({ where }),
    ]);

    const formattedThoughts = thoughts.map(formatThoughtResponse);

    return new Response(
      JSON.stringify(
        successResponse({
          thoughts: formattedThoughts,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        })
      ),
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
 * POST /api/nabu/thoughts
 * Create a new thought
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();

    // Validate request body
    const validationResult = thoughtCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const data = validationResult.data;

    // If noteId is provided, verify it exists and belongs to user
    if (data.noteId) {
      const note = await prisma.note.findFirst({
        where: {
          id: data.noteId,
          userId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!note) {
        return errorResponse("Note not found", 404);
      }
    }

    // Create thought
    const thought = await prisma.thought.create({
      data: {
        ...data,
        userId,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        note: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    // Enqueue embedding jobs for the new thought (async, don't wait)
    enqueueThoughtEmbeddingJobs(
      thought.id,
      thought.content,
      userId,
      tenantId
    ).catch((error) => {
      console.error("Failed to enqueue embedding jobs for thought:", error);
      // Don't fail the request if embedding jobs fail
    });

    return new Response(
      JSON.stringify(successResponse(formatThoughtResponse(thought), "Thought created successfully")),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

