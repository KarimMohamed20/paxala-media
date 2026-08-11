-- Give folders an owning client, so one client's folder names stop leaking into
-- another client's Asset Library.
--
-- Before this, every folder created from the portal had `projectId = NULL`
-- (the create-folder modal never sent one), and /api/folders returned all
-- project-less folders to everyone. A folder named "Ramadan Campaign - Almarai"
-- therefore appeared as a card in every other client's library, with a file
-- count of 0. The assets themselves were always scoped correctly; only the
-- names leaked.
--
-- `clientId` NULL keeps the old meaning: agency-wide folders that every client
-- sees (the shipped defaults - Brand Identity, Photography, Documents...).
-- Visibility is enforced by folderVisibilityWhere() in src/lib/asset-scope.ts.

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Folder_clientId_idx" ON "Folder"("clientId");

-- AddForeignKey
-- SetNull, not Cascade: deleting a user must not delete their folders. The
-- files inside belong to projects, which outlive the user account.
DO $$
BEGIN
  ALTER TABLE "Folder"
    ADD CONSTRAINT "Folder_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: attribute an existing agency-wide folder to a client when its
-- contents unambiguously belong to that one client.
--
-- Deliberately conservative, because guessing wrong hides a folder from the
-- people who need it:
--   * only folders that are still unowned and not scoped to a project
--   * only folders whose files all belong to exactly ONE client
--   * never the shipped default names, which are shared vocabulary even when
--     only one client happens to have used them so far
-- Empty folders cannot be attributed and stay agency-wide. Reversible by
-- setting "clientId" back to NULL.
UPDATE "Folder" f
SET "clientId" = owned."clientId"
FROM (
  SELECT pf."folderId" AS folder_id, MIN(p."clientId") AS "clientId"
  FROM "ProjectFile" pf
  JOIN "Project" p ON p."id" = pf."projectId"
  WHERE pf."folderId" IS NOT NULL
    AND p."clientId" IS NOT NULL
  GROUP BY pf."folderId"
  HAVING COUNT(DISTINCT p."clientId") = 1
) owned
WHERE f."id" = owned.folder_id
  AND f."clientId" IS NULL
  AND f."projectId" IS NULL
  AND f."name" NOT IN (
    'General',
    'Brand Identity',
    'Campaigns 2026',
    'Video Masters',
    'Photography',
    'Website & Digital',
    'Documents'
  );
