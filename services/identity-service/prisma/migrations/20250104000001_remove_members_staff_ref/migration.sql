-- Migration: Remove members_ref and staff_ref tables
-- These tables are not needed because:
-- 1. Member and Staff services have their own databases
-- 2. No code inserts into these reference tables
-- 3. RESTRICT constraint was causing issues when deleting users
-- 4. Cross-service references are handled at application level, not database level

-- Drop foreign key constraints first
ALTER TABLE "members_ref" DROP CONSTRAINT IF EXISTS "members_ref_user_id_fkey";
ALTER TABLE "staff_ref" DROP CONSTRAINT IF EXISTS "staff_ref_user_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "members_ref_user_id_key";
DROP INDEX IF EXISTS "staff_ref_user_id_key";

-- Drop tables
DROP TABLE IF EXISTS "members_ref";
DROP TABLE IF EXISTS "staff_ref";
