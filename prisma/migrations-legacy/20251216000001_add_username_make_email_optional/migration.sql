-- Add username column as nullable first
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Update existing users: use email prefix as username (before @)
UPDATE "User" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" IS NULL;

-- Make username column NOT NULL and add unique constraint
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Make email nullable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Make password required (set a placeholder for users without password if any)
UPDATE "User" SET "password" = '$2a$12$placeholder' WHERE "password" IS NULL;
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
