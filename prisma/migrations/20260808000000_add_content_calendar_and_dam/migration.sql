-- Content calendar + digital asset management.
--
-- These objects were applied to the dev database with `prisma db push` and no
-- migration was ever recorded, so a clean `prisma migrate deploy` against an
-- empty database would fail on the very next migration (add_content_approval_log
-- alters ContentItem, which nothing had created). This migration closes that gap.
--
-- It is dated before the three feature migrations that build on it. On any
-- database where these objects already exist, mark it applied instead of
-- running it:
--   npx prisma migrate resolve --applied 20260808000000_add_content_calendar_and_dam

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'YOUTUBE', 'PAID_ADS');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('REEL', 'CAROUSEL', 'POST', 'STORIES', 'VIDEO', 'PAID_CAMPAIGN');

-- AlterTable
ALTER TABLE "ProjectFile" ADD COLUMN     "category" TEXT DEFAULT 'Video',
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "folder" TEXT DEFAULT 'General',
ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "formats" JSONB,
ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolution" TEXT DEFAULT '4K MP4',
ADD COLUMN     "status" TEXT DEFAULT 'Approved',
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "uploader" TEXT DEFAULT 'PMP Creative Team',
ADD COLUMN     "usageRights" TEXT DEFAULT 'Approved for web and social.',
ADD COLUMN     "version" TEXT DEFAULT 'V1 Final',
ADD COLUMN     "versionHistory" JSONB,
ALTER COLUMN "size" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT 'red',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "platform" "ContentPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "format" "ContentFormat" NOT NULL DEFAULT 'REEL',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "planId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItemAsset" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContentItemAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Folder_slug_key" ON "Folder"("slug");

-- CreateIndex
CREATE INDEX "Folder_projectId_idx" ON "Folder"("projectId");

-- CreateIndex
CREATE INDEX "ContentPlan_clientId_idx" ON "ContentPlan"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPlan_clientId_month_year_key" ON "ContentPlan"("clientId", "month", "year");

-- CreateIndex
CREATE INDEX "ContentItem_planId_idx" ON "ContentItem"("planId");

-- CreateIndex
CREATE INDEX "ContentItem_scheduledAt_idx" ON "ContentItem"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentItem_status_idx" ON "ContentItem"("status");

-- CreateIndex
CREATE INDEX "ContentItemAsset_contentItemId_idx" ON "ContentItemAsset"("contentItemId");

-- CreateIndex
CREATE INDEX "ContentItemAsset_fileId_idx" ON "ContentItemAsset"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItemAsset_contentItemId_fileId_key" ON "ContentItemAsset"("contentItemId", "fileId");

-- CreateIndex
CREATE INDEX "ProjectFile_category_idx" ON "ProjectFile"("category");

-- CreateIndex
CREATE INDEX "ProjectFile_folder_idx" ON "ProjectFile"("folder");

-- CreateIndex
CREATE INDEX "ProjectFile_folderId_idx" ON "ProjectFile"("folderId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemAsset" ADD CONSTRAINT "ContentItemAsset_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemAsset" ADD CONSTRAINT "ContentItemAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

