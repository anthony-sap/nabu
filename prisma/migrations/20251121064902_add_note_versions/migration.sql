-- CreateTable
CREATE TABLE "NoteVersion" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentState" TEXT,
    "reason" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changesSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "NoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteVersion_noteId_createdAt_idx" ON "NoteVersion"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteVersion_noteId_reason_idx" ON "NoteVersion"("noteId", "reason");

-- CreateIndex
CREATE INDEX "NoteVersion_tenantId_idx" ON "NoteVersion"("tenantId");

-- AddForeignKey
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
