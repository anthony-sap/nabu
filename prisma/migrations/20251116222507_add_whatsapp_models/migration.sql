-- CreateTable
CREATE TABLE "WhatsAppIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'personal',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "WhatsAppIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhoneLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "UserPhoneLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "whatsappMessageId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "whatsappMessageId" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "thoughtId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppIntegration_tenantId_key" ON "WhatsAppIntegration"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppIntegration_tenantId_idx" ON "WhatsAppIntegration"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppIntegration_phoneNumberId_idx" ON "WhatsAppIntegration"("phoneNumberId");

-- CreateIndex
CREATE INDEX "UserPhoneLink_userId_idx" ON "UserPhoneLink"("userId");

-- CreateIndex
CREATE INDEX "UserPhoneLink_tenantId_idx" ON "UserPhoneLink"("tenantId");

-- CreateIndex
CREATE INDEX "UserPhoneLink_phoneNumber_idx" ON "UserPhoneLink"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserPhoneLink_phoneNumber_tenantId_key" ON "UserPhoneLink"("phoneNumber", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLinkToken_token_key" ON "WhatsAppLinkToken"("token");

-- CreateIndex
CREATE INDEX "WhatsAppLinkToken_token_idx" ON "WhatsAppLinkToken"("token");

-- CreateIndex
CREATE INDEX "WhatsAppLinkToken_phoneNumber_idx" ON "WhatsAppLinkToken"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppLinkToken_expiresAt_idx" ON "WhatsAppLinkToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_whatsappMessageId_key" ON "WhatsAppMessage"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_whatsappMessageId_idx" ON "WhatsAppMessage"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_fromNumber_idx" ON "WhatsAppMessage"("fromNumber");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_processed_idx" ON "WhatsAppMessage"("processed");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");

-- AddForeignKey
ALTER TABLE "WhatsAppIntegration" ADD CONSTRAINT "WhatsAppIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhoneLink" ADD CONSTRAINT "UserPhoneLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhoneLink" ADD CONSTRAINT "UserPhoneLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
