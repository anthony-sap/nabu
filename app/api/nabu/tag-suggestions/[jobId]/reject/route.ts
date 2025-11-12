import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, handleApiError } from "@/lib/nabu-helpers";

/**
 * POST /api/nabu/tag-suggestions/[jobId]/reject
 * Reject suggested tags
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { jobId } = await params;

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

    // Update entity status
    if (job.entityType === "NOTE") {
      await prisma.note.update({
        where: { id: job.entityId },
        data: {
          tagSuggestionStatus: null,
          lastTagModifiedAt: new Date(), // Prevents immediate re-suggest
          pendingJobId: null,
        },
      });
    } else if (job.entityType === "THOUGHT") {
      await prisma.thought.update({
        where: { id: job.entityId },
        data: {
          tagSuggestionStatus: null,
          lastTagModifiedAt: new Date(), // Prevents immediate re-suggest
          pendingJobId: null,
        },
      });
    }

    // Mark job as consumed (keep for audit trail)
    await prisma.tagSuggestionJob.update({
      where: { id: jobId },
      data: { consumed: true },
    });

    return NextResponse.json({
      message: "Tags rejected successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

