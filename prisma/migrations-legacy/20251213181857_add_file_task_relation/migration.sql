-- AlterTable
ALTER TABLE "ProjectFile" ADD COLUMN     "description" TEXT,
ADD COLUMN     "taskId" TEXT,
ALTER COLUMN "type" SET DEFAULT 'link',
ALTER COLUMN "size" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFile_taskId_idx" ON "ProjectFile"("taskId");

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
