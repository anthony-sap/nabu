/**
 * Note Version Service
 * 
 * Handles creation, retrieval, and management of note version history.
 * Implements automatic versioning, manual snapshots, and retention policies.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Version creation reasons
 */
export type VersionReason = "autosave" | "manual" | "restore";

/**
 * Check if a new autosave version should be created
 * Returns true if 5+ minutes have elapsed since the last autosave version
 * 
 * @param noteId - The note ID to check
 * @returns Promise<boolean> - Whether to create a new version
 */
export async function shouldCreateVersion(noteId: string): Promise<boolean> {
  // Get the most recent autosave version
  const lastAutosaveVersion = await prisma.noteVersion.findFirst({
    where: {
      noteId,
      reason: "autosave",
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  // If no autosave version exists, create one
  if (!lastAutosaveVersion) {
    return true;
  }

  // Check if 5 minutes have passed
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastAutosaveVersion.createdAt < fiveMinutesAgo;
}

/**
 * Create a new version snapshot from the current note state
 * 
 * @param noteId - The note ID to snapshot
 * @param reason - Why this version is being created
 * @param userId - The user creating the version
 * @param changesSummary - Optional description of changes
 * @returns Promise<NoteVersion> - The created version
 */
export async function createVersion(
  noteId: string,
  reason: VersionReason,
  userId: string,
  changesSummary?: string
) {
  // Fetch the current note state
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      tenantId: true,
      title: true,
      content: true,
      contentState: true,
    },
  });

  if (!note) {
    throw new Error(`Note with ID ${noteId} not found`);
  }

  // Get the next version number for this note
  const lastVersion = await prisma.noteVersion.findFirst({
    where: { noteId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  // Create the version snapshot
  const version = await prisma.noteVersion.create({
    data: {
      noteId,
      tenantId: note.tenantId,
      title: note.title,
      content: note.content,
      contentState: note.contentState,
      reason,
      versionNumber: nextVersionNumber,
      changesSummary,
      createdBy: userId,
      updatedBy: userId,
    },
  });

  // Prune old versions asynchronously (fire-and-forget)
  pruneOldVersions(noteId).catch((error) => {
    console.error(`[VERSION] Failed to prune old versions for note ${noteId}:`, error);
  });

  return version;
}

/**
 * Apply retention rules to prune old autosave versions
 * Keeps: min(50 latest autosaves, autosaves from last 90 days)
 * Manual and restore versions are NEVER pruned
 * 
 * @param noteId - The note ID to prune versions for
 */
export async function pruneOldVersions(noteId: string): Promise<void> {
  // Get all autosave versions for this note, ordered by createdAt DESC
  const autosaveVersions = await prisma.noteVersion.findMany({
    where: {
      noteId,
      reason: "autosave",
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
    },
  });

  // Calculate cutoff date (90 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  // Keep versions that are: (within last 50) OR (within 90 days)
  const versionsToDelete = autosaveVersions.filter((v, idx) => {
    return idx >= 50 && new Date(v.createdAt) < cutoffDate;
  });

  // Soft delete old versions
  if (versionsToDelete.length > 0) {
    await prisma.noteVersion.updateMany({
      where: {
        id: { in: versionsToDelete.map((v) => v.id) },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(
      `[VERSION] Pruned ${versionsToDelete.length} old autosave versions for note ${noteId}`
    );
  }
}

/**
 * Get paginated version history for a note
 * 
 * @param noteId - The note ID
 * @param userId - The requesting user ID (for ownership verification)
 * @param tenantId - The tenant ID (for multi-tenancy)
 * @param options - Pagination and filtering options
 * @returns Promise with versions and pagination data
 */
export async function getVersionHistory(
  noteId: string,
  userId: string,
  tenantId: string | null,
  options: {
    page?: number;
    limit?: number;
    reasonFilter?: VersionReason;
  } = {}
) {
  const { page = 1, limit = 50, reasonFilter } = options;

  // Verify note ownership
  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      userId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!note) {
    throw new Error("Note not found or access denied");
  }

  // Build where clause
  const where: Prisma.NoteVersionWhereInput = {
    noteId,
    deletedAt: null,
  };

  if (reasonFilter) {
    where.reason = reasonFilter;
  }

  // Get total count
  const totalCount = await prisma.noteVersion.count({ where });

  // Get paginated versions
  const versions = await prisma.noteVersion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      versionNumber: true,
      reason: true,
      changesSummary: true,
      createdAt: true,
      createdBy: true,
      title: true,
    },
  });

  return {
    versions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get a specific version by ID
 * 
 * @param versionId - The version ID
 * @param userId - The requesting user ID (for ownership verification)
 * @param tenantId - The tenant ID (for multi-tenancy)
 * @returns Promise<NoteVersion> - The version with full content
 */
export async function getVersion(
  versionId: string,
  userId: string,
  tenantId: string | null
) {
  const version = await prisma.noteVersion.findFirst({
    where: {
      id: versionId,
      deletedAt: null,
      note: {
        userId,
        tenantId,
        deletedAt: null,
      },
    },
    include: {
      note: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error("Version not found or access denied");
  }

  return version;
}

/**
 * Restore a previous version to the current note
 * Creates a backup version with reason="restore" before overwriting
 * 
 * @param noteId - The note ID to restore
 * @param versionId - The version ID to restore from
 * @param userId - The user performing the restore
 * @param tenantId - The tenant ID (for multi-tenancy)
 * @returns Promise with the updated note and backup version
 */
export async function restoreVersion(
  noteId: string,
  versionId: string,
  userId: string,
  tenantId: string | null
) {
  // Get the version to restore
  const versionToRestore = await getVersion(versionId, userId, tenantId);

  if (versionToRestore.noteId !== noteId) {
    throw new Error("Version does not belong to this note");
  }

  // Use a transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Create a backup version of the current state
    const currentNote = await tx.note.findUnique({
      where: { id: noteId },
      select: {
        title: true,
        content: true,
        contentState: true,
      },
    });

    if (!currentNote) {
      throw new Error("Note not found");
    }

    // Get the next version number
    const lastVersion = await tx.noteVersion.findFirst({
      where: { noteId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const backupVersion = await tx.noteVersion.create({
      data: {
        noteId,
        tenantId,
        title: currentNote.title,
        content: currentNote.content,
        contentState: currentNote.contentState,
        reason: "restore",
        versionNumber: nextVersionNumber,
        changesSummary: `Backup before restoring version ${versionToRestore.versionNumber}`,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // 2. Restore the old version to the current note
    const updatedNote = await tx.note.update({
      where: { id: noteId },
      data: {
        title: versionToRestore.title,
        content: versionToRestore.content,
        contentState: versionToRestore.contentState,
        updatedBy: userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        noteTags: {
          where: {
            deletedAt: null,
          },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return {
      note: updatedNote,
      backupVersion,
    };
  });
}

/**
 * Compare two versions (optional enhancement for future)
 * Returns a diff summary between two versions
 * 
 * @param versionId1 - First version ID
 * @param versionId2 - Second version ID
 * @param userId - The requesting user ID
 * @param tenantId - The tenant ID
 * @returns Promise with comparison data
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string,
  userId: string,
  tenantId: string | null
) {
  const [version1, version2] = await Promise.all([
    getVersion(versionId1, userId, tenantId),
    getVersion(versionId2, userId, tenantId),
  ]);

  if (version1.noteId !== version2.noteId) {
    throw new Error("Versions belong to different notes");
  }

  // Basic comparison - can be enhanced with proper diff algorithms
  return {
    version1: {
      id: version1.id,
      versionNumber: version1.versionNumber,
      title: version1.title,
      createdAt: version1.createdAt,
    },
    version2: {
      id: version2.id,
      versionNumber: version2.versionNumber,
      title: version2.title,
      createdAt: version2.createdAt,
    },
    changes: {
      titleChanged: version1.title !== version2.title,
      contentChanged: version1.content !== version2.content,
      contentStateChanged: version1.contentState !== version2.contentState,
    },
  };
}


