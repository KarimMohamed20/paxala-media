-- AlterTable
ALTER TABLE "PlaygroundFile" ADD COLUMN     "storagePublicId" TEXT,
ADD COLUMN     "storageResourceType" TEXT;

-- AlterTable
ALTER TABLE "ProjectFile" ADD COLUMN     "storagePublicId" TEXT,
ADD COLUMN     "storageResourceType" TEXT;
