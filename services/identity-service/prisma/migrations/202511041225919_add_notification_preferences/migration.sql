-- Migration: Add notification preferences columns
-- Note: These columns already exist in the database
-- This migration is for baseline synchronization

-- Add email_notifications_enabled column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_notifications_enabled'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Add sms_notifications_enabled column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'sms_notifications_enabled'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

