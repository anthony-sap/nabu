/**
 * Bulk Folder Suggestions for Auto-Move
 * 
 * Analyzes multiple uncategorised notes at once and suggests:
 * - Which notes should go to existing folders
 * - Which notes should be grouped into new folders
 * 
 * Uses semantic search with embeddings for intelligent clustering
 */

import { prisma } from "@/lib/db";

/**
 * Bulk auto-move suggestions structure
 */
export interface BulkAutoMoveSuggestions {
  suggestions: {
    existingFolders: Array<{
      folderId: string;
      folderName: string;
      noteIds: string[];
      confidence: number;
    }>;
    newFolders: Array<{
      suggestedName: string;
      noteIds: string[];
      confidence: number;
      color?: string;
    }>;
  };
  analysis: {
    totalNotes: number;
    toExisting: number;
    toNew: number;
  };
}

/**
 * Confidence threshold for suggesting existing folders
 */
const EXISTING_FOLDER_THRESHOLD = 60;

/**
 * Maximum number of notes to process in one batch
 */
const MAX_NOTES_PER_BATCH = 50;

/**
 * Minimum cluster size for suggesting new folders
 */
const MIN_CLUSTER_SIZE = 2;

/**
 * Analyzes multiple notes and suggests folder destinations
 * 
 * @param noteIds - Array of note IDs to analyze
 * @param userId - User ID for security
 * @param tenantId - Tenant ID for multi-tenancy
 * @returns Bulk suggestions grouped by destination
 */
