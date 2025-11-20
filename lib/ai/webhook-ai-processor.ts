/**
 * Webhook AI Processor
 * 
 * Pure AI functions for webhook processing that have zero Supabase dependencies.
 * These functions only call OpenAI API and can be easily unit tested.
 */

import { WebhookClassification } from "./webhook-classifier";
import { extractTextFromBody } from "./webhook-classifier";

export interface FolderInfo {
  id: string;
  name: string;
  noteCount: number;
}

export interface FolderSuggestion {
  type: "existing" | "new";
  folderId?: string;
  folderName: string;
  confidence: number;
  reason?: string;
}

/**
 * Classify webhook payload using AI
 */
export async function classifyWithAI(
  headers: Record<string, string>,
  body: any,
  apiKey: string,
  model: string,
  webhookName?: string,
  webhookDescription?: string
): Promise<WebhookClassification | null> {
  if (!apiKey) {
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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
export async function extractTitleWithAI(
  content: string,
  classificationType: string,
  apiKey: string,
  model: string,
  webhookName?: string,
  webhookDescription?: string
): Promise<string | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const contentPreview = content.substring(0, 1000); // Limit content for API

    const prompt = `Generate a concise, meaningful title (3-8 words) for this webhook content.
The title should capture the main topic or subject of the content presented. use meta data to assist with further context.

Classification: ${classificationType}
Content: ${contentPreview}
Webhook context: ${webhookName || "Unknown"} - ${webhookDescription || "No description"}

Return ONLY the title text, nothing else. No quotes, no explanations.`;

    const requestBody = {
      model,
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

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
    const title = data.choices[0]?.message?.content?.trim();
    
    if (!title) {
      return null;
    }

    // Remove quotes if present
    const cleanTitle = title.replace(/^["']|["']$/g, '').trim();
    
    // Ensure reasonable length (max 100 chars)
    const finalTitle = cleanTitle.length > 100 
      ? cleanTitle.substring(0, 100) + '...' 
      : cleanTitle;
    
    return finalTitle;
  } catch (error) {
    console.error("[AI Title] Error in AI title extraction:", error);
    return null;
  }
}

/**
 * Suggest folder using AI
 * Returns a folder suggestion (existing or new) based on note content
 */
export async function suggestFolderWithAI(
  title: string,
  content: string,
  classificationType: string,
  folders: FolderInfo[],
  apiKey: string,
  model: string
): Promise<FolderSuggestion | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const foldersText = folders.length > 0
      ? folders.map(f => `- ${f.name} (${f.noteCount} notes)`).join("\n")
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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
      return null;
    }

    const data = await response.json();
    const responseContent = data.choices[0]?.message?.content?.trim();
    
    if (!responseContent) {
      return null;
    }

    // Parse JSON response (may be wrapped in code blocks)
    let jsonStr = responseContent;
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || responseContent.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const result = JSON.parse(jsonStr);

    // Validate and normalize the result
    if (result.type === "existing" && result.folderId && result.confidence > 70) {
      // Verify folder exists in the provided list
      const folder = folders.find((f: FolderInfo) => f.id === result.folderId);
      if (folder) {
        return {
          type: "existing",
          folderId: result.folderId,
          folderName: folder.name,
          confidence: Math.min(Math.max(result.confidence || 50, 0), 100),
        };
      }
    }

    if (result.type === "new" && result.folderName) {
      const newFolderName = result.folderName.trim();
      
      // Check if folder with same name already exists (case-insensitive)
      const existingFolder = folders.find(
        (f: FolderInfo) => f.name.toLowerCase() === newFolderName.toLowerCase()
      );

      if (existingFolder) {
        // Use existing folder instead
        return {
          type: "existing",
          folderId: existingFolder.id,
          folderName: existingFolder.name,
          confidence: 100,
        };
      }

      return {
        type: "new",
        folderName: newFolderName,
        confidence: Math.min(Math.max(result.confidence || 50, 0), 100),
        reason: result.reason,
      };
    }

    return null;
  } catch (error) {
    console.error("Error in AI folder routing:", error);
    return null;
  }
}

/**
 * Suggest tags using AI
 * Returns an array of suggested tag names
 */
export async function suggestTagsWithAI(
  content: string,
  existingTags: string[],
  apiKey: string,
  model: string
): Promise<string[]> {
  if (!apiKey) {
    return [];
  }

  try {
    // Build prompt with existing user tags for context
    const existingTagsSection = existingTags.length > 0
      ? `\nUser's Existing Tags: ${existingTags.join(", ")}\n`
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

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
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

    // Parse tags from response
    const suggestedTags = suggestionsText
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0 && tag.length < 50)
      .slice(0, 5); // Max 5 tags

    return suggestedTags;
  } catch (error) {
    console.error("[Tag Application] Error in tag suggestion:", error);
    return [];
  }
}

