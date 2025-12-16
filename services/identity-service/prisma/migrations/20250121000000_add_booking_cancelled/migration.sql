-- Add BOOKING_CANCELLED notification type
-- Migration: 20250121000000_add_booking_cancelled
-- Description: Add BOOKING_CANCELLED to NotificationType enum

SET search_path TO identity_schema, public;

-- Add BOOKING_CANCELLED enum value (only if it doesn't exist)
DO $$ 
DECLARE
    enum_type_oid OID;
BEGIN
    -- Get the enum type OID for identity_schema.NotificationType
    SELECT t.oid INTO enum_type_oid
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'identity_schema' AND t.typname = 'NotificationType'
    LIMIT 1;

    -- If enum type not found, skip (should not happen)
    IF enum_type_oid IS NULL THEN
        RAISE WARNING 'NotificationType enum not found in identity_schema';
        RETURN;
    END IF;

    -- Add BOOKING_CANCELLED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOOKING_CANCELLED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'BOOKING_CANCELLED';
    END IF;
END $$;





