// Supabase Edge Function to process tag suggestions
// Triggered by database webhook on TagSuggestionJob INSERT

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5-nano";
const DATABASE_URL = Deno.env.get("DATABASE_URL");

// Validate OpenAI API key exists
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set");
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    userId: string;
    entityType: string;
    entityId: string;
    content: string;
    status: string;
  };
  schema: string;
  old_record: null;
}

serve(async (req) => {
  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const job = payload.record;

    console.log(`Processing tag suggestion job: ${job.id}`);

    // Create Supabase client (use service role for server-side operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update job status to PROCESSING
    const { error: updateError } = await supabase
      .from("TagSuggestionJob")
      .update({ 
        status: "PROCESSING",
        lastAttemptAt: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      console.error("Error updating job status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update job status" }),
        { status: 500 }
      );
    }

    // Call OpenAI API
    const prompt = `Analyze the following content and suggest 3-5 relevant tags for categorization.

Rules:
- Return tags as short phrases (1-3 words max)
- Focus on: topics, themes, categories, projects
- Make tags actionable and searchable
- Return ONLY tag names, comma-separated
- No explanations, no numbering

Content:
${job.content}

Tags:`;

    try {
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that suggests relevant tags for notes and thoughts.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_completion_tokens: 100,
          }),
        }
      );
      
      if (!openaiResponse.ok) {
        const errorBody = await openaiResponse.text();
        console.error("OpenAI API Error:", {
          status: openaiResponse.status,
          statusText: openaiResponse.statusText,
          body: errorBody,
          model: OPENAI_MODEL,
        });
        throw new Error(`OpenAI API error: ${openaiResponse.statusText} - ${errorBody}`);
      }

      const openaiData = await openaiResponse.json();
      const suggestionsText =
        openaiData.choices[0]?.message?.content?.trim() || "";
      
      // Parse tags from response
      const suggestedTags = suggestionsText
        .split(",")
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0 && tag.length < 50)
        .slice(0, 5); // Max 5 tags

      if (suggestedTags.length === 0) {
        throw new Error("No valid tags generated");
      }

      // Calculate confidence score (simple heuristic based on response length)
      const confidence = Math.min(0.9, 0.5 + suggestedTags.length * 0.1);

      // Update job with results
      await supabase
        .from("TagSuggestionJob")
        .update({
          status: "COMPLETED",
          suggestedTags,
          confidence,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", job.id);

      // Update entity with lastTagSuggestionAt
      const entityTable = job.entityType === "NOTE" ? "Note" : "Thought";
      await supabase
        .from(entityTable)
        .update({
          lastTagSuggestionAt: new Date().toISOString(),
        })
        .eq("id", job.entityId);

      console.log(`Job ${job.id} completed successfully with ${suggestedTags.length} tags`);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: job.id,
          suggestedTags,
          confidence,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (openaiError: any) {
      // Handle OpenAI API errors
      console.error("OpenAI API error:", openaiError);

      // Increment attempts
      const { data: currentJob } = await supabase
        .from("TagSuggestionJob")
        .select("attempts")
        .eq("id", job.id)
        .single();

      const attempts = (currentJob?.attempts || 0) + 1;
      const maxAttempts = 3;

      await supabase
        .from("TagSuggestionJob")
        .update({
          status: attempts >= maxAttempts ? "FAILED" : "PENDING",
          attempts,
          error: openaiError.message,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", job.id);

      // If failed permanently, update entity
      if (attempts >= maxAttempts) {
        const entityTable = job.entityType === "NOTE" ? "Note" : "Thought";
        await supabase
          .from(entityTable)
          .update({
            tagSuggestionStatus: null,
            pendingJobId: null,
          })
          .eq("id", job.entityId);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to generate tags",
          attempts,
          maxAttempts,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

