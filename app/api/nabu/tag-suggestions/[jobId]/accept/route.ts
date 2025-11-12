import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, handleApiError } from "@/lib/nabu-helpers";

/**
 * POST /api/nabu/tag-suggestions/[jobId]/accept
 * Accept suggested tags (partial or all)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { jobId } = await params;
    const body = await req.json();
    const { tagNames } = body;

    if (!tagNames || !Array.isArray(tagNames) || tagNames.length === 0) {
      return NextResponse.json(
        { error: "tagNames array is required" },
        { status: 400 }
      );
    }

    // Get the job
    const job = await prisma.tagSuggestionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Job is not completed yet" },
        { status: 400 }
      );
    }

    // Validate that requested tags are in the suggested tags
    const invalidTags = tagNames.filter(
      (name) => !job.suggestedTags.includes(name)
    );
    if (invalidTags.length > 0) {
      return NextResponse.json(
        {
          error: "Some tags were not in the suggestions",
          invalidTags,
        },
        { status: 400 }
      );
    }

    // Get or create tags
    const createdTags = await Promise.all(
      tagNames.map(async (name) => {
        // Find existing tag or create new one
        const existing = await prisma.tag.findFirst({
          where: {
            name,
            userId,
            tenantId,
          },
        });

        if (existing) {
          return existing;
        }

        return prisma.tag.create({
          data: {
            name,
            userId,
            tenantId,
            type: "TOPIC", // Default type for AI-suggested tags
          },
        });
      })
    );

    // Create NoteTag relationships with AI source
    if (job.entityType === "NOTE") {
      await Promise.all(
        createdTags.map(async (tag) => {
          // Use upsert to avoid duplicate key errors
          await prisma.noteTag.upsert({
            where: {
              noteId_tagId: {
                noteId: job.entityId,
                tagId: tag.id,
              },
            },
            update: {
              confidence: job.confidence,
              source: "AI_SUGGESTED",
            },
            create: {
              noteId: job.entityId,
              tagId: tag.id,
              confidence: job.confidence,
              source: "AI_SUGGESTED",
              createdBy: userId,
            },
          });
        })
      );

      // Update note status
      await prisma.note.update({
        where: { id: job.entityId },
        data: {
          tagSuggestionStatus: "completed",
          lastTagModifiedAt: new Date(),
          pendingJobId: null,
        },
      });
    } else if (job.entityType === "THOUGHT") {
      // For thoughts, we store suggested tags differently (array field)
      const thought = await prisma.thought.findUnique({
        where: { id: job.entityId },
      });

      if (thought) {
        const updatedSuggestedTags = Array.from(
          new Set([...thought.suggestedTags, ...tagNames])
        );

        await prisma.thought.update({
          where: { id: job.entityId },
          data: {
            suggestedTags: updatedSuggestedTags,
            tagSuggestionStatus: "completed",
            lastTagModifiedAt: new Date(),
            pendingJobId: null,
          },
        });
      }
    }

    // Mark job as consumed (keep for audit trail)
    await prisma.tagSuggestionJob.update({
      where: { id: jobId },
      data: { consumed: true },
    });

    return NextResponse.json({
      message: "Tags accepted successfully",
      tagsAdded: tagNames,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

