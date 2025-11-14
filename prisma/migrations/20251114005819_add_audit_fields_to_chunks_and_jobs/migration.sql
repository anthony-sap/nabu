-- DropIndex
DROP INDEX "note_chunk_embedding_idx";

-- DropIndex
DROP INDEX "thought_chunk_embedding_idx";

-- AlterTable
ALTER TABLE "EmbeddingJob" ADD COLUMN     "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "NoteChunk" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "ThoughtChunk" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;
