import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/trash
 * Get deleted notes and thoughts for the current user (bypasses soft-delete middleware)
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 25, max: 100)
 * - search: string (optional - searches title/content)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;
    
    // Search
    const search = searchParams.get("search");

    // Build where clause for notes
    const noteWhere: any = {
      userId,
      tenantId,
      deletedAt: { not: null },
    };

    // Build where clause for thoughts
    const thoughtWhere: any = {
      userId,
      tenantId,
      deletedAt: { not: null },
    };
    
    // Add search filter if provided
    if (search && search.trim()) {
      noteWhere.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { content: { contains: search.trim(), mode: "insensitive" } },
      ];
      thoughtWhere.content = { contains: search.trim(), mode: "insensitive" };
    }

    // Query both notes and thoughts using includeDeleted flag to bypass soft-delete filter
    const [notes, thoughts] = await Promise.all([
      prisma.note.findMany({
        where: noteWhere,
        includeDeleted: true, // Special flag to bypass soft-delete middleware
        select: {
          id: true,
          title: true,
          content: true,
          deletedAt: true,
          deletedBy: true,
          createdAt: true,
          updatedAt: true,
          folderId: true,
          folder: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          _count: {
            select: {
              attachments: true,
              images: true,
              chunks: true,
              noteTags: true,
            },
          },
        },
      } as any), // Cast to any because includeDeleted is a custom flag
      prisma.thought.findMany({
        where: thoughtWhere,
        includeDeleted: true, // Special flag to bypass soft-delete middleware
        select: {
          id: true,
          content: true,
          deletedAt: true,
          // deletedBy: true, // TODO: Uncomment after migration is applied
          createdAt: true,
          updatedAt: true,
          source: true,
          state: true,
          noteId: true,
          note: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              attachments: true,
              chunks: true,
            },
          },
        },
      } as any), // Cast to any because includeDeleted is a custom flag
    ]);

   
    // Debug: Try a raw count query to see total deleted items in DB
    const rawNoteCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Note" 
      WHERE "userId" = ${userId} 
        AND "tenantId" = ${tenantId}
        AND "deletedAt" IS NOT NULL
    `;
    
    const rawThoughtCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Thought" 
      WHERE "userId" = ${userId} 
        AND "tenantId" = ${tenantId}
        AND "deletedAt" IS NOT NULL
    `;

    // Helper function to calculate days left and create snippet
    const processItem = (item: any, type: "note" | "thought") => {
      const deletedDate = item.deletedAt ? new Date(item.deletedAt) : new Date();
      const permanentDeleteDate = new Date(deletedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((permanentDeleteDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      
      // Create short snippet from content
      let snippet = "";
      const content = item.content || "";
      if (content) {
        snippet = content
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&[a-z]+;/gi, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 150);
        
        if (content.length > 150) {
          snippet += "...";
        }
      }

      return {
        ...item,
        type,
        title: type === "note" ? item.title : undefined,
        daysUntilPermanentDelete: daysLeft,
        permanentDeleteDate: permanentDeleteDate.toISOString(),
        snippet,
      };
    };

    // Process and combine items
    const processedNotes = notes.map((note) => processItem(note, "note"));
    const processedThoughts = thoughts.map((thought) => processItem(thought, "thought"));
    
    // Combine and sort by deletedAt (most recent first)
    const allItems = [...processedNotes, ...processedThoughts].sort((a, b) => {
      const dateA = new Date(a.deletedAt || 0).getTime();
      const dateB = new Date(b.deletedAt || 0).getTime();
      return dateB - dateA;
    });

    // Apply pagination after combining
    const total = allItems.length;
    const paginatedItems = allItems.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return new Response(
      JSON.stringify(
        successResponse({
          items: paginatedItems,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
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

