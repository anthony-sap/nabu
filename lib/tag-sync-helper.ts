import { prisma } from "@/lib/db";
import { extractHashtags } from "./hashtag-parser";

/**
 * Sync hashtags from content to note tags
 * Only adds missing tags - doesn't remove existing ones
 * 
 * This is a fallback mechanism for when the mention plugin doesn't capture tags
 * (e.g., user presses escape, pastes content, keyboard shortcuts)
 * 
 * @param noteId - The ID of the note to sync tags to
 * @param content - The text content to parse for hashtags
 * @param userId - The ID of the user performing the action
 * @param tenantId - The tenant ID for multi-tenancy
 */
export async function syncContentHashtagsToNote(
  noteId: string,
  content: string,
  userId: string,
  tenantId: string | null
): Promise<void> {
  // Extract hashtags from content
  const hashtags = extractHashtags(content);
  
  if (hashtags.length === 0) return;
  
  // Get existing note tags
  const existingNoteTags = await prisma.noteTag.findMany({
    where: {
      noteId,
      deletedAt: null,
    },
    include: {
      tag: {
        select: {
          name: true,
        },
      },
    },
  });
  
  const existingTagNames = new Set(
    existingNoteTags.map(nt => nt.tag.name.toLowerCase())
  );
  
  // Find new hashtags not yet in database
  const newHashtags = hashtags.filter(tag => !existingTagNames.has(tag));
  
  if (newHashtags.length === 0) return;
  
  // Process each new hashtag
  for (const tagName of newHashtags) {
    // Find or create tag
    let tag = await prisma.tag.findFirst({
      where: {
        name: tagName,
        userId,
        tenantId,
        deletedAt: null,
      },
    });
    
    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          name: tagName,
          userId,
          tenantId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
    
    // Check for existing NoteTag (active or soft-deleted)
    const existingLink = await prisma.noteTag.findUnique({
      where: {
        noteId_tagId: {
          noteId,
          tagId: tag.id,
        },
      },
    });
    
    if (existingLink && existingLink.deletedAt) {
      // Restore soft-deleted link
      await prisma.noteTag.update({
        where: {
          noteId_tagId: {
            noteId,
            tagId: tag.id,
          },
        },
        data: {
          deletedAt: null,
          source: "USER_ADDED",
          updatedBy: userId,
        },
      });
    } else if (!existingLink) {
      // Create new link
      await prisma.noteTag.create({
        data: {
          noteId,
          tagId: tag.id,
          source: "USER_ADDED",
          tenantId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
    // If existingLink is active, skip (already linked)
  }
}

