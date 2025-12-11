-- Migration: Remove GuestPass table
-- Guest pass feature is not needed for this system

-- Set search_path if needed
SET search_path TO public;

-- Drop indexes
DROP INDEX IF EXISTS "guest_passes_member_id_idx";
DROP INDEX IF EXISTS "guest_passes_status_idx";
DROP INDEX IF EXISTS "guest_passes_valid_from_valid_until_idx";
DROP INDEX IF EXISTS "guest_passes_pass_type_idx";

-- Drop foreign key constraints
ALTER TABLE "guest_passes" DROP CONSTRAINT IF EXISTS "guest_passes_member_id_fkey";

-- Drop table
DROP TABLE IF EXISTS "guest_passes";
