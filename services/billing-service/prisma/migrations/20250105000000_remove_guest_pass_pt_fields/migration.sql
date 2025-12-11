-- Migration: Remove guest_passes, personal_training_sessions, pt_sessions_used, guest_passes_used fields
-- These features are not needed for this system

-- AlterTable: Remove fields from membership_plans
ALTER TABLE "membership_plans" DROP COLUMN IF EXISTS "guest_passes";
ALTER TABLE "membership_plans" DROP COLUMN IF EXISTS "personal_training_sessions";

-- AlterTable: Remove fields from subscriptions
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "guest_passes_used";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "pt_sessions_used";

-- Update AddonType enum to remove PERSONAL_TRAINING and GUEST_PASS
-- Note: PostgreSQL doesn't support removing enum values directly
-- We'll need to recreate the enum if it's used elsewhere
-- For now, just document that these values should not be used

-- Update PaymentType enum to remove GUEST_PASS
-- Same note as above - enum values cannot be removed directly in PostgreSQL
