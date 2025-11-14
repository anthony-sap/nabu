/**
 * Content Classification Service
 * Uses heuristic rules to determine if content should be a Thought or Note
 * No AI required - fast, client-side classification
 */

export interface ContentClassification {
  type: 'thought' | 'note';
  confidence: number; // 0-100
  reason: string;
}

/**
 * Analyzes content to determine if it should be saved as a Thought or Note
 * 
 * Classification Rules:
 * - Short text (<150 chars, single line) → Thought (90% confidence)
 * - Long structured content (>300 chars, multiple paragraphs) → Note (80% confidence)
 * - Has heading/title + content → Note (85% confidence)
 * - Pasted content with structure → Note (70% confidence)
 * - Default → Thought (low friction)
 * 
 * @param content - The main content text
 * @param title - Optional title/heading
 * @param wasPasted - Whether content was pasted (vs typed)
 * @returns Classification result with type, confidence, and reason
 */
export function analyzeContentIntent(
  content: string,
  title?: string,
  wasPasted?: boolean
): ContentClassification {
  const trimmedContent = content.trim();
  const trimmedTitle = title?.trim() || '';
  
  // Empty content defaults to Thought
  if (!trimmedContent) {
    return {
      type: 'thought',
      confidence: 100,
      reason: 'Empty content'
    };
  }

  const charCount = trimmedContent.length;
  const lineCount = trimmedContent.split('\n').filter(line => line.trim()).length;
  const paragraphCount = trimmedContent.split(/\n\s*\n/).filter(p => p.trim()).length;
  
  // Detect structured content indicators
  const hasHeadings = /^#{1,6}\s+.+$/m.test(trimmedContent) || /<h[1-6]>/i.test(trimmedContent);
  const hasBulletPoints = /^[\s]*[-*+•]\s+/m.test(trimmedContent);
  const hasNumberedList = /^[\s]*\d+\.\s+/m.test(trimmedContent);
  const hasCodeBlocks = /```[\s\S]*```|`[^`]+`/.test(trimmedContent);
  const hasMultipleUrls = (trimmedContent.match(/https?:\/\/[^\s]+/g) || []).length >= 2;
  
  const structuredIndicators = [
    hasHeadings,
    hasBulletPoints,
    hasNumberedList,
    hasCodeBlocks,
    hasMultipleUrls
  ].filter(Boolean).length;

  // Rule 1: Very short content → Thought (high confidence)
  if (charCount < 150 && lineCount === 1 && !trimmedTitle) {
    return {
      type: 'thought',
      confidence: 90,
      reason: 'Short single-line content'
    };
  }

  // Rule 2: Has title + content → Note (high confidence)
  if (trimmedTitle && charCount > 50) {
    return {
      type: 'note',
      confidence: 85,
      reason: 'Has title and substantial content'
    };
  }

  // Rule 3: Long structured content → Note (high confidence)
  if (charCount > 300 && (paragraphCount >= 2 || structuredIndicators >= 2)) {
    return {
      type: 'note',
      confidence: 80,
      reason: 'Long structured content with multiple paragraphs or formatting'
    };
  }

  // Rule 4: Pasted multiline content → Note (moderate confidence)
  if (wasPasted && lineCount >= 3 && charCount > 200) {
    return {
      type: 'note',
      confidence: 70,
      reason: 'Pasted multiline content'
    };
  }

  // Rule 5: Multiple paragraphs → Note (moderate confidence)
  if (paragraphCount >= 3 && charCount > 250) {
    return {
      type: 'note',
      confidence: 75,
      reason: 'Multiple paragraphs'
    };
  }

  // Rule 6: Structured content indicators → Note (moderate confidence)
  if (structuredIndicators >= 2) {
    return {
      type: 'note',
      confidence: 70,
      reason: 'Contains structured formatting (headings, lists, code, etc.)'
    };
  }

  // Rule 7: Medium length with title → Note (moderate confidence)
  if (trimmedTitle && charCount > 150) {
    return {
      type: 'note',
      confidence: 65,
      reason: 'Has title and medium-length content'
    };
  }

  // Rule 8: Just medium length, no other indicators → Thought (low confidence)
  if (charCount >= 150 && charCount < 300) {
    return {
      type: 'thought',
      confidence: 60,
      reason: 'Medium-length unstructured content'
    };
  }

  // Default: Thought (low friction approach)
  return {
    type: 'thought',
    confidence: 50,
    reason: 'Default classification for quick capture'
  };
}

/**
 * Determines if a suggestion should be shown based on confidence threshold
 * Only show suggestions when we're reasonably confident (>70%)
 * 
 * @param classification - The classification result
 * @returns Whether to show a suggestion to the user
 */
export function shouldShowSuggestion(classification: ContentClassification): boolean {
  return classification.confidence >= 70;
}

/**
 * Gets a user-friendly message for the suggestion banner
 * 
 * @param classification - The classification result
 * @returns Human-readable suggestion message
 */
export function getSuggestionMessage(classification: ContentClassification): string {
  if (classification.type === 'note') {
    return "This looks like a note. Create it as a Note instead of a Thought?";
  } else {
    return "This looks like a quick thought. Save as Thought instead of Note?";
  }
}

