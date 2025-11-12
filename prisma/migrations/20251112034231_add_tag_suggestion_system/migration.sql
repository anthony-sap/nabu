/*
  Warnings:

  - You are about to drop the column `sourceUrl` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Thought` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('USER_ADDED', 'AI_SUGGESTED');

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "sourceUrl",
ADD COLUMN     "lastTagModifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastTagSuggestionAt" TIMESTAMP(3),
ADD COLUMN     "pendingJobId" TEXT,
ADD COLUMN     "tagSuggestionStatus" TEXT;

-- AlterTable
ALTER TABLE "NoteTag" ADD COLUMN     "source" "TagSource" NOT NULL DEFAULT 'USER_ADDED';

-- AlterTable
ALTER TABLE "Thought" DROP COLUMN "sourceUrl",
ADD COLUMN     "lastTagModifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastTagSuggestionAt" TIMESTAMP(3),
ADD COLUMN     "pendingJobId" TEXT,
ADD COLUMN     "tagSuggestionStatus" TEXT;

-- CreateTable
CREATE TABLE "TagSuggestionJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "suggestedTags" TEXT[],
    "confidence" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagSuggestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TagSuggestionJob_status_createdAt_idx" ON "TagSuggestionJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TagSuggestionJob_entityType_entityId_idx" ON "TagSuggestionJob"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TagSuggestionJob_userId_idx" ON "TagSuggestionJob"("userId");

-- CreateIndex
CREATE INDEX "TagSuggestionJob_consumed_idx" ON "TagSuggestionJob"("consumed");
