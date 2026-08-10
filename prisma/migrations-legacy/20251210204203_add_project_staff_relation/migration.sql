-- CreateTable
CREATE TABLE "_ProjectStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectStaff_AB_unique" ON "_ProjectStaff"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectStaff_B_index" ON "_ProjectStaff"("B");

-- AddForeignKey
ALTER TABLE "_ProjectStaff" ADD CONSTRAINT "_ProjectStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectStaff" ADD CONSTRAINT "_ProjectStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
