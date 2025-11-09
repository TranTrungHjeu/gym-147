-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PointsTransactionType" AS ENUM ('EARNED', 'SPENT', 'EXPIRED', 'REFUNDED');

-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "target" INTEGER;

-- CreateTable
CREATE TABLE "daily_streaks" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" TIMESTAMP(3),
    "streak_started_at" TIMESTAMP(3),
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "category" TEXT NOT NULL,
    "target_value" INTEGER NOT NULL,
    "target_unit" TEXT,
    "reward_points" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "max_participants" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "target_value" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_transactions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "PointsTransactionType" NOT NULL,
    "source" TEXT,
    "source_id" TEXT,
    "description" TEXT,
    "balance_after" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_streaks_member_id_key" ON "daily_streaks"("member_id");

-- CreateIndex
CREATE INDEX "daily_streaks_member_id_idx" ON "daily_streaks"("member_id");

-- CreateIndex
CREATE INDEX "daily_streaks_current_streak_idx" ON "daily_streaks"("current_streak");

-- CreateIndex
CREATE INDEX "challenges_type_idx" ON "challenges"("type");

-- CreateIndex
CREATE INDEX "challenges_category_idx" ON "challenges"("category");

-- CreateIndex
CREATE INDEX "challenges_is_active_idx" ON "challenges"("is_active");

-- CreateIndex
CREATE INDEX "challenges_start_date_end_date_idx" ON "challenges"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "challenge_progress_challenge_id_idx" ON "challenge_progress"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_progress_member_id_idx" ON "challenge_progress"("member_id");

-- CreateIndex
CREATE INDEX "challenge_progress_completed_idx" ON "challenge_progress"("completed");

-- CreateIndex
CREATE INDEX "challenge_progress_member_id_completed_idx" ON "challenge_progress"("member_id", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_progress_challenge_id_member_id_key" ON "challenge_progress"("challenge_id", "member_id");

-- CreateIndex
CREATE INDEX "points_transactions_member_id_idx" ON "points_transactions"("member_id");

-- CreateIndex
CREATE INDEX "points_transactions_member_id_type_idx" ON "points_transactions"("member_id", "type");

-- CreateIndex
CREATE INDEX "points_transactions_type_idx" ON "points_transactions"("type");

-- CreateIndex
CREATE INDEX "points_transactions_created_at_idx" ON "points_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "daily_streaks" ADD CONSTRAINT "daily_streaks_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
