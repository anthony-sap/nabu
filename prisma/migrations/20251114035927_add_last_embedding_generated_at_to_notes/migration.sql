-- DropIndex
DROP INDEX "note_chunk_embedding_idx";

-- DropIndex
DROP INDEX "thought_chunk_embedding_idx";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "lastEmbeddingGeneratedAt" TIMESTAMP(3);
