/*
  Warnings:

  - Added the required column `updatedAt` to the `WhatsAppLinkToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WhatsAppLinkToken_phoneNumber_idx";

-- AlterTable
ALTER TABLE "WhatsAppIntegration" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WhatsAppLinkToken" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- CreateIndex
CREATE INDEX "WhatsAppLinkToken_phoneNumber_tenantId_idx" ON "WhatsAppLinkToken"("phoneNumber", "tenantId");
