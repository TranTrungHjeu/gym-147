-- Migration: Add minimum_participants field to schedules table
-- This field allows trainers to set a minimum number of participants required for a class
-- If the minimum is not met 1 day before the class starts, the class will be automatically cancelled

-- Set search_path to schedule_schema
SET search_path TO schedule_schema, public;

-- AlterTable
ALTER TABLE "schedule_schema"."schedules" ADD COLUMN IF NOT EXISTS "minimum_participants" INTEGER;

-- Add comment to document the field
COMMENT ON COLUMN "schedule_schema"."schedules"."minimum_participants" IS 'Minimum number of participants required. If not met 1 day before class starts, class will be auto-cancelled. NULL means no minimum requirement.';

