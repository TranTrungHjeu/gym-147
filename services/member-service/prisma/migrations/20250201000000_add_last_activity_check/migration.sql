-- AlterTable: Add last_activity_check field to equipment_usage table
-- This field tracks the last time activity data was updated during periodic updates
-- Used for activity validation in calorie calculation

ALTER TABLE "equipment_usage" 
ADD COLUMN "last_activity_check" TIMESTAMP(3);

-- Add comment to document the field
COMMENT ON COLUMN "equipment_usage"."last_activity_check" IS 'Last time activity data was updated (for periodic updates). Used for activity validation in calorie calculation.';
