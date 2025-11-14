/**
 * AI Folder Suggestion System
 * 
 * Uses semantic search with embeddings to find similar notes,
 * analyzes their folder patterns, and suggests:
 * - Existing folders (if good match found, confidence > 60%)
 * - New folder name (if no good match)
 * 
 * Integrates with existing embedding system
 */

import { prisma } from "@/lib/db";

/**
 * Folder suggestion result
 */
export interface FolderSuggestion {
  type: 'existing' | 'new';
  suggestions: Array<{
    folderId?: string;      // For existing folders
    folderName: string;      // Display name
    confidence: number;      // 0-100
    reason: string;          // Why this was suggested
  }>;
  similarNotes?: Array<{    // Context from semantic search
    id: string;
    title: string;
    folderId: string | null;
    folderName: string | null;
    similarity: number;
  }>;
}

/**
 * Minimum confidence threshold for suggesting existing folders
 */
const CONFIDENCE_THRESHOLD = 60;

/**
 * Maximum number of similar notes to analyze
 */
const MAX_SIMILAR_NOTES = 10;

/**
 * Suggests folders for a note based on content analysis and semantic search
 * 
 * Strategy:
 * 1. Find similar notes using embedding vector search
 * 2. Analyze folder patterns from similar notes
 * 3. If strong pattern exists (>60% confidence), suggest existing folders
 * 4. Otherwise, use AI to suggest a new folder name
 * 
 * @param noteId - The note ID to suggest folders for
 * @param userId - User ID (for security and folder lookup)
 * @param tenantId - Tenant ID (for multi-tenancy)
 * @returns Folder suggestions with confidence scores
 */
