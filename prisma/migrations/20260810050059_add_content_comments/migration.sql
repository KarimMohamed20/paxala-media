-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "reviewDueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContentComment" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorRole" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "timecodeSec" DOUBLE PRECISION,
    "assetId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentComment_contentItemId_createdAt_idx" ON "ContentComment"("contentItemId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentComment_authorId_idx" ON "ContentComment"("authorId");

-- CreateIndex
CREATE INDEX "ContentComment_assetId_idx" ON "ContentComment"("assetId");

-- AddForeignKey
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ProjectFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
