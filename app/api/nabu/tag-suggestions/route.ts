import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, errorResponse, handleApiError } from "@/lib/nabu-helpers";

const TAG_SUGGESTION_MIN_CHARS = parseInt(
  process.env.TAG_SUGGESTION_MIN_CHARS || "200"
);
const TAG_SUGGESTION_COOLDOWN_MINUTES = parseInt(
  process.env.TAG_SUGGESTION_COOLDOWN_MINUTES || "5"
);

/**
 * POST /api/nabu/tag-suggestions
 * Create a new tag suggestion job
 */
export async function POST(req: Request) {
  try {
    const { userId, tenantId } = await getUserContext();
    const body = await req.json();
    const { entityType, entityId, content } = body;

    // Validation
    if (!entityType || !entityId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (entityType !== "NOTE" && entityType !== "THOUGHT") {
      return NextResponse.json(
        { error: "Invalid entityType" },
        { status: 400 }
      );
    }

    if (content.length < TAG_SUGGESTION_MIN_CHARS) {
      return NextResponse.json(
        {
          error: "Content too short",
          minChars: TAG_SUGGESTION_MIN_CHARS,
        },
        { status: 400 }
      );
    }

    // Get the entity and check cooldown
    let entity;
    if (entityType === "NOTE") {
      entity = await prisma.note.findUnique({
        where: { id: entityId },
        include: { noteTags: true },
      });
    } else {
      entity = await prisma.thought.findUnique({
        where: { id: entityId },
      });
    }

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    if (entity.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check cooldown
    if (entity.lastTagSuggestionAt) {
      const cooldownMs = TAG_SUGGESTION_COOLDOWN_MINUTES * 60 * 1000;
      const timeSinceLast =
        Date.now() - entity.lastTagSuggestionAt.getTime();

      if (timeSinceLast < cooldownMs) {
        const retryAfter = Math.ceil((cooldownMs - timeSinceLast) / 1000);
        return NextResponse.json(
          {
            error: "cooldown_active",
            message: "Please wait before requesting more tag suggestions",
            retryAfter,
          },
          { status: 429 }
        );
      }
    }

    // Check if there's already a pending job for this entity
    if (entity.pendingJobId) {
      const existingJob = await prisma.tagSuggestionJob.findUnique({
        where: { id: entity.pendingJobId },
      });

      if (existingJob && existingJob.status === "PENDING") {
        return NextResponse.json(
          {
            jobId: existingJob.id,
            status: "pending",
            message: "A suggestion job is already in progress",
          },
          { status: 200 }
        );
      }
    }

    // Create the job
    const job = await prisma.tagSuggestionJob.create({
      data: {
        tenantId,
        userId,
        entityType,
        entityId,
        content: content.substring(0, 1000), // Limit content for API
        status: "PENDING",
      },
    });

    // Update entity with pending job ID and status
    if (entityType === "NOTE") {
      await prisma.note.update({
        where: { id: entityId },
        data: {
          tagSuggestionStatus: "pending",
          pendingJobId: job.id,
        },
      });
    } else {
      await prisma.thought.update({
        where: { id: entityId },
        data: {
          tagSuggestionStatus: "pending",
          pendingJobId: job.id,
        },
      });
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: "pending",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