export async function suggestFolders(
  noteId: string,
  userId: string,
  tenantId: string
): Promise<FolderSuggestion> {
  try {
    // Get the note with its content and chunks
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null,
      },
      include: {
        chunks: {
          where: {
            embedding: { not: null },
          },
          orderBy: {
            chunkIndex: 'asc',
          },
          take: 1, // Just need one chunk with embedding for search
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error("Note not found");
    }

    // If note already has a folder, no suggestion needed
    if (note.folder) {
      return {
        type: 'existing',
        suggestions: [{
          folderId: note.folder.id,
          folderName: note.folder.name,
          confidence: 100,
          reason: "Note already has a folder assigned",
        }],
      };
    }

    // Check if note has embeddings for semantic search
    if (!note.chunks || note.chunks.length === 0 || !note.chunks[0].embedding) {
      // Fallback: suggest based on folders only
      return await suggestFoldersWithoutEmbeddings(userId, tenantId, note.title);
    }

    // Perform semantic search using the note's embedding
    // Using pgvector's <=> operator for cosine distance
    const similarNotes = await prisma.$queryRaw<Array<{
      note_id: string;
      note_title: string;
      folder_id: string | null;
      folder_name: string | null;
      similarity: number;
    }>>`
      SELECT 
        n.id as note_id,
        n.title as note_title,
        f.id as folder_id,
        f.name as folder_name,
        1 - (nc.embedding <=> ${note.chunks[0].embedding}::vector) as similarity
      FROM "NoteChunk" nc
      INNER JOIN "Note" n ON n.id = nc."noteId"
      LEFT JOIN "Folder" f ON f.id = n."folderId"
      WHERE nc."tenantId" = ${tenantId}
        AND nc."noteId" != ${noteId}
        AND nc.embedding IS NOT NULL
        AND n."deletedAt" IS NULL
        AND n."folderId" IS NOT NULL
      ORDER BY nc.embedding <=> ${note.chunks[0].embedding}::vector
      LIMIT ${MAX_SIMILAR_NOTES}
    `;

    // Analyze folder patterns from similar notes
    const folderCounts = new Map<string, {
      count: number;
      folderId: string;
      folderName: string;
      totalSimilarity: number;
      notes: string[];
    }>();

    for (const simNote of similarNotes) {
      if (simNote.folder_id && simNote.folder_name) {
        const existing = folderCounts.get(simNote.folder_id);
        if (existing) {
          existing.count++;
          existing.totalSimilarity += simNote.similarity;
          existing.notes.push(simNote.note_title);
        } else {
          folderCounts.set(simNote.folder_id, {
            count: 1,
            folderId: simNote.folder_id,
            folderName: simNote.folder_name,
            totalSimilarity: simNote.similarity,
            notes: [simNote.note_title],
          });
        }
      }
    }

    // Calculate confidence for each folder
    const folderSuggestions = Array.from(folderCounts.values())
      .map(folder => {
        // Confidence based on:
        // - Frequency of folder in similar notes (40%)
        // - Average similarity of notes in that folder (60%)
        const frequencyScore = (folder.count / similarNotes.length) * 40;
        const similarityScore = (folder.totalSimilarity / folder.count) * 60;
        const confidence = Math.round(frequencyScore + similarityScore);

        return {
          folderId: folder.folderId,
          folderName: folder.folderName,
          confidence,
          reason: `${folder.count} similar note${folder.count > 1 ? 's' : ''} in this folder`,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    // If we have high-confidence existing folder suggestions
    if (folderSuggestions.length > 0 && folderSuggestions[0].confidence >= CONFIDENCE_THRESHOLD) {
      return {
        type: 'existing',
        suggestions: folderSuggestions.slice(0, 3), // Top 3
        similarNotes: similarNotes.map(n => ({
          id: n.note_id,
          title: n.note_title,
          folderId: n.folder_id,
          folderName: n.folder_name,
          similarity: n.similarity,
        })),
      };
    }

    // No strong match found - suggest creating a new folder
    // Use AI to generate folder name based on note content and similar notes context
    const newFolderName = await generateNewFolderName(
      note.title,
      note.content,
      similarNotes.map(n => n.note_title)
    );

    return {
      type: 'new',
      suggestions: [{
        folderName: newFolderName,
        confidence: 70, // Moderate confidence for new suggestions
        reason: "No strong match found in existing folders",
      }],
      similarNotes: similarNotes.map(n => ({
        id: n.note_id,
        title: n.note_title,
        folderId: n.folder_id,
        folderName: n.folder_name,
        similarity: n.similarity,
      })),
    };
  } catch (error) {
    console.error("Error generating folder suggestions:", error);
    throw error;
  }
}

/**
 * Fallback: suggest folders without embeddings (heuristic approach)
 */
async function suggestFoldersWithoutEmbeddings(
  userId: string,
  tenantId: string,
  noteTitle: string
): Promise<FolderSuggestion> {
  // Get user's existing folders
  const folders = await prisma.folder.findMany({
    where: {
      userId,
      tenantId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          notes: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  if (folders.length === 0) {
    // No folders exist - suggest creating one
    return {
      type: 'new',
      suggestions: [{
        folderName: "General",
        confidence: 50,
        reason: "No folders exist yet",
      }],
    };
  }

  // Simple keyword matching with folder names
  const titleLower = noteTitle.toLowerCase();
  const matches = folders
    .map(folder => {
      const folderLower = folder.name.toLowerCase();
      const words = titleLower.split(/\s+/);
      const matchScore = words.filter(word => folderLower.includes(word) || word.includes(folderLower)).length;
      
      return {
        folderId: folder.id,
        folderName: folder.name,
        confidence: Math.min(matchScore * 20, 80), // Cap at 80%
        reason: matchScore > 0 ? "Title keywords match folder name" : "Popular folder",
      };
    })
    .filter(m => m.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  if (matches.length > 0) {
    return {
      type: 'existing',
      suggestions: matches.slice(0, 3),
    };
  }

  // No matches - suggest most used folder
  const mostUsedFolder = folders.sort((a, b) => b._count.notes - a._count.notes)[0];
  
  return {
    type: 'existing',
    suggestions: [{
      folderId: mostUsedFolder.id,
      folderName: mostUsedFolder.name,
      confidence: 40,
      reason: "Most frequently used folder",
    }],
  };
}

/**
 * Generate a new folder name using AI based on note content
 * 
 * This would ideally use OpenAI API, but for now we'll use heuristics
 * TODO: Integrate with OpenAI when API key is available
 */
async function generateNewFolderName(
  title: string,
  content: string,
  similarNoteTitles: string[]
): Promise<string> {
  // Extract key themes from title and content
  const text = `${title} ${content}`.toLowerCase();
  
  // Common theme keywords
  const themes = {
    'work': /\b(work|project|meeting|client|business|task|deadline)\b/,
    'personal': /\b(personal|family|home|life|diary|journal)\b/,
    'research': /\b(research|study|learn|article|paper|analysis)\b/,
    'ideas': /\b(idea|brainstorm|concept|thought|inspiration)\b/,
    'planning': /\b(plan|strategy|goal|roadmap|future)\b/,
  };

  // Find matching themes
  for (const [theme, pattern] of Object.entries(themes)) {
    if (pattern.test(text)) {
      // Capitalize first letter
      return theme.charAt(0).toUpperCase() + theme.slice(1);
    }
  }

  // Check similar note titles for patterns
  if (similarNoteTitles.length > 0) {
    // Extract common words from similar notes
    const words = similarNoteTitles
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4); // Only meaningful words

    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Find most common word
    const mostCommon = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommon && mostCommon[1] >= 2) {
      const folderName = mostCommon[0].charAt(0).toUpperCase() + mostCommon[0].slice(1);
      return folderName;
    }
  }

  // Default fallback
  return "General";
}

