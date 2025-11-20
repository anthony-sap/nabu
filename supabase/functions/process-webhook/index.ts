// Supabase Edge Function to process webhook payloads
// Triggered by database webhook on WebhookProcessingJob INSERT where status = PENDING

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { init } from "https://esm.sh/@paralleldrive/cuid2@2.2.2";

// Initialize CUID generator for IDs
const createId = init({ length: 25 });

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    tenantId: string | null;
    noteId: string;
    webhookEndpointId: string;
    status: string;
    headers: Record<string, string>;
    body: any;
    rawBody: string | null;
    method: string;
    ipAddress: string | null;
  };
  schema: string;
  old_record: null;
}

interface WebhookClassification {
  type: string; // Any classification type - not limited to predefined types
  confidence: number;
  reason: string;
  extractedContent?: string;
  extractedTitle?: string;
}

serve(async (req) => {
  let payload: WebhookPayload;
  let job: WebhookPayload["record"];
  
  try {
    // Parse webhook payload
    payload = await req.json();
    job = payload.record;

    // Only process PENDING jobs
    if (job.status !== "PENDING") {
      return new Response(
        JSON.stringify({ message: "Job not in PENDING status" }),
        { status: 200 }
      );
    }

    console.log(`Processing webhook job: ${job.id} for note: ${job.noteId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update job status to PROCESSING
    const { error: updateError } = await supabase
      .from("WebhookProcessingJob")
      .update({
        status: "PROCESSING",
      })
      .eq("id", job.id);

    if (updateError) {
      console.error("Error updating job status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update job status" }),
        { status: 500 }
      );
    }

    // Get the Note
    const { data: note, error: noteError } = await supabase
      .from("Note")
      .select("*")
      .eq("id", job.noteId)
      .single();

    if (noteError || !note) {
      throw new Error(`Note not found: ${job.noteId}`);
    }

    // Get the WebhookEndpoint to access name and description
    const { data: webhookEndpoint, error: endpointError } = await supabase
      .from("WebhookEndpoint")
      .select("name, description")
      .eq("id", job.webhookEndpointId)
      .single();

    const webhookName = webhookEndpoint?.name || null;
    const webhookDescription = webhookEndpoint?.description || null;

    // Step 1: Classify webhook payload using AI (with fallback to heuristic)
    let classification: WebhookClassification;
    const aiClassification = await classifyWithAI(
      job.headers,
      job.body,
      webhookName || undefined,
      webhookDescription || undefined
    );

    if (aiClassification) {
      classification = aiClassification;
      console.log(`AI classification: ${classification.type} (confidence: ${classification.confidence})`);
    } else {
      // Fallback to heuristic classification
      classification = await classifyWebhookPayload(
        job.headers,
        job.body,
        webhookName || undefined,
        webhookDescription || undefined
      );
      console.log(`Heuristic classification: ${classification.type} (confidence: ${classification.confidence})`);
    }

    // Step 2: Extract title using AI (with fallback to heuristic)
    const refinedContent = classification.extractedContent || note.content || "";
    let refinedTitle = note.title || "";

    console.log(`[Title Extraction] Starting title extraction process`);
    console.log(`[Title Extraction] Current note title: ${refinedTitle}`);
    console.log(`[Title Extraction] Content length: ${refinedContent.length}`);
    console.log(`[Title Extraction] Classification type: ${classification.type}`);

    // Try AI title extraction first
    console.log(`[Title Extraction] Attempting AI title extraction...`);
    const aiTitle = await extractTitleWithAI(
      refinedContent,
      classification.type,
      webhookName || undefined,
      webhookDescription || undefined
    );

    if (aiTitle) {
      refinedTitle = aiTitle;
      console.log(`[Title Extraction] ✅ AI extracted title: "${refinedTitle}"`);
    } else {
      console.log(`[Title Extraction] ⚠️ AI title extraction failed, falling back to heuristic`);
      // Fallback to heuristic title extraction
      refinedTitle = classification.extractedTitle || extractTitleFromBody(
        job.body,
        job.headers,
        classification,
        webhookName || undefined
      );
      console.log(`[Title Extraction] ✅ Heuristic extracted title: "${refinedTitle}"`);
    }
    
    console.log(`[Title Extraction] Final title to use: "${refinedTitle}"`);

    // Step 3: Determine folder using AI
    const folderResult = await determineFolderWithAI(
      refinedTitle,
      refinedContent,
      classification.type,
      note.userId,
      job.tenantId,
      supabase
    );

    let folderId = folderResult.folderId;
    if (folderResult.folderName && !folderId) {
      console.log(`AI suggested folder but creation failed: ${folderResult.folderName}`);
    } else if (folderId) {
      console.log(`AI assigned folder: ${folderResult.folderName} (${folderId})`);
    }

    // Step 4: Update Note with classification, refined content, title, and folder
    const noteMeta = (note.meta as any) || {};
    noteMeta.classification = {
      type: classification.type,
      confidence: classification.confidence,
      reason: classification.reason,
    };

    const { error: noteUpdateError } = await supabase
      .from("Note")
      .update({
        title: refinedTitle || note.title,
        content: refinedContent || note.content,
        folderId: folderId || null,
        meta: noteMeta,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", job.noteId);

    if (noteUpdateError) {
      console.error("Error updating note:", noteUpdateError);
      throw noteUpdateError;
    }

    // Step 4: Automatically apply tags (if content is substantial)
    if (refinedContent.length >= 200) {
      try {
        console.log(`[Tag Application] Starting automatic tag application for note ${job.noteId}`);
        const appliedTags = await applyTagsToNote(
          job.noteId,
          refinedContent,
          note.userId,
          job.tenantId,
          supabase
        );
        console.log(`[Tag Application] ✅ Applied ${appliedTags.length} tags: ${appliedTags.join(", ")}`);
      } catch (tagError) {
        console.error("[Tag Application] Error applying tags:", tagError);
        // Don't fail the whole job if tag application fails
      }
    }

    // Step 5: Enqueue embedding generation
    // Note: This will be handled by the existing embedding system
    // We just need to ensure the note is ready for embedding generation
    // The embedding system will pick it up automatically

    // Step 6: Update job status to COMPLETED
    const { error: completeError } = await supabase
      .from("WebhookProcessingJob")
      .update({
        status: "COMPLETED",
      })
      .eq("id", job.id);

    if (completeError) {
      console.error("Error completing job:", completeError);
      throw completeError;
    }

    console.log(`Webhook job ${job.id} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        classification: classification.type,
        confidence: classification.confidence,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Webhook processing error:", error);

    // Update job status to FAILED
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Use the job from the outer scope
      if (job) {
        await supabase
          .from("WebhookProcessingJob")
          .update({
            status: "FAILED",
            error: error.message || "Unknown error",
          })
          .eq("id", job.id);
      }
    } catch (updateError) {
      console.error("Error updating job to FAILED:", updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Classify webhook payload using AI
 */
async function classifyWithAI(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): Promise<WebhookClassification | null> {
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping AI classification");
    return null;
  }

  try {
    const textContent = extractTextFromBody(body);
    const contentPreview = textContent.substring(0, 2000); // Limit content for API

    const prompt = `Analyze this webhook payload and classify it into the most appropriate type/category.

Webhook name: ${webhookName || "Not specified"}
Webhook description: ${webhookDescription || "Not specified"}
Content: ${contentPreview}

Classify this into the most appropriate category (e.g., meeting_transcript, crm_note, ticket_update, calendar_event, invoice, purchase_order, etc.).
You can use any category that best fits the content - don't limit yourself to predefined types.

Return JSON: {"type": "category_name", "confidence": 0-100, "reason": "explanation"}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a helpful assistant that classifies webhook payloads. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI API error:", response.status, errorBody);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      return null;
    }

    // Parse JSON response (may be wrapped in code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const classification = JSON.parse(jsonStr);
    
    return {
      type: classification.type || "generic_doc",
      confidence: Math.min(Math.max(classification.confidence || 50, 0), 100),
      reason: classification.reason || "AI classification",
      extractedContent: textContent,
    };
  } catch (error) {
    console.error("Error in AI classification:", error);
    return null;
  }
}

/**
 * Extract title using AI
 */
async function extractTitleWithAI(
  content: string,
  classificationType: string,
  webhookName?: string,
  webhookDescription?: string
): Promise<string | null> {
  console.log("[AI Title] Starting title extraction");
  console.log("[AI Title] Inputs:", {
    contentLength: content.length,
    contentPreview: content.substring(0, 200),
    classificationType,
    webhookName,
    webhookDescription,
  });

  if (!OPENAI_API_KEY) {
    console.warn("[AI Title] OpenAI API key not configured, skipping AI title extraction");
    return null;
  }

  console.log("[AI Title] OpenAI API key configured, model:", OPENAI_MODEL);

  try {
    const contentPreview = content.substring(0, 1000); // Limit content for API
    console.log("[AI Title] Content preview length:", contentPreview.length);

    const prompt = `Generate a concise, meaningful title (3-8 words) for this webhook content.
The title should capture the main topic or subject.

Classification: ${classificationType}
Content: ${contentPreview}
Webhook context: ${webhookName || "Unknown"} - ${webhookDescription || "No description"}

Return ONLY the title text, nothing else. No quotes, no explanations.`;

    console.log("[AI Title] Sending request to OpenAI API...");
    const requestBody = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise titles. Return only the title text, no quotes or explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 30,
      temperature: 0.7,
    };
    console.log("[AI Title] Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[AI Title] OpenAI API response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[AI Title] OpenAI API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      return null;
    }

    const data = await response.json();
    console.log("[AI Title] OpenAI API response:", JSON.stringify(data, null, 2));

    const title = data.choices[0]?.message?.content?.trim();
    console.log("[AI Title] Raw title from API:", title);
    
    if (!title) {
      console.warn("[AI Title] No title returned from API");
      return null;
    }

    // Remove quotes if present
    const cleanTitle = title.replace(/^["']|["']$/g, '').trim();
    console.log("[AI Title] Cleaned title:", cleanTitle);
    
    // Ensure reasonable length (max 100 chars)
    const finalTitle = cleanTitle.length > 100 
      ? cleanTitle.substring(0, 100) + '...' 
      : cleanTitle;
    
    console.log("[AI Title] Final title:", finalTitle);
    console.log("[AI Title] Title extraction successful");
    return finalTitle;
  } catch (error) {
    console.error("[AI Title] Error in AI title extraction:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Determine folder using AI
 */
async function determineFolderWithAI(
  title: string,
  content: string,
  classificationType: string,
  userId: string,
  tenantId: string | null,
  supabase: any
): Promise<{ folderId: string | null; folderName: string | null }> {
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping AI folder routing");
    return { folderId: null, folderName: null };
  }

  try {
    // Fetch user's existing folders
    let folderQuery = supabase
      .from("Folder")
      .select("id, name")
      .eq("userId", userId)
      .is("deletedAt", null);
    
    if (tenantId) {
      folderQuery = folderQuery.eq("tenantId", tenantId);
    } else {
      folderQuery = folderQuery.is("tenantId", null);
    }

    const { data: folders, error: foldersError } = await folderQuery.order("name", { ascending: true });

    if (foldersError) {
      console.error("Error fetching folders:", foldersError);
      return { folderId: null, folderName: null };
    }

    // Get note counts for each folder
    const folderList = folders || [];
    const foldersWithCounts = await Promise.all(
      folderList.map(async (folder: { id: string; name: string }) => {
        let noteCountQuery = supabase
          .from("Note")
          .select("*", { count: "exact", head: true })
          .eq("folderId", folder.id)
          .is("deletedAt", null);
        
        if (tenantId) {
          noteCountQuery = noteCountQuery.eq("tenantId", tenantId);
        } else {
          noteCountQuery = noteCountQuery.is("tenantId", null);
        }

        const { count } = await noteCountQuery;
        
        return {
          id: folder.id,
          name: folder.name,
          noteCount: count || 0,
        };
      })
    );

    const foldersText = foldersWithCounts.length > 0
      ? foldersWithCounts.map(f => `- ${f.name} (${f.noteCount} notes)`).join("\n")
      : "No existing folders";

    const contentPreview = content.substring(0, 1500); // Limit content for API

    const prompt = `Analyze this note and determine the best folder for it.

Note title: ${title}
Note content: ${contentPreview}
Classification: ${classificationType}

User's existing folders:
${foldersText}

Determine if this note should go in an existing folder (if confidence > 70%) or suggest a new folder name.

Return JSON:
- If existing folder matches: {"type": "existing", "folderId": "...", "folderName": "...", "confidence": 0-100}
- If new folder needed: {"type": "new", "folderName": "...", "confidence": 0-100, "reason": "why this folder name"}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a helpful assistant that organizes notes into folders. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI API error:", response.status, errorBody);
      return { folderId: null, folderName: null };
    }

    const data = await response.json();
    const responseContent = data.choices[0]?.message?.content?.trim();
    
    if (!responseContent) {
      return { folderId: null, folderName: null };
    }

    // Parse JSON response (may be wrapped in code blocks)
    let jsonStr = responseContent;
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || responseContent.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const result = JSON.parse(jsonStr);

    if (result.type === "existing" && result.folderId && result.confidence > 70) {
      // Verify folder exists and belongs to user
      const folder = foldersWithCounts.find((f: { id: string }) => f.id === result.folderId);
      if (folder) {
        return { folderId: result.folderId, folderName: folder.name };
      }
    }

    if (result.type === "new" && result.folderName) {
      const newFolderName = result.folderName.trim();
      
      // Check if folder with same name already exists (case-insensitive)
      const existingFolder = foldersWithCounts.find(
        (f: { name: string }) => f.name.toLowerCase() === newFolderName.toLowerCase()
      );

      if (existingFolder) {
        // Use existing folder
        return { folderId: existingFolder.id, folderName: existingFolder.name };
      }

      // Create new folder
      const { data: createdFolder, error: createError } = await supabase
        .from("Folder")
        .insert({
          name: newFolderName,
          userId: userId,
          tenantId: tenantId,
          color: "#00B3A6", // Default mint color
          status: "ENABLE",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating folder:", createError);
        return { folderId: null, folderName: null };
      }

      return { folderId: createdFolder.id, folderName: createdFolder.name };
    }

    return { folderId: null, folderName: null };
  } catch (error) {
    console.error("Error in AI folder routing:", error);
    return { folderId: null, folderName: null };
  }
}

/**
 * Classify webhook payload (duplicated from lib/ai/webhook-classifier.ts for Deno compatibility)
 */
async function classifyWebhookPayload(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): Promise<WebhookClassification> {
  // Try header-based classification first
  const headerClassification = classifyByHeaders(headers, body, webhookName, webhookDescription);
  if (headerClassification.confidence >= 70) {
    // Extract title for header-based classification
    const extractedTitle = extractTitleFromBody(body, headers, headerClassification, webhookName);
    return {
      ...headerClassification,
      extractedTitle,
    };
  }

  // Try content-based classification
  const contentClassification = await classifyByContent(headers, body, webhookName, webhookDescription);
  
  // Use content classification if it has higher confidence
  const finalClassification = contentClassification.confidence > headerClassification.confidence
    ? contentClassification
    : headerClassification;
  
  // Extract title for final classification
  const extractedTitle = extractTitleFromBody(body, headers, finalClassification, webhookName);
  
  return {
    ...finalClassification,
    extractedTitle,
  };
}

/**
 * Classify based on HTTP headers
 */
function classifyByHeaders(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): WebhookClassification {
  const contentType = (headers["content-type"] || "").toLowerCase();
  const userAgent = (headers["user-agent"] || "").toLowerCase();
  const xSource = (headers["x-source"] || "").toLowerCase();
  const xEventType = (headers["x-event-type"] || "").toLowerCase();
  const xType = (headers["x-type"] || "").toLowerCase();

  // Check webhook name and description for keywords (user-provided context)
  const webhookContext = `${webhookName || ""} ${webhookDescription || ""}`.toLowerCase();
  
  if (webhookContext) {
    // Meeting/Call transcript indicators from webhook context
    if (
      webhookContext.includes("meeting") ||
      webhookContext.includes("transcript") ||
      webhookContext.includes("zoom") ||
      webhookContext.includes("google meet") ||
      webhookContext.includes("teams meeting")
    ) {
      if (webhookContext.includes("call") || webhookContext.includes("phone")) {
        return {
          type: "call_transcript",
          confidence: 90,
          reason: `Webhook context indicates call transcript: ${webhookName || "unnamed"}`,
        };
      }
      return {
        type: "meeting_transcript",
        confidence: 90,
        reason: `Webhook context indicates meeting transcript: ${webhookName || "unnamed"}`,
      };
    }

    // CRM indicators from webhook context
    if (
      webhookContext.includes("crm") ||
      webhookContext.includes("salesforce") ||
      webhookContext.includes("hubspot") ||
      webhookContext.includes("pipedrive") ||
      webhookContext.includes("customer") ||
      webhookContext.includes("lead")
    ) {
      return {
        type: "crm_note",
        confidence: 85,
        reason: `Webhook context indicates CRM: ${webhookName || "unnamed"}`,
      };
    }

    // Calendar indicators from webhook context
    if (
      webhookContext.includes("calendar") ||
      webhookContext.includes("event") ||
      webhookContext.includes("appointment") ||
      webhookContext.includes("schedule")
    ) {
      return {
        type: "calendar_event",
        confidence: 85,
        reason: `Webhook context indicates calendar: ${webhookName || "unnamed"}`,
      };
    }

    // Ticket/Support indicators from webhook context
    if (
      webhookContext.includes("ticket") ||
      webhookContext.includes("support") ||
      webhookContext.includes("zendesk") ||
      webhookContext.includes("intercom") ||
      webhookContext.includes("issue")
    ) {
      return {
        type: "ticket_update",
        confidence: 85,
        reason: `Webhook context indicates ticket/support: ${webhookName || "unnamed"}`,
      };
    }

    // Chat indicators from webhook context
    if (
      webhookContext.includes("slack") ||
      webhookContext.includes("discord") ||
      webhookContext.includes("teams") ||
      webhookContext.includes("chat") ||
      webhookContext.includes("message")
    ) {
      return {
        type: "chat_export",
        confidence: 85,
        reason: `Webhook context indicates chat/messaging: ${webhookName || "unnamed"}`,
      };
    }

    // Email indicators from webhook context
    if (
      webhookContext.includes("email") ||
      webhookContext.includes("mail") ||
      webhookContext.includes("gmail") ||
      webhookContext.includes("outlook")
    ) {
      return {
        type: "email_forward",
        confidence: 85,
        reason: `Webhook context indicates email: ${webhookName || "unnamed"}`,
      };
    }

    // Analytics indicators from webhook context
    if (
      webhookContext.includes("analytics") ||
      webhookContext.includes("tracking") ||
      webhookContext.includes("event") ||
      webhookContext.includes("metric")
    ) {
      return {
        type: "analytics_event",
        confidence: 85,
        reason: `Webhook context indicates analytics: ${webhookName || "unnamed"}`,
      };
    }

    // System log indicators from webhook context
    if (
      webhookContext.includes("log") ||
      webhookContext.includes("monitoring") ||
      webhookContext.includes("system") ||
      webhookContext.includes("error")
    ) {
      return {
        type: "system_log",
        confidence: 80,
        reason: `Webhook context indicates system log: ${webhookName || "unnamed"}`,
      };
    }
  }

  // Meeting/Call transcript indicators
  if (
    userAgent.includes("transcription") ||
    userAgent.includes("otter") ||
    userAgent.includes("rev") ||
    xType.includes("transcript") ||
    xType.includes("meeting")
  ) {
    if (xType.includes("call") || userAgent.includes("call")) {
      return {
        type: "call_transcript",
        confidence: 85,
        reason: "Header indicates call transcript service",
      };
    }
    return {
      type: "meeting_transcript",
      confidence: 85,
      reason: "Header indicates meeting transcript service",
    };
  }

  // CRM indicators
  if (
    xSource.includes("crm") ||
    xSource.includes("salesforce") ||
    xSource.includes("hubspot") ||
    xSource.includes("pipedrive")
  ) {
    return {
      type: "crm_note",
      confidence: 80,
      reason: `Header indicates CRM source: ${xSource}`,
    };
  }

  // Analytics/Tracking indicators
  if (
    xEventType ||
    xType.includes("event") ||
    xType.includes("track") ||
    userAgent.includes("analytics")
  ) {
    return {
      type: "analytics_event",
      confidence: 75,
      reason: "Header indicates analytics/tracking event",
    };
  }

  // Calendar indicators
  if (
    xSource.includes("calendar") ||
    xSource.includes("google calendar") ||
    xSource.includes("outlook") ||
    userAgent.includes("calendar")
  ) {
    return {
      type: "calendar_event",
      confidence: 80,
      reason: "Header indicates calendar service",
    };
  }

  // Email indicators
  if (
    xSource.includes("email") ||
    xSource.includes("mail") ||
    contentType.includes("message/rfc822")
  ) {
    return {
      type: "email_forward",
      confidence: 75,
      reason: "Header indicates email source",
    };
  }

  // Ticket/Support system indicators
  if (
    xSource.includes("ticket") ||
    xSource.includes("zendesk") ||
    xSource.includes("intercom") ||
    xSource.includes("support")
  ) {
    return {
      type: "ticket_update",
      confidence: 80,
      reason: "Header indicates ticket/support system",
    };
  }

  // Chat/Slack indicators
  if (
    xSource.includes("slack") ||
    xSource.includes("discord") ||
    xSource.includes("teams") ||
    xSource.includes("chat")
  ) {
    return {
      type: "chat_export",
      confidence: 75,
      reason: "Header indicates chat/messaging service",
    };
  }

  // System log indicators
  if (
    xSource.includes("log") ||
    xSource.includes("monitoring") ||
    userAgent.includes("logger")
  ) {
    return {
      type: "system_log",
      confidence: 70,
      reason: "Header indicates logging/monitoring service",
    };
  }

  // Default: generic doc
  return {
    type: "generic_doc",
    confidence: 30,
    reason: "No specific header indicators found",
  };
}

/**
 * Classify based on content analysis
 */
async function classifyByContent(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): Promise<WebhookClassification> {
  const textContent = extractTextFromBody(body);
  
  // Include webhook context in analysis
  const contextParts: string[] = [];
  if (webhookName) {
    contextParts.push(`Webhook name: ${webhookName}`);
  }
  if (webhookDescription) {
    contextParts.push(`Description: ${webhookDescription}`);
  }
  const contextualContent = contextParts.length > 0
    ? `${contextParts.join(". ")}. Content: ${textContent}`
    : textContent;
  
  const textLower = contextualContent.toLowerCase();
  
  // Extract title early for use in classification
  const extractedTitle = extractTitleFromBody(body, headers, undefined, webhookName);

  // Meeting transcript keywords
  if (
    textLower.includes("meeting") ||
    textLower.includes("transcript") ||
    textLower.includes("minutes") ||
    textLower.includes("attendees")
  ) {
    return {
      type: "meeting_transcript",
      confidence: 70,
      reason: "Content contains meeting-related keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "meeting_transcript", confidence: 70, reason: "" }, webhookName),
    };
  }

  // Call transcript keywords
  if (
    textLower.includes("call") ||
    textLower.includes("phone conversation") ||
    textLower.includes("voice recording")
  ) {
    return {
      type: "call_transcript",
      confidence: 70,
      reason: "Content contains call-related keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "call_transcript", confidence: 70, reason: "" }, webhookName),
    };
  }

  // CRM note keywords
  if (
    textLower.includes("customer") ||
    textLower.includes("lead") ||
    textLower.includes("opportunity") ||
    textLower.includes("deal")
  ) {
    return {
      type: "crm_note",
      confidence: 65,
      reason: "Content contains CRM-related keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "crm_note", confidence: 65, reason: "" }, webhookName),
    };
  }

  // Ticket keywords
  if (
    textLower.includes("ticket") ||
    textLower.includes("issue") ||
    textLower.includes("support request")
  ) {
    return {
      type: "ticket_update",
      confidence: 65,
      reason: "Content contains ticket/support keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "ticket_update", confidence: 65, reason: "" }, webhookName),
    };
  }

  // Default: generic doc
  const defaultClassification: WebhookClassification = {
    type: "generic_doc",
    confidence: 50,
    reason: "Content analysis did not match specific patterns",
    extractedContent: textContent,
    extractedTitle: extractTitleFromBody(body, headers, { type: "generic_doc", confidence: 50, reason: "" }, webhookName),
  };
  return defaultClassification;
}

/**
 * Extract title from webhook payload with classification awareness
 */
function extractTitleFromBody(
  body: any,
  headers: Record<string, string>,
  classification?: WebhookClassification,
  webhookName?: string
): string {
  // Priority 1: Direct title fields (highest priority)
  if (body && typeof body === "object") {
    // Common title fields
    if (body.title) return String(body.title).trim();
    if (body.subject) return String(body.subject).trim();
    if (body.name) return String(body.name).trim();
    
    // Classification-specific fields
    if (classification) {
      switch (classification.type) {
        case "meeting_transcript":
          if (body.meetingTitle) return String(body.meetingTitle).trim();
          if (body.meetingName) return String(body.meetingName).trim();
          if (body.topic) return `Meeting: ${String(body.topic).trim()}`;
          if (body.meeting) {
            const meeting = body.meeting;
            if (typeof meeting === "object" && meeting.title) {
              return String(meeting.title).trim();
            }
            if (typeof meeting === "string") {
              return `Meeting: ${meeting.trim()}`;
            }
          }
          break;
        case "call_transcript":
          if (body.callTitle) return String(body.callTitle).trim();
          if (body.callerName) return `Call with ${String(body.callerName).trim()}`;
          if (body.call) {
            const call = body.call;
            if (typeof call === "object" && call.title) {
              return String(call.title).trim();
            }
          }
          break;
        case "crm_note":
          if (body.contactName) return `CRM: ${String(body.contactName).trim()}`;
          if (body.accountName) return `CRM: ${String(body.accountName).trim()}`;
          if (body.opportunityName) return `CRM: ${String(body.opportunityName).trim()}`;
          if (body.contact) {
            const contact = body.contact;
            if (typeof contact === "object" && contact.name) {
              return `CRM: ${String(contact.name).trim()}`;
            }
          }
          break;
        case "ticket_update":
          if (body.ticketTitle) return String(body.ticketTitle).trim();
          if (body.ticketId) return `Ticket #${String(body.ticketId).trim()}`;
          if (body.issueTitle) return String(body.issueTitle).trim();
          if (body.ticket) {
            const ticket = body.ticket;
            if (typeof ticket === "object") {
              if (ticket.title) return String(ticket.title).trim();
              if (ticket.id) return `Ticket #${String(ticket.id).trim()}`;
            }
          }
          break;
        case "calendar_event":
          if (body.eventTitle) return String(body.eventTitle).trim();
          if (body.summary) return String(body.summary).trim();
          if (body.eventName) return String(body.eventName).trim();
          if (body.event) {
            const event = body.event;
            if (typeof event === "object" && event.title) {
              return String(event.title).trim();
            }
            if (typeof event === "object" && event.summary) {
              return String(event.summary).trim();
            }
          }
          break;
        case "email_forward":
          if (body.emailSubject) return String(body.emailSubject).trim();
          if (body.from) {
            const from = body.from;
            if (typeof from === "object" && from.email) {
              return `Email from ${String(from.email).trim()}`;
            }
            return `Email from ${String(from).trim()}`;
          }
          break;
      }
    }
    
    // Event/type-based titles
    if (body.event) {
      const eventStr = String(body.event).trim();
      // Format event names nicely (snake_case to Title Case)
      const formatted = eventStr
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return formatted;
    }
    
    if (body.type) {
      const typeStr = String(body.type).trim();
      return typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
    }
    
    // Nested data structures
    if (body.data && typeof body.data === "object") {
      if (body.data.title) return String(body.data.title).trim();
      if (body.data.subject) return String(body.data.subject).trim();
      if (body.data.name) return String(body.data.name).trim();
    }
    
    // Payload structure analysis
    if (body.payload && typeof body.payload === "object") {
      if (body.payload.title) return String(body.payload.title).trim();
      if (body.payload.subject) return String(body.payload.subject).trim();
    }
  }
  
  // Priority 2: Header-based titles
  if (headers["x-title"]) return headers["x-title"].trim();
  if (headers["x-subject"]) return headers["x-subject"].trim();
  if (headers["subject"]) return headers["subject"].trim();
  
  // Priority 3: Classification + Webhook context (before content extraction)
  if (classification && webhookName) {
    const typeLabel = classification.type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    // Use webhook name with classification type
    return `${typeLabel} from ${webhookName}`;
  }
  
  // Priority 4: Classification type only
  if (classification) {
    const typeLabel = classification.type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    const date = new Date();
    const dateStr = date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    return `${typeLabel} - ${dateStr}`;
  }
  
  // Priority 5: Content-based title extraction (first line or summary)
  // Only use if we don't have classification context
  if (body && typeof body === "object") {
    const content = extractTextFromBody(body);
    if (content) {
      const firstLine = content.split("\n")[0].trim();
      // Use first line if it's reasonable length and not too long
      // Also check if it looks like a title (not just generic content)
      if (
        firstLine.length > 0 && 
        firstLine.length < 100 && 
        firstLine.length > 5 &&
        !firstLine.toLowerCase().includes("some content") &&
        !firstLine.toLowerCase().includes("random text")
      ) {
        return firstLine;
      }
    }
  }
  
  // Priority 6: Webhook name + timestamp
  if (webhookName) {
    const date = new Date();
    const dateStr = date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${webhookName} - ${dateStr}`;
  }
  
  // Priority 7: Final fallback
  const date = new Date();
  const dateStr = date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `Webhook - ${dateStr}`;
}

/**
 * Automatically apply AI-generated tags to a note
 */
async function applyTagsToNote(
  noteId: string,
  content: string,
  userId: string,
  tenantId: string | null,
  supabase: any
): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    console.warn("[Tag Application] OpenAI API key not configured, skipping tag application");
    return [];
  }

  try {
    console.log(`[Tag Application] Fetching existing tags for user ${userId}`);
    
    // Query user's existing tags
    // Get all tags for this user (simpler approach - get all user tags)
    let tagQuery = supabase
      .from("Tag")
      .select("name")
      .eq("userId", userId)
      .is("deletedAt", null);

    if (tenantId) {
      tagQuery = tagQuery.eq("tenantId", tenantId);
    } else {
      tagQuery = tagQuery.is("tenantId", null);
    }

    const { data: usedTags, error: tagsError } = await tagQuery;

    if (tagsError) {
      console.error("[Tag Application] Error fetching existing tags:", tagsError);
      // Continue anyway - we can still generate tags
    }

    // Extract unique tag names
    const existingTagNames = usedTags 
      ? [...new Set(usedTags.map((tag: any) => tag.name).filter(Boolean))]
      : [];

    console.log(`[Tag Application] Found ${existingTagNames.length} existing tags`);

    // Build prompt with existing user tags for context
    const existingTagsSection = existingTagNames.length > 0
      ? `\nUser's Existing Tags: ${existingTagNames.join(", ")}\n`
      : "";

    const contentPreview = content.substring(0, 1000); // Limit content for API

    const prompt = `Analyze the following content and suggest 3-5 relevant tags for categorization.
${existingTagsSection}
Rules:
- Prioritize suggesting relevant tags from the user's existing tags when appropriate
- Only suggest new tags if the existing tags don't adequately describe the content
- Return tags as short phrases (1-3 words max)
- Focus on: topics, themes, categories, projects
- Make tags actionable and searchable
- Return ONLY tag names, comma-separated
- No explanations, no numbering

Content:
${contentPreview}

Tags:`;

    console.log("[Tag Application] Calling OpenAI API for tag generation...");
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
          max_tokens: 100,
          temperature: 0.7,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error("[Tag Application] OpenAI API error:", {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorBody,
      });
      return [];
    }

    const openaiData = await openaiResponse.json();
    const suggestionsText = openaiData.choices[0]?.message?.content?.trim() || "";

    console.log(`[Tag Application] OpenAI response: ${suggestionsText}`);

    // Parse tags from response
    const suggestedTags = suggestionsText
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0 && tag.length < 50)
      .slice(0, 5); // Max 5 tags

    if (suggestedTags.length === 0) {
      console.warn("[Tag Application] No valid tags generated from AI");
      return [];
    }

    console.log(`[Tag Application] Parsed ${suggestedTags.length} tags: ${suggestedTags.join(", ")}`);

    // Apply each tag to the note
    const appliedTags: string[] = [];

    for (const tagName of suggestedTags) {
      try {
        // Find existing tag (case-insensitive)
        let tagQuery = supabase
          .from("Tag")
          .select("id, name")
          .eq("userId", userId)
          .is("deletedAt", null)
          .ilike("name", tagName); // Case-insensitive search

        if (tenantId) {
          tagQuery = tagQuery.eq("tenantId", tenantId);
        } else {
          tagQuery = tagQuery.is("tenantId", null);
        }

        const { data: existingTags, error: findError } = await tagQuery.limit(1);

        let tagId: string;

        if (findError || !existingTags || existingTags.length === 0) {
          // Create new tag
          console.log(`[Tag Application] Creating new tag: ${tagName}`);
          const { data: newTag, error: createError } = await supabase
            .from("Tag")
            .insert({
              name: tagName,
              userId: userId,
              tenantId: tenantId,
              status: "ENABLE",
              createdBy: userId,
              updatedBy: userId,
            })
            .select()
            .single();

          if (createError || !newTag) {
            console.error(`[Tag Application] Error creating tag ${tagName}:`, createError);
            continue;
          }

          tagId = newTag.id;
        } else {
          // Use existing tag
          tagId = existingTags[0].id;
          console.log(`[Tag Application] Using existing tag: ${tagName} (${tagId})`);
        }

        // Check if NoteTag link already exists
        const { data: existingLink, error: linkError } = await supabase
          .from("NoteTag")
          .select("deletedAt")
          .eq("noteId", noteId)
          .eq("tagId", tagId)
          .single();

        if (linkError && linkError.code !== "PGRST116") {
          // PGRST116 = not found, which is fine
          console.error(`[Tag Application] Error checking NoteTag link:`, linkError);
          continue;
        }

        if (existingLink) {
          if (existingLink.deletedAt) {
            // Restore soft-deleted link
            console.log(`[Tag Application] Restoring soft-deleted link for tag: ${tagName}`);
            const { error: updateError } = await supabase
              .from("NoteTag")
              .update({
                deletedAt: null,
                source: "AI_SUGGESTED",
                updatedBy: userId,
              })
              .eq("noteId", noteId)
              .eq("tagId", tagId);

            if (updateError) {
              console.error(`[Tag Application] Error restoring NoteTag link:`, updateError);
              continue;
            }
          } else {
            // Already linked, skip
            console.log(`[Tag Application] Tag ${tagName} already linked, skipping`);
            continue;
          }
        } else {
          // Create new NoteTag link
          console.log(`[Tag Application] Creating NoteTag link for: ${tagName}`);
          const { error: insertError } = await supabase
            .from("NoteTag")
            .insert({
              noteId: noteId,
              tagId: tagId,
              tenantId: tenantId,
              source: "AI_SUGGESTED",
              createdBy: userId,
              updatedBy: userId,
            });

          if (insertError) {
            console.error(`[Tag Application] Error creating NoteTag link:`, insertError);
            continue;
          }
        }

        appliedTags.push(tagName);
      } catch (tagError) {
        console.error(`[Tag Application] Error processing tag ${tagName}:`, tagError);
        // Continue with next tag
      }
    }

    console.log(`[Tag Application] Successfully applied ${appliedTags.length} tags`);
    return appliedTags;
  } catch (error) {
    console.error("[Tag Application] Error in tag application:", error);
    return [];
  }
}

/**
 * Extract text content from body
 */
function extractTextFromBody(body: any): string {
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object") {
    if (body.content) return String(body.content);
    if (body.text) return String(body.text);
    if (body.body) return String(body.body);
    if (body.message) return String(body.message);
    if (body.transcript) return String(body.transcript);
    if (body.description) return String(body.description);
    if (body.summary) return String(body.summary);

    if (Array.isArray(body)) {
      return body.map((item) => extractTextFromBody(item)).join("\n");
    }

    const strings: string[] = [];
    function extractStrings(obj: any): void {
      if (typeof obj === "string") {
        strings.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(extractStrings);
      } else if (obj && typeof obj === "object") {
        Object.values(obj).forEach(extractStrings);
      }
    }
    extractStrings(body);
    return strings.join("\n");
  }

  return "";
}

