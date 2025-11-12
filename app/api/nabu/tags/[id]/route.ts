import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { tagUpdateSchema } from "@/lib/validations/nabu";
import {
  getUserContext,
  validateOwnership,
  formatTagResponse,
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/nabu-helpers";

/**
 * GET /api/nabu/tags/[id]
 * Get a single tag by ID with related notes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);
    const includeNotes = searchParams.get("includeNotes") === "true";

    const tag = await prisma.tag.findFirst({
      where: {
        id: params.id,
        userId,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            noteTags: true,
          },
        },
        ...(includeNotes && {
          noteTags: {
            include: {
              note: {
                select: {
                  id: true,
                  title: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
            where: {
              note: {
                deletedAt: null,
              },
            },
          },
        }),
      },
    });

    if (!tag) {
      return errorResponse("Tag not found", 404);
    }

    const formattedTag = formatTagResponse(tag);

    // Add notes if requested
    if (includeNotes && tag.noteTags) {
      (formattedTag as any).notes = tag.noteTags.map((nt: any) => nt.note);
    }

    return new Response(JSON.stringify(successResponse(formattedTag)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/nabu/tags/[id]
 * Update a tag
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Verify ownership
    const isOwner = await validateOwnership("tag", params.id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Tag not found or access denied", 404);
    }

    const body = await req.json();

    // Validate request body
    const validationResult = tagUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid request body",
        400
      );
    }

    const data = validationResult.data;

    // If name is being changed, check for conflicts
    if (data.name) {
      const existingTag = await prisma.tag.findFirst({
        where: {
          name: data.name,
          userId,
          tenantId,
          deletedAt: null,
          id: { not: params.id },
        },
      });

      if (existingTag) {
        return errorResponse("Tag with this name already exists", 409);
      }
    }

    // Update tag
    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        _count: {
          select: {
            noteTags: true,
          },
        },
      },
    });

    return new Response(
      JSON.stringify(successResponse(formatTagResponse(tag), "Tag updated successfully")),
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
 * DELETE /api/nabu/tags/[id]
 * Soft-delete a tag (removes from all notes via cascade)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, tenantId } = await getUserContext();

    // Verify ownership
    const isOwner = await validateOwnership("tag", params.id, userId, tenantId);
    if (!isOwner) {
      return errorResponse("Tag not found or access denied", 404);
    }

    // Delete tag (this will cascade delete noteTags due to schema relations)
    await prisma.tag.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return new Response(
      JSON.stringify(successResponse(null, "Tag deleted successfully")),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

