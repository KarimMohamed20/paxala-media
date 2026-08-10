-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'AWAITING_CLIENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlanChangeRequestStatus" AS ENUM ('OPEN', 'RESOLVED', 'DECLINED');

-- AlterTable
ALTER TABLE "ContentPlan" ADD COLUMN     "contentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "jobTitle" TEXT;

-- CreateTable
CREATE TABLE "PlanDeliverable" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "target" INTEGER NOT NULL DEFAULT 0,
    "formats" "ContentFormat"[] DEFAULT ARRAY[]::"ContentFormat"[],
    "manualDone" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanKeyDate" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanKeyDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),

    CONSTRAINT "PlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanWeekItem" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PlanItemStatus" NOT NULL DEFAULT 'SCHEDULED',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanWeekItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAction" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "PlanItemStatus" NOT NULL DEFAULT 'SCHEDULED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "contentItemId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,

    CONSTRAINT "PlanAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTeamMember" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanChangeRequest" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "requesterId" TEXT,
    "requesterName" TEXT,
    "requesterRole" "Role" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "PlanChangeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanDeliverable_planId_order_idx" ON "PlanDeliverable"("planId", "order");

-- CreateIndex
CREATE INDEX "PlanKeyDate_planId_date_idx" ON "PlanKeyDate"("planId", "date");

-- CreateIndex
CREATE INDEX "PlanKeyDate_planId_order_idx" ON "PlanKeyDate"("planId", "order");

-- CreateIndex
CREATE INDEX "PlanWeek_planId_order_idx" ON "PlanWeek"("planId", "order");

-- CreateIndex
CREATE INDEX "PlanWeekItem_weekId_order_idx" ON "PlanWeekItem"("weekId", "order");

-- CreateIndex
CREATE INDEX "PlanAction_planId_order_idx" ON "PlanAction"("planId", "order");

-- CreateIndex
CREATE INDEX "PlanAction_status_idx" ON "PlanAction"("status");

-- CreateIndex
CREATE INDEX "PlanAction_contentItemId_idx" ON "PlanAction"("contentItemId");

-- CreateIndex
CREATE INDEX "PlanTeamMember_planId_order_idx" ON "PlanTeamMember"("planId", "order");

-- CreateIndex
CREATE INDEX "PlanTeamMember_userId_idx" ON "PlanTeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTeamMember_planId_userId_key" ON "PlanTeamMember"("planId", "userId");

-- CreateIndex
CREATE INDEX "PlanChangeRequest_planId_createdAt_idx" ON "PlanChangeRequest"("planId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanChangeRequest_status_idx" ON "PlanChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ContentPlan_clientId_isPublished_idx" ON "ContentPlan"("clientId", "isPublished");

-- AddForeignKey
ALTER TABLE "PlanDeliverable" ADD CONSTRAINT "PlanDeliverable_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanKeyDate" ADD CONSTRAINT "PlanKeyDate_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanWeek" ADD CONSTRAINT "PlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanWeekItem" ADD CONSTRAINT "PlanWeekItem_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "PlanWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAction" ADD CONSTRAINT "PlanAction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAction" ADD CONSTRAINT "PlanAction_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAction" ADD CONSTRAINT "PlanAction_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTeamMember" ADD CONSTRAINT "PlanTeamMember_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTeamMember" ADD CONSTRAINT "PlanTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeRequest" ADD CONSTRAINT "PlanChangeRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeRequest" ADD CONSTRAINT "PlanChangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
