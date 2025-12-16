-- Remove Backup table
-- Migration: 20250106000000_remove_backup
-- Description: Remove Backup model as it's not needed for this system

-- Drop indexes first
DROP INDEX IF EXISTS "backups_status_idx";
DROP INDEX IF EXISTS "backups_created_at_idx";
DROP INDEX IF EXISTS "backups_type_idx";

-- Drop the backups table
DROP TABLE IF EXISTS "backups";










