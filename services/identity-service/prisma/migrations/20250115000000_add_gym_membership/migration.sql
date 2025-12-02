-- CreateTable
CREATE TABLE IF NOT EXISTS "gym_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "gym_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gym_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gym_memberships_user_id_key" ON "gym_memberships"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gym_memberships_user_id_idx" ON "gym_memberships"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gym_memberships_status_idx" ON "gym_memberships"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gym_memberships_gym_id_idx" ON "gym_memberships"("gym_id");

-- AddForeignKey
ALTER TABLE "gym_memberships" ADD CONSTRAINT "gym_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

