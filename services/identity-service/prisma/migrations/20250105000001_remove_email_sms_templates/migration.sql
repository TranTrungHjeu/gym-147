 -- Migration: Remove EmailTemplate and SMSTemplate tables
-- These features are not needed for this system

-- Drop indexes
DROP INDEX IF EXISTS "email_templates_type_idx";
DROP INDEX IF EXISTS "email_templates_is_active_idx";
DROP INDEX IF EXISTS "email_templates_created_at_idx";
DROP INDEX IF EXISTS "sms_templates_type_idx";
DROP INDEX IF EXISTS "sms_templates_is_active_idx";
DROP INDEX IF EXISTS "sms_templates_created_at_idx";

-- Drop tables
DROP TABLE IF EXISTS "email_templates";
DROP TABLE IF EXISTS "sms_templates";