export async function analyzeBulkFolderSuggestions(
  noteIds: string[],
  userId: string,
  tenantId: string
): Promise<BulkAutoMoveSuggestions> {
  // Validate input
  if (noteIds.length === 0) {
    throw new Error("No notes provided");
  }

  if (noteIds.length > MAX_NOTES_PER_BATCH) {
    throw new Error(`Cannot process more than ${MAX_NOTES_PER_BATCH} notes at once`);
  }

  // Fetch all notes with their chunks
  // Note: Can't filter embedding in where clause (Unsupported type), so fetch all chunks
  const notes = await prisma.note.findMany({
    where: {
      id: { in: noteIds },
      userId,
      tenantId,
      deletedAt: null,
      folderId: null, // Should all be uncategorised
    },
    include: {
      chunks: {
        orderBy: {
          chunkIndex: 'asc',
        },
      },
    },
  });

  if (notes.length === 0) {
    throw new Error("No valid notes found");
  }

  // Get user's existing folders for matching
  const existingFolders = await prisma.folder.findMany({
    where: {
      userId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  // Track suggestions
  const existingFolderSuggestions = new Map<string, {
    folderId: string;
    folderName: string;
    noteIds: string[];
    totalConfidence: number;
    count: number;
  }>();

  const unmatchedNotes: Array<{
    noteId: string;
    title: string;
    embedding: any;
  }> = [];

  // Process each note to find best existing folder match
  for (const note of notes) {
    // Find first chunk with embedding (filter in JS since embedding is Unsupported type)
    const chunkWithEmbedding = note.chunks?.find(chunk => chunk.embedding !== null);
    
    // Skip notes without embeddings
    if (!chunkWithEmbedding || !chunkWithEmbedding.embedding) {
      unmatchedNotes.push({
        noteId: note.id,
        title: note.title,
        embedding: null,
      });
      continue;
    }

    // Find similar notes using semantic search
    const similarNotes = await prisma.$queryRaw<Array<{
      note_id: string;
      folder_id: string | null;
      folder_name: string | null;
      similarity: number;
    }>>`
      SELECT 
        n.id as note_id,
        f.id as folder_id,
        f.name as folder_name,
        1 - (nc.embedding <=> ${chunkWithEmbedding.embedding}::vector) as similarity
      FROM "NoteChunk" nc
      INNER JOIN "Note" n ON n.id = nc."noteId"
      LEFT JOIN "Folder" f ON f.id = n."folderId"
      WHERE nc."tenantId" = ${tenantId}
        AND nc."noteId" != ${note.id}
        AND nc.embedding IS NOT NULL
        AND n."deletedAt" IS NULL
        AND n."folderId" IS NOT NULL
      ORDER BY nc.embedding <=> ${chunkWithEmbedding.embedding}::vector
      LIMIT 10
    `;

    // Analyze folder patterns
    const folderCounts = new Map<string, {
      count: number;
      totalSimilarity: number;
    }>();

    for (const simNote of similarNotes) {
      if (simNote.folder_id && simNote.folder_name) {
        const existing = folderCounts.get(simNote.folder_id);
        if (existing) {
          existing.count++;
          existing.totalSimilarity += simNote.similarity;
        } else {
          folderCounts.set(simNote.folder_id, {
            count: 1,
            totalSimilarity: simNote.similarity,
          });
        }
      }
    }

    // Calculate best match
    let bestMatch: { folderId: string; folderName: string; confidence: number } | null = null;

    for (const [folderId, stats] of folderCounts.entries()) {
      const folderName = similarNotes.find(n => n.folder_id === folderId)?.folder_name;
      if (!folderName) continue;

      // Confidence = frequency (40%) + similarity (60%)
      const frequencyScore = (stats.count / similarNotes.length) * 40;
      const similarityScore = (stats.totalSimilarity / stats.count) * 60;
      const confidence = frequencyScore + similarityScore;

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { folderId, folderName, confidence };
      }
    }

    // If good match found, add to existing folder suggestions
    if (bestMatch && bestMatch.confidence >= EXISTING_FOLDER_THRESHOLD) {
      const existing = existingFolderSuggestions.get(bestMatch.folderId);
      if (existing) {
        existing.noteIds.push(note.id);
        existing.totalConfidence += bestMatch.confidence;
        existing.count++;
      } else {
        existingFolderSuggestions.set(bestMatch.folderId, {
          folderId: bestMatch.folderId,
          folderName: bestMatch.folderName,
          noteIds: [note.id],
          totalConfidence: bestMatch.confidence,
          count: 1,
        });
      }
    } else {
      // No good match - add to unmatched for clustering
      unmatchedNotes.push({
        noteId: note.id,
        title: note.title,
        embedding: chunkWithEmbedding.embedding,
      });
    }
  }

  // Format existing folder suggestions
  const existingFolderResults = Array.from(existingFolderSuggestions.values()).map(folder => ({
    folderId: folder.folderId,
    folderName: folder.folderName,
    noteIds: folder.noteIds,
    confidence: Math.round(folder.totalConfidence / folder.count),
  }));

  // Cluster unmatched notes and suggest new folders
  const newFolderResults = await clusterAndSuggestNewFolders(unmatchedNotes);

  return {
    suggestions: {
      existingFolders: existingFolderResults,
      newFolders: newFolderResults,
    },
    analysis: {
      totalNotes: noteIds.length,
      toExisting: existingFolderResults.reduce((sum, f) => sum + f.noteIds.length, 0),
      toNew: newFolderResults.reduce((sum, f) => sum + f.noteIds.length, 0),
    },
  };
}

/**
 * Cluster unmatched notes by similarity and suggest new folder names
 */
async function clusterAndSuggestNewFolders(
  notes: Array<{ noteId: string; title: string; embedding: any }>
): Promise<Array<{
  suggestedName: string;
  noteIds: string[];
  confidence: number;
  color?: string;
}>> {
  // If no notes or very few, group them all together
  if (notes.length === 0) {
    return [];
  }

  if (notes.length < MIN_CLUSTER_SIZE) {
    return [{
      suggestedName: "General",
      noteIds: notes.map(n => n.noteId),
      confidence: 50,
      color: "#00B3A6",
    }];
  }

  // For notes without embeddings, use simple clustering by title keywords
  const notesWithoutEmbeddings = notes.filter(n => !n.embedding);
  const notesWithEmbeddings = notes.filter(n => n.embedding);

  const clusters: Array<{
    suggestedName: string;
    noteIds: string[];
    confidence: number;
    color?: string;
  }> = [];

  // Simple keyword-based clustering for notes without embeddings
  if (notesWithoutEmbeddings.length > 0) {
    const keywordClusters = clusterByKeywords(notesWithoutEmbeddings);
    clusters.push(...keywordClusters);
  }

  // TODO: Implement embedding-based clustering for notes with embeddings
  // For now, group them all together
  if (notesWithEmbeddings.length >= MIN_CLUSTER_SIZE) {
    clusters.push({
      suggestedName: "General",
      noteIds: notesWithEmbeddings.map(n => n.noteId),
      confidence: 60,
      color: "#00B3A6",
    });
  } else if (notesWithEmbeddings.length > 0) {
    // Add to first cluster or create new one
    if (clusters.length > 0) {
      clusters[0].noteIds.push(...notesWithEmbeddings.map(n => n.noteId));
    } else {
      clusters.push({
        suggestedName: "General",
        noteIds: notesWithEmbeddings.map(n => n.noteId),
        confidence: 50,
      });
    }
  }

  return clusters;
}

/**
 * Simple keyword-based clustering for notes without embeddings
 */
function clusterByKeywords(
  notes: Array<{ noteId: string; title: string; embedding: any }>
): Array<{
  suggestedName: string;
  noteIds: string[];
  confidence: number;
  color?: string;
}> {
  // Theme detection patterns
  const themes = {
    'Work': /\b(work|project|meeting|client|business|task|deadline|office)\b/i,
    'Personal': /\b(personal|family|home|life|diary|journal|private)\b/i,
    'Research': /\b(research|study|learn|article|paper|analysis|reading)\b/i,
    'Ideas': /\b(idea|brainstorm|concept|thought|inspiration|creative)\b/i,
    'Planning': /\b(plan|strategy|goal|roadmap|future|schedule)\b/i,
  };

  const clusters = new Map<string, string[]>();

  // Classify each note by theme
  for (const note of notes) {
    const titleLower = note.title.toLowerCase();
    let matched = false;

    for (const [theme, pattern] of Object.entries(themes)) {
      if (pattern.test(titleLower)) {
        const existing = clusters.get(theme);
        if (existing) {
          existing.push(note.noteId);
        } else {
          clusters.set(theme, [note.noteId]);
        }
        matched = true;
        break;
      }
    }

    // If no theme matched, add to General
    if (!matched) {
      const existing = clusters.get('General');
      if (existing) {
        existing.push(note.noteId);
      } else {
        clusters.set('General', [note.noteId]);
      }
    }
  }

  // Convert to result format, filtering out small clusters
  return Array.from(clusters.entries())
    .filter(([_, noteIds]) => noteIds.length >= MIN_CLUSTER_SIZE)
    .map(([theme, noteIds]) => ({
      suggestedName: theme,
      noteIds,
      confidence: 65, // Moderate confidence for keyword matching
      color: getThemeColor(theme),
    }));
}

/**
 * Get color for theme-based folder
 */
function getThemeColor(theme: string): string {
  const colors: Record<string, string> = {
    'Work': '#3B82F6',      // Blue
    'Personal': '#EC4899',  // Pink
    'Research': '#8B5CF6',  // Purple
    'Ideas': '#F59E0B',     // Amber
    'Planning': '#10B981',  // Green
    'General': '#6B7280',   // Gray
  };

  return colors[theme] || '#00B3A6'; // Default mint
}

