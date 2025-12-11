-- Migration: Simplify gym_memberships table for single gym
-- Remove redundant fields: gym_id, gym_name, is_primary
-- These fields are hardcoded for single gym system and not needed

-- Drop indexes that reference removed columns
DROP INDEX IF EXISTS "gym_memberships_gym_id_idx";

-- AlterTable: Remove gym_id, gym_name, is_primary columns
ALTER TABLE "gym_memberships" DROP COLUMN IF EXISTS "gym_id";
ALTER TABLE "gym_memberships" DROP COLUMN IF EXISTS "gym_name";
ALTER TABLE "gym_memberships" DROP COLUMN IF EXISTS "is_primary";

-- Note: Application code should be updated to:
-- - Remove references to gym_id, gym_name, is_primary
-- - Hardcode gym information in application logic if needed
-- - Update tenant.controller.js to not use these fields
