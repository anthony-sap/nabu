/**
 * Process Pending Embeddings Edge Function (Standalone)
 * 
 * This function is called by pg_cron every 5 minutes to generate embeddings
 * for notes that have been edited but haven't had embeddings generated yet.
 * 
 * It implements a 2-minute cooldown to batch embedding generation:
 * - Finds notes where updatedAt > 2 minutes ago
 * - AND (lastEmbeddingGeneratedAt IS NULL OR lastEmbeddingGeneratedAt < updatedAt)
 * - Creates chunks and embedding jobs directly
 * - Updates lastEmbeddingGeneratedAt timestamp
 * 
 * This prevents excessive embedding generation during active editing sessions.
 * 
 * STANDALONE: Does not require calling Next.js API - all logic is self-contained.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { init } from "https://esm.sh/@paralleldrive/cuid2@2.2.2";

// Initialize CUID generator
const createId = init({ length: 25 });

// CORS headers for the response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Embedding configuration
const EMBEDDING_CONFIG = {
  CHUNK_SIZE: 2000,
  CHUNK_OVERLAP: 200,
  MIN_CHUNK_SIZE: 100,
  MODEL: "text-embedding-3-small",
  DIMENSIONS: 512,
};

interface Note {
  id: string;
  tenantId: string | null;
  userId: string;
  title: string;
  content: string;
  contentState: string | null;
  updatedAt: string;
  lastEmbeddingGeneratedAt: string | null;
}

/**
 * Split text into overlapping chunks for embedding
 */
