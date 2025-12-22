import { prisma } from "@/lib/db";

/**
 * Configuration for embedding chunking
 */
export const EMBEDDING_CONFIG = {
  CHUNK_SIZE: 2000, // characters
  CHUNK_OVERLAP: 200, // characters
  MIN_CHUNK_SIZE: 100, // Don't create tiny chunks
  MODEL: "text-embedding-3-small",
  DIMENSIONS: 512,
} as const;

/**
 * Split text into overlapping chunks for embedding
 * 
 * @param text - Text to chunk
 * @param chunkSize - Size of each chunk in characters
 * @param overlap - Number of overlapping characters between chunks
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = EMBEDDING_CONFIG.CHUNK_SIZE,
  overlap: number = EMBEDDING_CONFIG.CHUNK_OVERLAP
): string[] {
  // Handle empty or short text
  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmedText = text.trim();
  if (trimmedText.length <= chunkSize) {
    return [trimmedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < trimmedText.length) {
    // Calculate end index for this chunk
    let endIndex = startIndex + chunkSize;

    // If this is not the last chunk, try to break at a sentence or word boundary
    if (endIndex < trimmedText.length) {
      // Look for sentence boundary (., !, ?) within the last 100 chars of chunk
      const sentenceMatch = trimmedText.slice(Math.max(endIndex - 100, startIndex), endIndex)
        .match(/[.!?]\s/g);
      
      if (sentenceMatch) {
        const lastSentenceIndex = trimmedText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1], endIndex);
        if (lastSentenceIndex > startIndex) {
          endIndex = lastSentenceIndex + 2; // Include the punctuation and space
        }
      } else {
        // Fall back to word boundary
        const lastSpaceIndex = trimmedText.lastIndexOf(' ', endIndex);
        if (lastSpaceIndex > startIndex) {
          endIndex = lastSpaceIndex;
        }
      }
    }

    // Extract chunk
    const chunk = trimmedText.slice(startIndex, endIndex).trim();
    
    // Only add if chunk meets minimum size
    if (chunk.length >= EMBEDDING_CONFIG.MIN_CHUNK_SIZE) {
      chunks.push(chunk);
    }

    // Move start index forward, accounting for overlap
    if (endIndex >= trimmedText.length) {
      break;
    }
    startIndex = endIndex - overlap;
  }

  return chunks;
}

/**
 * Extract plain text content from Lexical editor state or HTML
 * 
 * @param contentState - Lexical editor JSON state or HTML string
 * @returns Plain text content
 */
export function extractTextContent(contentState: string | null | undefined): string {
  if (!contentState) {
    return "";
  }

  try {
    // Try to parse as Lexical JSON
    const parsed = JSON.parse(contentState);
    
    // Lexical format: root contains children nodes
    if (parsed.root && Array.isArray(parsed.root.children)) {
      return extractTextFromLexicalNodes(parsed.root.children);
    }
    
    return contentState;
  } catch {
    // If not JSON, treat as HTML or plain text
    return stripHtml(contentState);
  }
}

/**
 * Recursively extract text from Lexical node structure
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
    
    // Add spacing between block-level elements
    if (node.type === "paragraph" || node.type === "heading") {
      text += "\n\n";
    }
  }
  
  return text.trim();
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // Remove tags
    .replace(/&nbsp;/g, " ") // Replace nbsp
    .replace(/&[a-z]+;/gi, " ") // Remove other entities
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Prepare content for embedding by combining title and content
 * 
 * @param title - Note title
 * @param content - Note content (plain text)
 * @returns Combined text ready for chunking
 */
export function prepareNoteContent(title: string, content: string): string {
  const titleText = title.trim();
  const contentText = content.trim();
  
  if (!contentText) {
    return titleText;
  }
  
  if (!titleText) {
    return contentText;
  }
  
  // Combine title and content with clear separation
  return `${titleText}\n\n${contentText}`;
}

