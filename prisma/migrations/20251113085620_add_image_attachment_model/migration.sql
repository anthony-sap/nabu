-- CreateTable
CREATE TABLE "ImageAttachment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "url" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "mediumUrl" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ImageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageAttachment_noteId_idx" ON "ImageAttachment"("noteId");

-- CreateIndex
CREATE INDEX "ImageAttachment_tenantId_idx" ON "ImageAttachment"("tenantId");

-- CreateIndex
CREATE INDEX "ImageAttachment_fileSize_idx" ON "ImageAttachment"("fileSize");

-- CreateIndex
CREATE INDEX "ImageAttachment_createdAt_idx" ON "ImageAttachment"("createdAt");

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
