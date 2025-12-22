// Supabase Edge Function to generate embeddings for note and thought chunks
// Triggered by database webhook on EmbeddingJob INSERT
// Uses OpenAI text-embedding-3-small with 512 dimensions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuration
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const EMBEDDING_MODEL = Deno.env.get("EMBEDDING_MODEL") || "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = parseInt(Deno.env.get("EMBEDDING_DIMENSIONS") || "512");
const MAX_RETRIES = 3;

// Validate OpenAI API key
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set");
}

/**
 * Generate embedding vector using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`Calling OpenAI API for model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}d)`);
  
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI API error (${response.status}): ${errorText}`);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  
  // OpenAI returns: { data: [{ embedding: [...] }] }
  if (!result.data || !result.data[0] || !result.data[0].embedding) {
    throw new Error(`Unexpected OpenAI response format`);
  }
  
  const embedding = result.data[0].embedding;
  
  console.log(`Generated embedding with ${embedding.length} dimensions`);
  
  return embedding;
}

/**
 * Format embedding array for PostgreSQL vector type
 */
function formatVectorForPostgres(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    tenantId: string | null;
    userId: string;
    entityType: string; // "NOTE" or "THOUGHT"
    entityId: string;
    chunkId: string;
    chunkIndex: number;
    content: string;
    status: string;
    attempts: number;
  };
  schema: string;
  old_record: null;
}

serve(async (req) => {
  console.log("=== EDGE FUNCTION INVOKED ===");
  console.log(`Request method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const job = payload.record;

    console.log("=== WEBHOOK PAYLOAD RECEIVED ===");
    console.log(`Job ID: ${job.id}`);
    console.log(`Entity Type: ${job.entityType}`);
    console.log(`Entity ID: ${job.entityId}`);
    console.log(`Chunk ID: ${job.chunkId}`);
    console.log(`Chunk Index: ${job.chunkIndex}`);
    console.log(`Content Length: ${job.content.length} characters`);
    console.log(`Current Status: ${job.status}`);
    console.log(`Attempts: ${job.attempts}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Service key configured: ${supabaseServiceKey ? 'YES' : 'NO'}`);
    console.log(`OpenAI API key configured: ${OPENAI_API_KEY ? 'YES' : 'NO'}`);
    console.log(`Embedding model: ${EMBEDDING_MODEL}`);
    console.log(`Embedding dimensions: ${EMBEDDING_DIMENSIONS}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update job status to PROCESSING
    console.log(`Updating job ${job.id} status to PROCESSING...`);
    const { error: updateError } = await supabase
      .from("EmbeddingJob")
      .update({ 
        status: "PROCESSING",
        lastAttemptAt: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      console.error("=== ERROR UPDATING JOB STATUS ===");
      console.error(JSON.stringify(updateError, null, 2));
      return new Response(
        JSON.stringify({ error: "Failed to update job status", details: updateError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Job ${job.id} status updated to PROCESSING successfully`);

    try {
      // Generate embedding
      console.log("=== GENERATING EMBEDDING ===");
      console.log(`Content preview: "${job.content.substring(0, 100)}..."`);
      
      const embedding = await generateEmbedding(job.content);
      
      console.log("=== EMBEDDING GENERATED ===");
      console.log(`Dimensions: ${embedding.length}`);
      console.log(`First 5 values: [${embedding.slice(0, 5).join(", ")}...]`);

      // Validate dimensions match expected
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`);
      }

      // Format embedding for PostgreSQL
      const vectorString = formatVectorForPostgres(embedding);
      console.log(`Vector string length: ${vectorString.length} chars`);

      // Update the appropriate chunk table with the embedding
      const chunkTable = job.entityType === "NOTE" ? "NoteChunk" : "ThoughtChunk";
      
      console.log(`Updating ${chunkTable} table with embedding for chunk ${job.chunkId}...`);
      const { data: chunkData, error: chunkError } = await supabase
        .from(chunkTable)
        .update({
          embedding: vectorString,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", job.chunkId)
        .select();

      if (chunkError) {
        console.error("=== ERROR UPDATING CHUNK ===");
        console.error(JSON.stringify(chunkError, null, 2));
        throw new Error(`Failed to update ${chunkTable}: ${chunkError.message}`);
      }
      
      console.log(`Chunk ${job.chunkId} updated successfully. Rows affected: ${chunkData?.length || 0}`);

      // Mark job as COMPLETED
      console.log(`Marking job ${job.id} as COMPLETED...`);
      const { error: completeError } = await supabase
        .from("EmbeddingJob")
        .update({
          status: "COMPLETED",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (completeError) {
        console.error("=== ERROR COMPLETING JOB ===");
        console.error(JSON.stringify(completeError, null, 2));
      }

      console.log("=== JOB COMPLETED SUCCESSFULLY ===");
      console.log(`Job ID: ${job.id}`);
      console.log(`Chunk ID: ${job.chunkId}`);
      console.log(`Dimensions: ${embedding.length}`);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: job.id,
          chunkId: job.chunkId,
          dimensions: embedding.length,
          model: EMBEDDING_MODEL,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (embeddingError: any) {
      // Handle embedding generation errors
      console.error("=== EMBEDDING GENERATION ERROR ===");
      console.error(`Error type: ${embeddingError.constructor.name}`);
      console.error(`Error message: ${embeddingError.message}`);
      console.error(`Error stack: ${embeddingError.stack}`);

      // Increment attempts
      const { data: currentJob } = await supabase
        .from("EmbeddingJob")
        .select("attempts")
        .eq("id", job.id)
        .single();

      const attempts = (currentJob?.attempts || 0) + 1;
      const newStatus = attempts >= MAX_RETRIES ? "FAILED" : "PENDING";

      console.log(`Job ${job.id} attempt ${attempts}/${MAX_RETRIES}, new status: ${newStatus}`);

      await supabase
        .from("EmbeddingJob")
        .update({
          status: newStatus,
          attempts,
          error: embeddingError.message,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({
          error: "Failed to generate embedding",
          message: embeddingError.message,
          attempts,
          maxRetries: MAX_RETRIES,
          status: newStatus,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("=== WEBHOOK PROCESSING ERROR ===");
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    return new Response(
      JSON.stringify({ 
        error: "Webhook processing failed",
        message: error.message,
        type: error.constructor.name
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
