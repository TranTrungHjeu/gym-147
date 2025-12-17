-- ============================================
-- Migration: Improve Database Structure
-- ============================================
-- Purpose: Remove redundant fields and add database constraints
-- Date: 2025-01-XX
-- 
-- Changes:
-- 1. Remove redundant fields:
--    - membership_plans.trial_days (not used)
--    - subscriptions.is_trial (redundant with status = 'TRIAL')
--    - payments.refunded_at (can be calculated from refunds table)
--    - payments.refund_reason (not meaningful with multiple refunds)
-- 
-- 2. Add database constraints:
--    - payments: refunded_amount <= amount
--    - subscriptions: trial_end > trial_start (if both exist)
-- ============================================

BEGIN;

-- ============================================
-- 1. Remove redundant fields
-- ============================================

-- Remove trial_days from membership_plans
ALTER TABLE "membership_plans" 
DROP COLUMN IF EXISTS "trial_days";

-- Remove is_trial from subscriptions
ALTER TABLE "subscriptions" 
DROP COLUMN IF EXISTS "is_trial";

-- Remove refunded_at from payments
ALTER TABLE "payments" 
DROP COLUMN IF EXISTS "refunded_at";

-- Remove refund_reason from payments
ALTER TABLE "payments" 
DROP COLUMN IF EXISTS "refund_reason";

-- ============================================
-- 2. Add database constraints
-- ============================================

-- Constraint: Ensure refunded_amount <= amount
-- This prevents invalid refund amounts
ALTER TABLE "payments" 
ADD CONSTRAINT "check_refunded_amount" 
CHECK (
  refunded_amount IS NULL OR 
  refunded_amount <= amount
);

-- Constraint: Ensure trial_end > trial_start (if both exist)
-- This ensures valid trial period dates
ALTER TABLE "subscriptions" 
ADD CONSTRAINT "check_trial_dates" 
CHECK (
  (trial_start IS NULL AND trial_end IS NULL) OR
  (trial_start IS NOT NULL AND trial_end IS NOT NULL AND trial_end > trial_start)
);

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON COLUMN "subscriptions"."trial_start" IS 'Start date of trial period. Use status = TRIAL instead of is_trial flag.';
COMMENT ON COLUMN "subscriptions"."trial_end" IS 'End date of trial period. Use status = TRIAL instead of is_trial flag.';
COMMENT ON COLUMN "subscriptions"."status" IS 'Subscription status. Use TRIAL for trial subscriptions instead of is_trial flag.';
COMMENT ON COLUMN "payments"."refunded_amount" IS 'Aggregate total of all processed refunds. Calculated from refunds table.';
COMMENT ON COLUMN "payments"."status" IS 'Payment status. Automatically set to REFUNDED or PARTIALLY_REFUNDED based on refunded_amount.';

COMMIT;

-- ============================================
-- Notes:
-- ============================================
-- 1. After migration, ensure application code:
--    - Uses status = 'TRIAL' instead of is_trial flag
--    - Calculates refunded_at from MAX(refunds.processed_at) when needed
--    - Gets refund_reason from refunds table (latest or all)
-- 
-- 2. The refunded_amount aggregate field is kept for performance.
--    Application must maintain consistency by updating it when refunds are processed.
-- 
-- 3. Constraints will prevent invalid data at database level.
-- ============================================













