-- CreateEnum
CREATE TYPE "ContentApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "rejectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContentApproval" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "action" "ContentApprovalAction" NOT NULL,
    "notes" TEXT,
    "reviewerId" TEXT,
    "reviewerRole" "Role" NOT NULL,
    "reviewerName" TEXT,
    "fromStatus" "ContentStatus",
    "toStatus" "ContentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentApproval_contentItemId_createdAt_idx" ON "ContentApproval"("contentItemId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentApproval_reviewerId_idx" ON "ContentApproval"("reviewerId");

-- CreateIndex
CREATE INDEX "ContentApproval_action_idx" ON "ContentApproval"("action");

-- CreateIndex
CREATE INDEX "ContentItem_projectId_idx" ON "ContentItem"("projectId");

-- AddForeignKey
ALTER TABLE "ContentApproval" ADD CONSTRAINT "ContentApproval_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentApproval" ADD CONSTRAINT "ContentApproval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
