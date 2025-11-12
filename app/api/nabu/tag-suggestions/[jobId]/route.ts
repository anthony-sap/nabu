import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, handleApiError } from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/tag-suggestions/[jobId]
 * Get job status and results
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await getUserContext();
    const { jobId } = await params;

    const job = await prisma.tagSuggestionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      suggestedTags: job.suggestedTags,
      confidence: job.confidence,
      consumed: job.consumed,
      error: job.error,
      attempts: job.attempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