/**
 * Check if content has changed enough to warrant regenerating embeddings
 * 
 * @param oldContent - Previous content
 * @param newContent - New content
 * @returns True if embeddings should be regenerated
 */
export function shouldRegenerateEmbeddings(
  oldContent: string | null | undefined,
  newContent: string | null | undefined
): boolean {
  const oldText = (oldContent || "").trim();
  const newText = (newContent || "").trim();
  
  // If both empty, no need to regenerate
  if (!oldText && !newText) {
    return false;
  }
  
  // If one is empty and other is not, regenerate
  if (!oldText || !newText) {
    return true;
  }
  
  // If content is identical, don't regenerate
  if (oldText === newText) {
    return false;
  }
  
  // Calculate similarity (simple character-based)
  const maxLength = Math.max(oldText.length, newText.length);
  let commonChars = 0;
  const minLength = Math.min(oldText.length, newText.length);
  
  for (let i = 0; i < minLength; i++) {
    if (oldText[i] === newText[i]) {
      commonChars++;
    }
  }
  
  const similarity = commonChars / maxLength;
  
  // Regenerate if less than 90% similar (significant change)
  return similarity < 0.9;
}

/**
 * Enqueue embedding jobs for a note
 * Creates chunks and generates EmbeddingJob records
 * 
 * @param noteId - Note ID
 * @param title - Note title
 * @param content - Note content (plain text or HTML)
 * @param contentState - Lexical editor state
 * @param userId - User ID
 * @param tenantId - Tenant ID
 */
export async function enqueueNoteEmbeddingJobs(
  noteId: string,
  title: string,
  content: string,
  contentState: string | null | undefined,
  userId: string,
  tenantId: string | null
): Promise<void> {
  console.log(`[Embeddings] Starting job enqueueing for note ${noteId}`);
  
  // Extract plain text from content
  const plainTextContent = contentState
    ? extractTextContent(contentState)
    : stripHtml(content);
  
  console.log(`[Embeddings] Extracted ${plainTextContent.length} chars of plain text`);
  
  // Prepare full content (title + content)
  const fullContent = prepareNoteContent(title, plainTextContent);
  
  console.log(`[Embeddings] Full content length: ${fullContent.length} chars (min: ${EMBEDDING_CONFIG.MIN_CHUNK_SIZE})`);
  
  // Don't create embeddings for very short content
  if (fullContent.length < EMBEDDING_CONFIG.MIN_CHUNK_SIZE) {
    console.log(`[Embeddings] Content too short, skipping embedding generation for note ${noteId}`);
    return;
  }
  
  // Chunk the content
  const chunks = chunkText(fullContent);
  
  console.log(`[Embeddings] Split content into ${chunks.length} chunks`);
  
  if (chunks.length === 0) {
    console.log(`[Embeddings] No chunks generated, skipping for note ${noteId}`);
    return;
  }
  
  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Delete existing chunks for this note
    const deletedChunks = await tx.noteChunk.deleteMany({
      where: { noteId },
    });
    console.log(`[Embeddings] Deleted ${deletedChunks.count} existing chunks for note ${noteId}`);
    
    // Delete any pending embedding jobs for this note
    const deletedJobs = await tx.embeddingJob.deleteMany({
      where: {
        entityType: "NOTE",
        entityId: noteId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });
    console.log(`[Embeddings] Deleted ${deletedJobs.count} pending jobs for note ${noteId}`);
    
    // Create new chunks and embedding jobs
    for (let i = 0; i < chunks.length; i++) {
      // Create chunk record
      const chunk = await tx.noteChunk.create({
        data: {
          noteId,
          tenantId: tenantId || "",
          chunkIndex: i,
          content: chunks[i],
          // embedding will be populated by Edge Function
        },
      });
      
      console.log(`[Embeddings] Created chunk ${i}/${chunks.length} (ID: ${chunk.id}, ${chunks[i].length} chars)`);
      
      // Create embedding job
      const job = await tx.embeddingJob.create({
        data: {
          tenantId,
          userId,
          entityType: "NOTE",
          entityId: noteId,
          chunkId: chunk.id,
          chunkIndex: i,
          content: chunks[i],
          status: "PENDING",
          createdBy: userId,
        },
      });
      
      console.log(`[Embeddings] Created embedding job ${job.id} for chunk ${i}`);
    }
  });
  
  console.log(`[Embeddings] Successfully enqueued ${chunks.length} embedding jobs for note ${noteId}`);
}

