import { env } from "@/env";
import OpenAI from "openai";

/**
 * AI-powered title generator for notes
 * 
 * Uses OpenAI's GPT-4o-mini to generate concise, meaningful titles
 * from thought content when promoting thoughts to notes.
 * 
 * Features:
 * - Fast and cost-effective (~$0.15 per 1M tokens)
 * - Generates 3-8 word titles capturing main ideas
 * - Automatic fallback to truncation if API fails
 * - 5 second timeout for reliability
 */

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate a concise note title from content using AI
 * 
 * @param content - The thought/note content to analyze
 * @param maxLength - Maximum character length for fallback (default: 50)
 * @returns A concise title string
 * 
 * @example
 * ```typescript
 * const title = await generateNoteTitle("Met with Sarah about Q4 planning...");
 * // Returns: "Q4 Planning Meeting with Sarah"
 * ```
 */
export async function generateNoteTitle(
  content: string,
  maxLength: number = 50
): Promise<string> {
  // Validate input
  if (!content || content.trim().length === 0) {
    return "Untitled Note";
  }

  const trimmedContent = content.trim();

  // For very short content, just use it as-is
  if (trimmedContent.length <= 30) {
    return trimmedContent;
  }

  try {
    // Call OpenAI with timeout
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that generates concise, meaningful titles for notes.
Generate a title that:
- Is 3-8 words long
- Captures the main idea or topic
- Uses title case
- Is specific and descriptive
- Avoids generic words like "Note" or "Thought"

Return ONLY the title text, nothing else.`
          },
          {
            role: "user",
            content: `Generate a title for this note content:\n\n${trimmedContent.substring(0, 500)}`
          }
        ],
        max_tokens: 20,
        temperature: 0.7,
        n: 1,
      }),
      // 5 second timeout
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      )
    ]);

    const generatedTitle = response.choices[0]?.message?.content?.trim();

    if (generatedTitle && generatedTitle.length > 0) {
      // Remove quotes if present
      const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '');
      
      // Ensure reasonable length (max 100 chars)
      return cleanTitle.length > 100 
        ? cleanTitle.substring(0, 100) + '...' 
        : cleanTitle;
    }

    // Fallback if no content returned
    return generateFallbackTitle(trimmedContent, maxLength);

  } catch (error) {
    // Log error for debugging but don't throw - use fallback
    console.error("Failed to generate AI title:", error);
    return generateFallbackTitle(trimmedContent, maxLength);
  }
}

/**
 * Generate a fallback title by truncating content intelligently
 * 
 * @param content - The content to truncate
 * @param maxLength - Maximum length of the title
 * @returns A truncated title with ellipsis if needed
 */
function generateFallbackTitle(content: string, maxLength: number): string {
  const trimmed = content.trim();
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Try to break at a sentence boundary if possible
  const firstSentence = trimmed.match(/^[^.!?]+[.!?]/);
  if (firstSentence && firstSentence[0].length <= maxLength) {
    return firstSentence[0].trim();
  }

  // Otherwise, truncate at word boundary
  let truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    // If we found a space in the last 30% of the string, break there
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + '...';
}

/**
 * Generate a title for bulk-promoted notes (multiple thoughts combined)
 * 
 * @param thoughts - Array of thought contents
 * @returns A title that represents the combined content
 */
export async function generateBulkNoteTitle(
  thoughts: string[]
): Promise<string> {
  if (thoughts.length === 0) {
    return "Untitled Note";
  }

  if (thoughts.length === 1) {
    return generateNoteTitle(thoughts[0]);
  }

  // Combine thoughts with reasonable limit for API
  const combinedContent = thoughts
    .map(t => t.trim())
    .join('\n\n')
    .substring(0, 1000); // Limit to first 1000 chars

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that generates concise, meaningful titles for notes.
Generate a title that:
- Is 3-8 words long
- Represents the common theme across multiple related thoughts
- Uses title case
- Is specific and descriptive
- Avoids generic words like "Note" or "Thought"

Return ONLY the title text, nothing else.`
          },
          {
            role: "user",
            content: `Generate a title that captures the main theme of these ${thoughts.length} related thoughts:\n\n${combinedContent}`
          }
        ],
        max_tokens: 20,
        temperature: 0.7,
        n: 1,
      }),
      // 5 second timeout
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      )
    ]);

    const generatedTitle = response.choices[0]?.message?.content?.trim();

    if (generatedTitle && generatedTitle.length > 0) {
      const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '');
      return cleanTitle.length > 100 
        ? cleanTitle.substring(0, 100) + '...' 
        : cleanTitle;
    }

    // Fallback: use first thought's title
    return generateFallbackTitle(thoughts[0], 50);

  } catch (error) {
    console.error("Failed to generate bulk title:", error);
    return generateFallbackTitle(thoughts[0], 50);
  }
}

