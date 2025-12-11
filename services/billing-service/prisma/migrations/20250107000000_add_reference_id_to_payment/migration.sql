-- ============================================
-- Migration: Add reference_id, description, and metadata to Payment model
-- ============================================
-- Purpose: Add reference_id field to link payments to bookings/invoices, 
--          add description field, and metadata field for additional data
-- Date: 2025-01-07
-- 
-- Changes:
-- 1. Add reference_id VARCHAR field to payments table (nullable)
-- 2. Add description VARCHAR field to payments table (nullable)
-- 3. Add metadata JSONB field to payments table (nullable)
-- 4. Add indexes on reference_id and (payment_type, reference_id) for better query performance
-- ============================================

BEGIN;

-- Add reference_id field to payments table
ALTER TABLE "payments" 
ADD COLUMN IF NOT EXISTS "reference_id" VARCHAR(255);

-- Add description field to payments table
ALTER TABLE "payments" 
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Add metadata field to payments table
ALTER TABLE "payments" 
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add comments
COMMENT ON COLUMN "payments"."reference_id" IS 'Booking ID, invoice ID, etc. (for CLASS_BOOKING, ADDON_PURCHASE, etc.)';
COMMENT ON COLUMN "payments"."description" IS 'Payment description';
COMMENT ON COLUMN "payments"."metadata" IS 'Store additional metadata like reward_redemption_id, etc.';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "payments_reference_id_idx" ON "payments"("reference_id");
CREATE INDEX IF NOT EXISTS "payments_payment_type_reference_id_idx" ON "payments"("payment_type", "reference_id");

COMMIT;

