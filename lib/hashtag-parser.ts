/**
 * Extract unique hashtags from text content
 * Matches: #tag, #123, #2024goals, #multi-word-tag
 * Ignores: ##double (consecutive # symbols)
 * 
 * @param content - Text content to parse for hashtags
 * @returns Array of unique hashtag names (without # symbol, lowercase)
 */
export function extractHashtags(content: string): string[] {
  if (!content) return [];
  
  // Regex to match hashtags: # followed by alphanumeric/hyphens/underscores
  // Can start with letters OR numbers
  // Pattern: # + (alphanumeric) + (alphanumeric/underscore/hyphen)*
  const hashtagRegex = /#([a-zA-Z0-9][a-zA-Z0-9_-]*)/g;
  
  const matches = content.matchAll(hashtagRegex);
  const hashtags = new Set<string>();
  
  for (const match of matches) {
    // match[1] is the captured group (tag without #)
    const tagName = match[1].toLowerCase();
    hashtags.add(tagName);
  }
  
  return Array.from(hashtags);
}

