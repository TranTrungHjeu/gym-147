-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('DISCOUNT', 'FREE_CLASS', 'MERCHANDISE', 'MEMBERSHIP_EXTENSION', 'PREMIUM_FEATURE', 'OTHER');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT', 'FREE_ITEM', 'MEMBERSHIP_UPGRADE', 'PREMIUM_FEATURE_ACCESS', 'CASHBACK', 'OTHER');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RewardCategory" NOT NULL,
    "points_cost" INTEGER NOT NULL,
    "image_url" TEXT,
    "discount_percent" DOUBLE PRECISION,
    "discount_amount" DECIMAL(10,2),
    "reward_type" "RewardType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stock_quantity" INTEGER,
    "redemption_limit" INTEGER,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "terms_conditions" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "reward_id" TEXT NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "code" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rewards_category_idx" ON "rewards"("category");

-- CreateIndex
CREATE INDEX "rewards_is_active_idx" ON "rewards"("is_active");

-- CreateIndex
CREATE INDEX "rewards_points_cost_idx" ON "rewards"("points_cost");

-- CreateIndex
CREATE INDEX "rewards_valid_from_valid_until_idx" ON "rewards"("valid_from", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_code_key" ON "reward_redemptions"("code");

-- CreateIndex
CREATE INDEX "reward_redemptions_member_id_idx" ON "reward_redemptions"("member_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_reward_id_idx" ON "reward_redemptions"("reward_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_status_idx" ON "reward_redemptions"("status");

-- CreateIndex
CREATE INDEX "reward_redemptions_member_id_status_idx" ON "reward_redemptions"("member_id", "status");

-- CreateIndex
CREATE INDEX "reward_redemptions_code_idx" ON "reward_redemptions"("code");

-- CreateIndex
CREATE INDEX "reward_redemptions_redeemed_at_idx" ON "reward_redemptions"("redeemed_at");

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
