-- Add missing NotificationType enum values
-- Migration: 20251210000000_add_missing_notification_types
-- Description: Add QUEUE_JOINED, QUEUE_YOUR_TURN, EQUIPMENT_AVAILABLE, and other missing notification types

SET search_path TO identity_schema, public;

-- Add missing enum values (only if they don't exist)
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

    -- Add QUEUE_JOINED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'QUEUE_JOINED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'QUEUE_JOINED';
    END IF;

    -- Add QUEUE_POSITION_UPDATED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'QUEUE_POSITION_UPDATED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'QUEUE_POSITION_UPDATED';
    END IF;

    -- Add QUEUE_EXPIRED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'QUEUE_EXPIRED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'QUEUE_EXPIRED';
    END IF;

    -- Add QUEUE_YOUR_TURN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'QUEUE_YOUR_TURN' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'QUEUE_YOUR_TURN';
    END IF;

    -- Add EQUIPMENT_AVAILABLE
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EQUIPMENT_AVAILABLE' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'EQUIPMENT_AVAILABLE';
    END IF;

    -- Add EQUIPMENT_MAINTENANCE_SCHEDULED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EQUIPMENT_MAINTENANCE_SCHEDULED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'EQUIPMENT_MAINTENANCE_SCHEDULED';
    END IF;

    -- Add EQUIPMENT_MAINTENANCE_COMPLETED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EQUIPMENT_MAINTENANCE_COMPLETED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'EQUIPMENT_MAINTENANCE_COMPLETED';
    END IF;

    -- Add CERTIFICATION_DELETED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CERTIFICATION_DELETED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'CERTIFICATION_DELETED';
    END IF;

    -- Add BOOKING_UPDATED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOOKING_UPDATED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'BOOKING_UPDATED';
    END IF;

    -- Add PAYMENT_SUCCESS
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_SUCCESS' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'PAYMENT_SUCCESS';
    END IF;

    -- Add PAYMENT_FAILED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_FAILED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'PAYMENT_FAILED';
    END IF;

    -- Add PAYMENT_REMINDER
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_REMINDER' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'PAYMENT_REMINDER';
    END IF;

    -- Add SUBSCRIPTION_CREATED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBSCRIPTION_CREATED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'SUBSCRIPTION_CREATED';
    END IF;

    -- Add SUBSCRIPTION_RENEWED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBSCRIPTION_RENEWED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'SUBSCRIPTION_RENEWED';
    END IF;

    -- Add SUBSCRIPTION_EXPIRED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBSCRIPTION_EXPIRED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'SUBSCRIPTION_EXPIRED';
    END IF;

    -- Add SUBSCRIPTION_UPGRADED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBSCRIPTION_UPGRADED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'SUBSCRIPTION_UPGRADED';
    END IF;

    -- Add INVOICE_GENERATED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVOICE_GENERATED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'INVOICE_GENERATED';
    END IF;

    -- Add INVOICE_OVERDUE
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVOICE_OVERDUE' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'INVOICE_OVERDUE';
    END IF;

    -- Add TRAINER_DELETED
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRAINER_DELETED' AND enumtypid = enum_type_oid) THEN
        ALTER TYPE "identity_schema"."NotificationType" ADD VALUE 'TRAINER_DELETED';
    END IF;
END $$;