/**
 * Enqueue embedding jobs for a thought
 * Creates chunks and generates EmbeddingJob records
 * 
 * @param thoughtId - Thought ID
 * @param content - Thought content
 * @param userId - User ID
 * @param tenantId - Tenant ID
 */
export async function enqueueThoughtEmbeddingJobs(
  thoughtId: string,
  content: string,
  userId: string,
  tenantId: string | null
): Promise<void> {
  console.log(`[Embeddings] Starting job enqueueing for thought ${thoughtId}`);
  
  // Extract plain text
  const plainTextContent = stripHtml(content);
  
  console.log(`[Embeddings] Extracted ${plainTextContent.length} chars of plain text`);
  console.log(`[Embeddings] Content length: ${plainTextContent.length} (min: ${EMBEDDING_CONFIG.MIN_CHUNK_SIZE})`);
  
  // Don't create embeddings for very short content
  if (plainTextContent.length < EMBEDDING_CONFIG.MIN_CHUNK_SIZE) {
    console.log(`[Embeddings] Content too short, skipping embedding generation for thought ${thoughtId}`);
    return;
  }
  
  // Chunk the content
  const chunks = chunkText(plainTextContent);
  
  console.log(`[Embeddings] Split content into ${chunks.length} chunks`);
  
  if (chunks.length === 0) {
    console.log(`[Embeddings] No chunks generated, skipping for thought ${thoughtId}`);
    return;
  }
  
  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Delete existing chunks for this thought
    const deletedChunks = await tx.thoughtChunk.deleteMany({
      where: { thoughtId },
    });
    console.log(`[Embeddings] Deleted ${deletedChunks.count} existing chunks for thought ${thoughtId}`);
    
    // Delete any pending embedding jobs for this thought
    const deletedJobs = await tx.embeddingJob.deleteMany({
      where: {
        entityType: "THOUGHT",
        entityId: thoughtId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });
    console.log(`[Embeddings] Deleted ${deletedJobs.count} pending jobs for thought ${thoughtId}`);
    
    // Create new chunks and embedding jobs
    for (let i = 0; i < chunks.length; i++) {
      // Create chunk record
      const chunk = await tx.thoughtChunk.create({
        data: {
          thoughtId,
          tenantId: tenantId || "",
          chunkIndex: i,
          content: chunks[i],
          // embedding will be populated by Edge Function
        },
      });
      
      console.log(`[Embeddings] Created chunk ${i}/${chunks.length} (ID: ${chunk.id}, ${chunks[i].length} chars)`);
      
      // Create embedding job
      const job = await tx.embeddingJob.create({
        data: {
          tenantId,
          userId,
          entityType: "THOUGHT",
          entityId: thoughtId,
          chunkId: chunk.id,
          chunkIndex: i,
          content: chunks[i],
          status: "PENDING",
          createdBy: userId,
        },
      });
      
      console.log(`[Embeddings] Created embedding job ${job.id} for chunk ${i}`);
    }
  });
  
  console.log(`[Embeddings] Successfully enqueued ${chunks.length} embedding jobs for thought ${thoughtId}`);
}

/**
 * Clean up failed embedding jobs older than 24 hours
 * This prevents the job queue from growing indefinitely
 */
export async function cleanupFailedEmbeddingJobs(): Promise<number> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const result = await prisma.embeddingJob.deleteMany({
    where: {
      status: "FAILED",
      updatedAt: {
        lt: yesterday,
      },
    },
  });
  
  return result.count;
}

