import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, handleApiError } from "@/lib/nabu-helpers";

/**
 * POST /api/nabu/tag-suggestions/[jobId]/dismiss
 * Dismiss (mark as reviewed) suggested tags without accepting or rejecting
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

    // Mark job as consumed (reviewed)
    await prisma.tagSuggestionJob.update({
      where: { id: jobId },
      data: { consumed: true },
    });

    // Update entity to clear pendingJobId
    if (job.entityType === "NOTE") {
      await prisma.note.update({
        where: { id: job.entityId },
        data: {
          pendingJobId: null,
        },
      });
    } else if (job.entityType === "THOUGHT") {
      await prisma.thought.update({
        where: { id: job.entityId },
        data: {
          pendingJobId: null,
        },
      });
    }

    return NextResponse.json({
      message: "Tags dismissed successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

