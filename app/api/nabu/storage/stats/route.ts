import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * Storage statistics interface
 */
interface StorageStats {
  totalUsageBytes: number;
  totalUsageMB: number;
  totalUsageGB: number;
  totalImages: number;
  topFiles: Array<{
    id: string;
    filename: string;
    originalFilename: string;
    fileSize: number;
    fileSizeMB: number;
    mimeType: string;
    width: number | null;
    height: number | null;
    noteId: string;
    noteTitle: string;
    noteUrl: string;
    url: string | null;
    createdAt: Date;
  }>;
}

/**
 * GET /api/nabu/storage/stats
 * Get storage usage statistics for the current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Validate tenant exists
    if (!tenantId) {
      return errorResponse("User must be associated with a tenant", 403);
    }

    // Get total storage usage and count
    const aggregation = await prisma.imageAttachment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _sum: {
        fileSize: true,
      },
      _count: {
        id: true,
      },
    });

    const totalUsageBytes = aggregation._sum.fileSize || 0;
    const totalImages = aggregation._count.id;

    // Get top 20 largest files
    const topFiles = await prisma.imageAttachment.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        filename: true,
        originalFilename: true,
        fileSize: true,
        mimeType: true,
        width: true,
        height: true,
        url: true,
        noteId: true,
        createdAt: true,
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        fileSize: "desc",
      },
      take: 20,
    });

    // Format the response
    const stats: StorageStats = {
      totalUsageBytes,
      totalUsageMB: Math.round((totalUsageBytes / (1024 * 1024)) * 100) / 100,
      totalUsageGB: Math.round((totalUsageBytes / (1024 * 1024 * 1024)) * 100) / 100,
      totalImages,
      topFiles: topFiles.map((file) => ({
        id: file.id,
        filename: file.filename,
        originalFilename: file.originalFilename,
        fileSize: file.fileSize,
        fileSizeMB: Math.round((file.fileSize / (1024 * 1024)) * 100) / 100,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        noteId: file.noteId,
        noteTitle: file.note.title,
        noteUrl: `/nabu/notes/${file.noteId}`,
        url: file.url,
        createdAt: file.createdAt,
      })),
    };

    return new Response(
      JSON.stringify(successResponse(stats, "Storage stats retrieved successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

