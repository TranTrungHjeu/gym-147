-- ============================================
-- Migration: Add metadata field to Refund model
-- ============================================
-- Purpose: Add metadata field to support timeline tracking for refunds
-- Date: 2025-01-06
-- 
-- Changes:
-- 1. Add metadata JSON field to refunds table
-- ============================================

BEGIN;

-- Add metadata field to refunds table
ALTER TABLE "refunds" 
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add comment
COMMENT ON COLUMN "refunds"."metadata" IS 'Stores timeline and additional data for refund tracking';

COMMIT;











