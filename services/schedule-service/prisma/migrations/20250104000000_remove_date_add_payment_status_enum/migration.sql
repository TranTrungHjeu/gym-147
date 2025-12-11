-- Migration: Remove date field from schedules
-- date can be derived from start_time using DATE(start_time)

-- Set search_path to schedule_schema
SET search_path TO schedule_schema, public;

-- AlterTable: Remove date column from schedules
-- Note: date can be derived from start_time using DATE(start_time)
ALTER TABLE "schedule_schema"."schedules" DROP COLUMN IF EXISTS "date";
