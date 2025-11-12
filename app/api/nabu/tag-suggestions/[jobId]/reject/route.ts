import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/nabu/tag-suggestions/[jobId]/reject
 * Reject suggested tags
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;

    // Get the job
    const job = await prisma.tagSuggestionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.userId !== session.user.id) {
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

    // Delete the job
    await prisma.tagSuggestionJob.delete({
      where: { id: jobId },
    });

    return NextResponse.json({
      message: "Tags rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting tag suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

