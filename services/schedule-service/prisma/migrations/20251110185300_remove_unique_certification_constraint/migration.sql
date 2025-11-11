-- Remove unique constraint on (trainer_id, category) to allow multiple certifications
-- for the same category (e.g., different levels, issuers, or expiration dates)
-- Application logic handles prioritization and deactivation of old certifications

-- Drop the unique index/constraint
DROP INDEX IF EXISTS "unique_active_certification_per_category";
DROP INDEX IF EXISTS "trainer_certifications_trainer_id_category_key";

-- Add a composite index for efficient queries (non-unique)
CREATE INDEX IF NOT EXISTS "trainer_certifications_trainer_id_category_idx" ON "trainer_certifications"("trainer_id", "category");

