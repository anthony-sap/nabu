/*
  Warnings:

  - You are about to drop the column `createdById` on the `WorkspaceInvite` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkspaceInvite" DROP COLUMN "createdById",
ADD COLUMN     "createdBy" TEXT;
