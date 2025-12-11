-- ============================================================
-- Verify Migration: last_activity_check column
-- ============================================================
-- Run this script to verify the migration was successful
-- ============================================================

-- Check if column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'equipment_usage' 
  AND column_name = 'last_activity_check';

-- Expected result:
-- column_name: last_activity_check
-- data_type: timestamp without time zone (or timestamp(3))
-- is_nullable: YES
-- column_default: NULL

-- ============================================================
-- Check column comment
-- ============================================================
SELECT 
    col_description('equipment_usage'::regclass, 
        (SELECT ordinal_position 
         FROM information_schema.columns 
         WHERE table_name = 'equipment_usage' 
         AND column_name = 'last_activity_check')) AS column_comment;

-- ============================================================
-- Sample query to see the column in action (after data exists)
-- ============================================================
-- SELECT 
--     id,
--     member_id,
--     equipment_id,
--     start_time,
--     end_time,
--     last_activity_check,
--     CASE 
--         WHEN last_activity_check IS NULL THEN 'No activity updates'
--         WHEN last_activity_check > NOW() - INTERVAL '5 minutes' THEN 'Active (recent update)'
--         ELSE 'Inactive (no recent update)'
--     END AS activity_status
-- FROM equipment_usage
-- WHERE end_time IS NULL  -- Active sessions only
-- ORDER BY start_time DESC
-- LIMIT 10;
