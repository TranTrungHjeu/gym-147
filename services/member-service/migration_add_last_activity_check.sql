-- ============================================================
-- Migration: Add last_activity_check to equipment_usage
-- ============================================================
-- Description: Add field to track last activity update time
--              for periodic activity updates and calorie validation
-- Date: 2025-02-01
-- ============================================================

-- Step 1: Add the column (nullable, no default value)
ALTER TABLE "equipment_usage" 
ADD COLUMN IF NOT EXISTS "last_activity_check" TIMESTAMP(3);

-- Step 2: Add comment for documentation
COMMENT ON COLUMN "equipment_usage"."last_activity_check" IS 
'Last time activity data was updated (for periodic updates). Used for activity validation in calorie calculation.';

-- Step 3: Verify the column was added
-- You can run this query to verify:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'equipment_usage' 
-- AND column_name = 'last_activity_check';

-- ============================================================
-- Rollback SQL (if needed):
-- ============================================================
-- ALTER TABLE "equipment_usage" 
-- DROP COLUMN IF EXISTS "last_activity_check";
-- ============================================================
