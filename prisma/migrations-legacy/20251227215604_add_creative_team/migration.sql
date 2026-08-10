-- AlterEnum
ALTER TYPE "TeamType" ADD VALUE 'CREATIVE';

-- AlterTable
ALTER TABLE "HomePageContent" ADD COLUMN     "teamTab3Label" TEXT NOT NULL DEFAULT 'Creative Team';
