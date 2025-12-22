-- Update vector dimensions from 384 to 512 for OpenAI embeddings
-- This migration updates the embedding columns to use 512 dimensions

-- Drop existing vector indexes (they're tied to specific dimensions)
DROP INDEX IF EXISTS "note_chunk_embedding_idx";
DROP INDEX IF EXISTS "thought_chunk_embedding_idx";

-- Update vector dimensions from 384 to 512
-- This will clear existing embeddings (they need to be regenerated anyway)
ALTER TABLE "NoteChunk" ALTER COLUMN "embedding" TYPE vector(512);
ALTER TABLE "ThoughtChunk" ALTER COLUMN "embedding" TYPE vector(512);

-- Recreate vector indexes for 512 dimensions
-- Using ivfflat for fast approximate nearest neighbor search
CREATE INDEX note_chunk_embedding_idx ON "NoteChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX thought_chunk_embedding_idx ON "ThoughtChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
