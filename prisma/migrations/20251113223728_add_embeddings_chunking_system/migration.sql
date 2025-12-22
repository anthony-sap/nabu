/*
  Warnings:

  - You are about to drop the column `embedding` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `Thought` table. All the data in the column will be lost.

*/

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "Thought" DROP COLUMN "embedding";

-- CreateTable
CREATE TABLE "NoteChunk" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThoughtChunk" (
    "id" TEXT NOT NULL,
    "thoughtId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThoughtChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbeddingJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmbeddingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteChunk_noteId_idx" ON "NoteChunk"("noteId");

-- CreateIndex
CREATE INDEX "NoteChunk_tenantId_idx" ON "NoteChunk"("tenantId");

-- CreateIndex
CREATE INDEX "ThoughtChunk_thoughtId_idx" ON "ThoughtChunk"("thoughtId");

-- CreateIndex
CREATE INDEX "ThoughtChunk_tenantId_idx" ON "ThoughtChunk"("tenantId");

-- CreateIndex
CREATE INDEX "EmbeddingJob_status_createdAt_idx" ON "EmbeddingJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmbeddingJob_entityType_entityId_idx" ON "EmbeddingJob"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EmbeddingJob_userId_idx" ON "EmbeddingJob"("userId");

-- CreateIndex
CREATE INDEX "EmbeddingJob_tenantId_idx" ON "EmbeddingJob"("tenantId");

-- AddForeignKey
ALTER TABLE "NoteChunk" ADD CONSTRAINT "NoteChunk_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteChunk" ADD CONSTRAINT "NoteChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThoughtChunk" ADD CONSTRAINT "ThoughtChunk_thoughtId_fkey" FOREIGN KEY ("thoughtId") REFERENCES "Thought"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThoughtChunk" ADD CONSTRAINT "ThoughtChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbeddingJob" ADD CONSTRAINT "EmbeddingJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create vector similarity search indexes using ivfflat
-- These indexes enable fast cosine similarity search on embeddings
-- lists = 100 is a good starting point; adjust based on data size
-- For optimal performance, run VACUUM ANALYZE after initial data load
CREATE INDEX note_chunk_embedding_idx ON "NoteChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX thought_chunk_embedding_idx ON "ThoughtChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
