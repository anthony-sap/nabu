import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  successResponse,
  handleApiError,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/mentions
 * Fetch all mention data for autocomplete: notes, folders, thoughts, and tags
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Fetch notes (limit to 50 most recent)
    const notes = await prisma.note.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    });

    // Fetch folders (limit to 50 most recent)
    const folders = await prisma.folder.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    });

    // Fetch thoughts (limit to 50 most recent)
    const thoughts = await prisma.thought.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    // Fetch tags (all active tags)
    const tags = await prisma.tag.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        color: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100, // More tags since they're smaller
    });

    // Transform data for mention plugin format
    const mentionData = {
      notes: notes.map((note) => ({
        id: note.id,
        value: note.title || "Untitled Note",
        description: `Note • Last updated ${new Date(note.updatedAt).toLocaleDateString()}`,
        type: "note" as const,
      })),
      folders: folders.map((folder) => ({
        id: folder.id,
        value: folder.name,
        description: `Folder • Last updated ${new Date(folder.updatedAt).toLocaleDateString()}`,
        type: "folder" as const,
      })),
      thoughts: thoughts.map((thought) => ({
        id: thought.id,
        value: thought.content.slice(0, 50) + (thought.content.length > 50 ? "..." : ""),
        description: `Thought • ${new Date(thought.createdAt).toLocaleDateString()}`,
        type: "thought" as const,
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        value: tag.name,
        description: tag.color ? `Tag • ${tag.color}` : "Tag",
        type: "tag" as const,
        color: tag.color,
      })),
    };

    return new Response(JSON.stringify(successResponse(mentionData)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


