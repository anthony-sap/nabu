import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserContext, successResponse, handleApiError, errorResponse } from "@/lib/nabu-helpers";
import { z } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Search query schema
 */
const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  limit: z.number().optional().default(20),
  includeNotes: z.boolean().optional().default(true),
  includeThoughts: z.boolean().optional().default(true),
  folderId: z.string().optional(),
  // Hybrid search weights (must sum to 1.0)
  keywordWeight: z.number().min(0).max(1).optional().default(0.4),
  vectorWeight: z.number().min(0).max(1).optional().default(0.6),
});

/**
 * Generate embedding for search query using OpenAI API
 * Matches the same model and dimensions used for note/thought embeddings
 */
async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || "512");
    
    if (!OPENAI_API_KEY) {
      return null;
    }
    
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: query,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Search] OpenAI API error: ${response.status} - ${errorText}`);
      return null; // Gracefully fallback to keyword-only search
    }
    
    const result = await response.json();
    const embedding = result.data[0]?.embedding;
    
    if (!embedding) {
      console.error("[Search] No embedding in OpenAI response");
      return null;
    }
    
    // Validate dimensions match
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      console.error(`[Search] Dimension mismatch: got ${embedding.length}d, expected ${EMBEDDING_DIMENSIONS}d`);
      return null;
    }
    
    return embedding;
  } catch (error) {
    console.error("[Search] Failed to generate query embedding:", error);
    return null; // Gracefully fallback to keyword-only search
  }
}

/**
 * Format vector for PostgreSQL vector type
 */
function formatVectorForPostgres(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * GET /api/nabu/search
 * Hybrid search combining keyword and vector similarity
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, tenantId } = await getUserContext();
    const { searchParams } = new URL(req.url);

    // Parse and validate query parameters
    const validationResult = searchQuerySchema.safeParse({
      q: searchParams.get("q"),
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      includeNotes: searchParams.get("includeNotes") ? searchParams.get("includeNotes") === "true" : undefined,
      includeThoughts: searchParams.get("includeThoughts") ? searchParams.get("includeThoughts") === "true" : undefined,
      folderId: searchParams.get("folderId") || undefined,
      keywordWeight: searchParams.get("keywordWeight") ? parseFloat(searchParams.get("keywordWeight")!) : undefined,
      vectorWeight: searchParams.get("vectorWeight") ? parseFloat(searchParams.get("vectorWeight")!) : undefined,
    });

    if (!validationResult.success) {
      console.error("[Search] Validation error:", validationResult.error.errors);
      return errorResponse(
        validationResult.error.errors[0].message || "Invalid search parameters",
        400
      );
    }

    const { q, limit, includeNotes, includeThoughts, folderId, keywordWeight, vectorWeight } = validationResult.data;

    // Validate weights sum to 1.0
    if (Math.abs((keywordWeight + vectorWeight) - 1.0) > 0.001) {
      return errorResponse("keywordWeight and vectorWeight must sum to 1.0", 400);
    }

    const results: any[] = [];

    // Generate embedding for query (for vector search)
    const queryEmbedding = await generateQueryEmbedding(q);

    const noteFolderFilter = folderId ? Prisma.sql`AND n."folderId" = ${folderId}` : Prisma.empty;

    // Search notes
    if (includeNotes) {
      // Keyword search using PostgreSQL full-text search with tags
      const keywordNotes = await prisma.$queryRaw<any[]>`
        WITH note_tags AS (
          SELECT 
            nt."noteId",
            string_agg(DISTINCT t.name, ' ') as tag_names,
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'color', t.color
              )
            ) FILTER (WHERE t.id IS NOT NULL) as tags
          FROM "NoteTag" nt
          JOIN "Tag" t ON t.id = nt."tagId" AND t."deletedAt" IS NULL
          WHERE nt."deletedAt" IS NULL
          GROUP BY nt."noteId"
        )
        SELECT DISTINCT
          n.id,
          n.title,
          n.content,
          n."folderId",
          n."createdAt",
          n."updatedAt",
          'note' as "entityType",
          COALESCE(nt.tags, '[]'::jsonb) as tags,
          ts_rank(
            to_tsvector('english', 
              n.title || ' ' || 
              n.content || ' ' ||
              COALESCE(nt.tag_names, '')
            ),
            plainto_tsquery('english', ${q})
          ) * 
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM "NoteTag" nt2
              JOIN "Tag" t2 ON t2.id = nt2."tagId"
              WHERE nt2."noteId" = n.id 
                AND nt2."deletedAt" IS NULL
                AND t2."deletedAt" IS NULL
                AND LOWER(t2.name) = LOWER(${q})
            ) THEN 2.0
            ELSE 1.0
          END as "keywordScore"
        FROM "Note" n
        LEFT JOIN note_tags nt ON nt."noteId" = n.id
        WHERE n."userId" = ${userId}
          AND n."tenantId" = ${tenantId}
          AND n."deletedAt" IS NULL
          ${noteFolderFilter}
          AND (
            to_tsvector('english', 
              n.title || ' ' || 
              n.content || ' ' ||
              COALESCE(nt.tag_names, '')
            ) @@ plainto_tsquery('english', ${q})
          )
        ORDER BY "keywordScore" DESC
        LIMIT ${limit}
      `;
      
      // Vector search (if embedding generated)
      let vectorNotes: any[] = [];
      if (queryEmbedding) {
        const vectorString = formatVectorForPostgres(queryEmbedding);
        
        vectorNotes = await prisma.$queryRaw<any[]>`
          SELECT DISTINCT
            n.id,
            n.title,
            n.content,
            n."folderId",
            n."createdAt",
            n."updatedAt",
            'note' as "entityType",
            nc."chunkIndex",
            nc.content as "chunkContent",
            (1 - (nc.embedding <=> ${vectorString}::vector)) as "vectorScore"
          FROM "NoteChunk" nc
          JOIN "Note" n ON nc."noteId" = n.id
          WHERE n."userId" = ${userId}
            AND n."tenantId" = ${tenantId}
            AND n."deletedAt" IS NULL
            AND nc."deletedAt" IS NULL
          ${noteFolderFilter}
            AND nc.embedding IS NOT NULL
          ORDER BY "vectorScore" DESC
          LIMIT ${limit}
        `;
        
      }

      // Merge and score results
      const notesMap = new Map<string, any>();

      // Add keyword results
      keywordNotes.forEach((note) => {
        notesMap.set(note.id, {
          ...note,
          keywordScore: parseFloat(note.keywordScore) || 0,
          vectorScore: 0,
          combinedScore: parseFloat(note.keywordScore) * keywordWeight || 0,
        });
      });

      // Add/merge vector results
      vectorNotes.forEach((note) => {
        const existing = notesMap.get(note.id);
        const vectorScore = parseFloat(note.vectorScore) || 0;

        if (existing) {
          // Merge: take best vector score if multiple chunks match
          existing.vectorScore = Math.max(existing.vectorScore, vectorScore);
          existing.combinedScore = (existing.keywordScore * keywordWeight) + (existing.vectorScore * vectorWeight);
          if (!existing.matchedChunk && note.chunkContent) {
            existing.matchedChunk = {
              chunkIndex: note.chunkIndex,
              content: note.chunkContent,
            };
          }
        } else {
          // New result from vector search only
          notesMap.set(note.id, {
            ...note,
            keywordScore: 0,
            vectorScore,
            combinedScore: vectorScore * vectorWeight,
            matchedChunk: note.chunkContent ? {
              chunkIndex: note.chunkIndex,
              content: note.chunkContent,
            } : undefined,
          });
        }
      });

      // Convert to array and sort by combined score
      const notesResults = Array.from(notesMap.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

      results.push(...notesResults);
    }

    // Search thoughts (similar logic)
    if (includeThoughts) {
      // Keyword search with suggestedTags
      const keywordThoughts = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT
          t.id,
          t.content,
          t."noteId",
          t."createdAt",
          t."updatedAt",
          t."suggestedTags",
          'thought' as "entityType",
          ts_rank(
            to_tsvector('english', 
              t.content || ' ' ||
              array_to_string(t."suggestedTags", ' ')
            ),
            plainto_tsquery('english', ${q})
          ) * 
          CASE 
            WHEN ${q} = ANY(t."suggestedTags") THEN 2.0
            ELSE 1.0
          END as "keywordScore"
        FROM "Thought" t
        WHERE t."userId" = ${userId}
          AND t."tenantId" = ${tenantId}
          AND t."deletedAt" IS NULL
          AND (
            to_tsvector('english', 
              t.content || ' ' ||
              array_to_string(t."suggestedTags", ' ')
            ) @@ plainto_tsquery('english', ${q})
          )
        ORDER BY "keywordScore" DESC
        LIMIT ${limit}
      `;

      // Vector search
      let vectorThoughts: any[] = [];
      if (queryEmbedding) {
        const vectorString = formatVectorForPostgres(queryEmbedding);
        vectorThoughts = await prisma.$queryRaw<any[]>`
          SELECT DISTINCT
            t.id,
            t.content,
            t."noteId",
            t."createdAt",
            t."updatedAt",
            'thought' as "entityType",
            tc."chunkIndex",
            tc.content as "chunkContent",
            (1 - (tc.embedding <=> ${vectorString}::vector)) as "vectorScore"
          FROM "ThoughtChunk" tc
          JOIN "Thought" t ON tc."thoughtId" = t.id
          WHERE t."userId" = ${userId}
            AND t."tenantId" = ${tenantId}
            AND t."deletedAt" IS NULL
            AND tc.embedding IS NOT NULL
          ORDER BY "vectorScore" DESC
          LIMIT ${limit}
        `;
      }

      // Merge and score results
      const thoughtsMap = new Map<string, any>();

      keywordThoughts.forEach((thought) => {
        thoughtsMap.set(thought.id, {
          ...thought,
          keywordScore: parseFloat(thought.keywordScore) || 0,
          vectorScore: 0,
          combinedScore: parseFloat(thought.keywordScore) * keywordWeight || 0,
        });
      });

      vectorThoughts.forEach((thought) => {
        const existing = thoughtsMap.get(thought.id);
        const vectorScore = parseFloat(thought.vectorScore) || 0;

        if (existing) {
          existing.vectorScore = Math.max(existing.vectorScore, vectorScore);
          existing.combinedScore = (existing.keywordScore * keywordWeight) + (existing.vectorScore * vectorWeight);
          if (!existing.matchedChunk && thought.chunkContent) {
            existing.matchedChunk = {
              chunkIndex: thought.chunkIndex,
              content: thought.chunkContent,
            };
          }
        } else {
          thoughtsMap.set(thought.id, {
            ...thought,
            keywordScore: 0,
            vectorScore,
            combinedScore: vectorScore * vectorWeight,
            matchedChunk: thought.chunkContent ? {
              chunkIndex: thought.chunkIndex,
              content: thought.chunkContent,
            } : undefined,
          });
        }
      });

      const thoughtsResults = Array.from(thoughtsMap.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

      results.push(...thoughtsResults);
    }

    // Sort all results by combined score
    results.sort((a, b) => b.combinedScore - a.combinedScore);

    // Limit final results
    const finalResults = results.slice(0, limit);

    return new Response(
      JSON.stringify(
        successResponse(
          {
            query: q,
            results: finalResults,
            count: finalResults.length,
            weights: {
              keyword: keywordWeight,
              vector: vectorWeight,
            },
            hasVectorSearch: queryEmbedding !== null,
          },
          "Search completed successfully"
        )
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== SEARCH ERROR ===", error);
    return handleApiError(error);
  }
}

