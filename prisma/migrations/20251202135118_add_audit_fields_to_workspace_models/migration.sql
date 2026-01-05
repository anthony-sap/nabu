-- AlterTable
ALTER TABLE "WorkspaceMembership" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkspaceInvite" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);









