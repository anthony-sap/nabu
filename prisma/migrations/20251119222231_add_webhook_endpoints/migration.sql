-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "meta" JSONB;

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookProcessingJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "noteId" TEXT NOT NULL,
    "webhookEndpointId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "headers" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "rawBody" TEXT,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEndpoint_token_key" ON "WebhookEndpoint"("token");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_userId_tenantId_idx" ON "WebhookEndpoint"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_token_idx" ON "WebhookEndpoint"("token");

-- CreateIndex
CREATE INDEX "WebhookProcessingJob_noteId_idx" ON "WebhookProcessingJob"("noteId");

-- CreateIndex
CREATE INDEX "WebhookProcessingJob_webhookEndpointId_idx" ON "WebhookProcessingJob"("webhookEndpointId");

-- CreateIndex
CREATE INDEX "WebhookProcessingJob_status_createdAt_idx" ON "WebhookProcessingJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookProcessingJob_tenantId_idx" ON "WebhookProcessingJob"("tenantId");

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookProcessingJob" ADD CONSTRAINT "WebhookProcessingJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookProcessingJob" ADD CONSTRAINT "WebhookProcessingJob_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookProcessingJob" ADD CONSTRAINT "WebhookProcessingJob_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
