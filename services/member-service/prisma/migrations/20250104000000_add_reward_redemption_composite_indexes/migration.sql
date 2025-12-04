-- Add composite indexes for reward redemption queries

-- RewardRedemption composite indexes for better query performance
CREATE INDEX IF NOT EXISTS "reward_redemptions_status_redeemed_at_idx" ON "member_schema"."reward_redemptions"("status", "redeemed_at");
CREATE INDEX IF NOT EXISTS "reward_redemptions_member_id_redeemed_at_idx" ON "member_schema"."reward_redemptions"("member_id", "redeemed_at");
CREATE INDEX IF NOT EXISTS "reward_redemptions_reward_id_redeemed_at_idx" ON "member_schema"."reward_redemptions"("reward_id", "redeemed_at");
