-- Migration: Remove APIKey and Webhook tables
-- These features are not needed for this system

-- Drop foreign key constraints first
ALTER TABLE "webhook_events" DROP CONSTRAINT IF EXISTS "webhook_events_webhook_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "api_keys_is_active_idx";
DROP INDEX IF EXISTS "api_keys_key_prefix_idx";
DROP INDEX IF EXISTS "api_keys_expires_at_idx";
DROP INDEX IF EXISTS "api_keys_last_used_at_idx";
DROP INDEX IF EXISTS "webhooks_is_active_idx";
DROP INDEX IF EXISTS "webhooks_last_triggered_at_idx";
DROP INDEX IF EXISTS "webhook_events_webhook_id_idx";
DROP INDEX IF EXISTS "webhook_events_status_idx";
DROP INDEX IF EXISTS "webhook_events_created_at_idx";
DROP INDEX IF EXISTS "webhook_events_webhook_id_created_at_idx";

-- Drop unique constraints
DROP INDEX IF EXISTS "api_keys_key_key";

-- Drop tables
DROP TABLE IF EXISTS "webhook_events";
DROP TABLE IF EXISTS "webhooks";
DROP TABLE IF EXISTS "api_keys";
