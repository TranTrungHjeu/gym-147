-- AlterTable
ALTER TABLE "users" ADD COLUMN     "push_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "push_platform" TEXT,
ADD COLUMN     "push_token" TEXT;

-- CreateIndex
CREATE INDEX "users_push_token_idx" ON "users"("push_token");