function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmedText = text.trim();
  if (trimmedText.length <= EMBEDDING_CONFIG.CHUNK_SIZE) {
    return [trimmedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < trimmedText.length) {
    let endIndex = startIndex + EMBEDDING_CONFIG.CHUNK_SIZE;

    // Try to break at sentence or word boundary
    if (endIndex < trimmedText.length) {
      const sentenceMatch = trimmedText
        .slice(Math.max(endIndex - 100, startIndex), endIndex)
        .match(/[.!?]\s/g);

      if (sentenceMatch) {
        const lastSentenceIndex = trimmedText.lastIndexOf(
          sentenceMatch[sentenceMatch.length - 1],
          endIndex
        );
        if (lastSentenceIndex > startIndex) {
          endIndex = lastSentenceIndex + 2;
        }
      } else {
        const lastSpaceIndex = trimmedText.lastIndexOf(" ", endIndex);
        if (lastSpaceIndex > startIndex) {
          endIndex = lastSpaceIndex;
        }
      }
    }

    const chunk = trimmedText.slice(startIndex, endIndex).trim();

    if (chunk.length >= EMBEDDING_CONFIG.MIN_CHUNK_SIZE) {
      chunks.push(chunk);
    }

    if (endIndex >= trimmedText.length) {
      break;
    }
    startIndex = endIndex - EMBEDDING_CONFIG.CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Extract plain text from Lexical editor state or HTML
 */
function extractTextContent(contentState: string | null): string {
  if (!contentState) {
    return "";
  }

  try {
    const parsed = JSON.parse(contentState);

    if (parsed.root && Array.isArray(parsed.root.children)) {
      return extractTextFromLexicalNodes(parsed.root.children);
    }

    return contentState;
  } catch {
    return stripHtml(contentState);
  }
}

/**
 * Recursively extract text from Lexical nodes
 */
function extractTextFromLexicalNodes(nodes: any[]): string {
  let text = "";

  for (const node of nodes) {
    if (node.type === "text" && node.text) {
      text += node.text;
    } else if (node.type === "linebreak") {
      text += "\n";
    } else if (Array.isArray(node.children)) {
      text += extractTextFromLexicalNodes(node.children);
    }

    if (node.type === "paragraph" || node.type === "heading") {
      text += "\n\n";
    }
  }

  return text.trim();
}

/**
 * Strip HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prepare content for embedding
 */
function prepareNoteContent(title: string, content: string): string {
  const titleText = title.trim();
  const contentText = content.trim();

  if (!contentText) {
    return titleText;
  }

  if (!titleText) {
    return contentText;
  }

  return `${titleText}\n\n${contentText}`;
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== PROCESS PENDING EMBEDDINGS STARTED ===");
    const startTime = Date.now();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment variables:");
    console.log(`  SUPABASE_URL: ${supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "MISSING"}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? `SET (length: ${supabaseServiceKey.length})` : "MISSING"}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate timestamp for 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    console.log(`Looking for notes updated before: ${twoMinutesAgo}`);

    // Query for notes that need embeddings
    const { data: notes, error: queryError } = await supabase
      .from("Note")
      .select("id, tenantId, userId, title, content, contentState, updatedAt, lastEmbeddingGeneratedAt")
      .lt("updatedAt", twoMinutesAgo)
      .is("deletedAt", null)
      .limit(100);

    if (queryError) {
      console.error("Error querying notes:", queryError);
      throw queryError;
    }

    console.log(`Found ${notes?.length || 0} candidate notes from database`);

    // Filter notes in JavaScript
    const notesNeedingEmbeddings = (notes ?? []).filter((note) => {
      if (!note.lastEmbeddingGeneratedAt) {
        return true;
      }
      const lastEmbeddingTime = new Date(note.lastEmbeddingGeneratedAt).getTime();
      const lastUpdateTime = new Date(note.updatedAt).getTime();
      return lastEmbeddingTime < lastUpdateTime;
    }).slice(0, 50);

    console.log(`${notesNeedingEmbeddings.length} notes need embeddings after filtering`);

    if (notesNeedingEmbeddings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No notes need embeddings",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Process each note
    let successCount = 0;
    let errorCount = 0;

    for (const note of notesNeedingEmbeddings as Note[]) {
      try {
        console.log(`\nProcessing note ${note.id}...`);
        console.log(`  Title: ${note.title.substring(0, 50)}${note.title.length > 50 ? "..." : ""}`);
        console.log(`  Updated: ${note.updatedAt}`);
        console.log(`  Last embedding: ${note.lastEmbeddingGeneratedAt || "never"}`);

        // Extract plain text
        const plainTextContent = note.contentState
          ? extractTextContent(note.contentState)
          : stripHtml(note.content);

        console.log(`  Extracted ${plainTextContent.length} chars of plain text`);

        // Prepare full content
        const fullContent = prepareNoteContent(note.title, plainTextContent);
        console.log(`  Full content length: ${fullContent.length} chars (min: ${EMBEDDING_CONFIG.MIN_CHUNK_SIZE})`);

        // Check minimum length
        if (fullContent.length < EMBEDDING_CONFIG.MIN_CHUNK_SIZE) {
          console.log(`  Content too short, skipping`);
          continue;
        }

        // Chunk the content
        const chunks = chunkText(fullContent);
        console.log(`  Split into ${chunks.length} chunks`);

        if (chunks.length === 0) {
          console.log(`  No chunks generated, skipping`);
          continue;
        }

        // Delete existing chunks for this note
        const { error: deleteChunksError } = await supabase
          .from("NoteChunk")
          .delete()
          .eq("noteId", note.id);

        if (deleteChunksError) {
          console.error(`  Error deleting existing chunks:`, deleteChunksError);
        } else {
          console.log(`  Deleted existing chunks`);
        }

        // Delete pending embedding jobs for this note
        const { error: deleteJobsError } = await supabase
          .from("EmbeddingJob")
          .delete()
          .eq("entityType", "NOTE")
          .eq("entityId", note.id)
          .in("status", ["PENDING", "PROCESSING"]);

        if (deleteJobsError) {
          console.error(`  Error deleting existing jobs:`, deleteJobsError);
        } else {
          console.log(`  Deleted pending jobs`);
        }

        // Create new chunks and jobs
        const now = new Date().toISOString();
        
        for (let i = 0; i < chunks.length; i++) {
          // Generate IDs
          const chunkId = createId();
          const jobId = createId();

          // Create chunk
          const { data: chunk, error: chunkError } = await supabase
            .from("NoteChunk")
            .insert({
              id: chunkId,
              noteId: note.id,
              tenantId: note.tenantId || "",
              chunkIndex: i,
              content: chunks[i],
              createdAt: now,
              updatedAt: now,
            })
            .select()
            .single();

          if (chunkError || !chunk) {
            console.error(`  Error creating chunk ${i}:`, chunkError);
            continue;
          }

          console.log(`  Created chunk ${i}/${chunks.length} (ID: ${chunk.id}, ${chunks[i].length} chars)`);

          // Create embedding job
          const { data: job, error: jobError } = await supabase
            .from("EmbeddingJob")
            .insert({
              id: jobId,
              tenantId: note.tenantId,
              userId: note.userId,
              entityType: "NOTE",
              entityId: note.id,
              chunkId: chunk.id,
              chunkIndex: i,
              content: chunks[i],
              status: "PENDING",
              createdBy: note.userId,
              createdAt: now,
              updatedAt: now,
            })
            .select()
            .single();

          if (jobError || !job) {
            console.error(`  Error creating job ${i}:`, jobError);
            continue;
          }

          console.log(`  Created embedding job ${job.id} for chunk ${i}`);
        }

        // Update lastEmbeddingGeneratedAt
        const updateTimestamp = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("Note")
          .update({ lastEmbeddingGeneratedAt: updateTimestamp })
          .eq("id", note.id);

        if (updateError) {
          console.error(`  Failed to update lastEmbeddingGeneratedAt:`, updateError);
        } else {
          console.log(`  Updated lastEmbeddingGeneratedAt to: ${updateTimestamp}`);
        }

        successCount++;
        console.log(`✓ Successfully processed note ${note.id}`);
      } catch (error) {
        console.error(`❌ Error processing note ${note.id}:`, error);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n=== PROCESS PENDING EMBEDDINGS COMPLETED ===`);
    console.log(`Processed: ${successCount} successful, ${errorCount} errors`);
    console.log(`Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successCount} notes with ${errorCount} errors`,
        processed: successCount,
        errors: errorCount,
        duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("=== PROCESS PENDING EMBEDDINGS ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
