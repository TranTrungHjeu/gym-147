-- Add NotificationHistory table for tracking bulk notification sends
SET search_path TO identity_schema, public;

-- Create enum for NotificationTargetType if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "identity_schema"."NotificationTargetType" AS ENUM ('MEMBER', 'TRAINER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table notification_historys
CREATE TABLE IF NOT EXISTS "identity_schema"."notification_historys" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_role" "Role" NOT NULL,
    "target_type" "NotificationTargetType" NOT NULL,
    "target_ids" JSONB,
    "filters" JSONB,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "total_targets" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_historys_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "notification_historys_sender_id_idx" ON "identity_schema"."notification_historys"("sender_id");
CREATE INDEX IF NOT EXISTS "notification_historys_sender_role_idx" ON "identity_schema"."notification_historys"("sender_role");
CREATE INDEX IF NOT EXISTS "notification_historys_target_type_idx" ON "identity_schema"."notification_historys"("target_type");
CREATE INDEX IF NOT EXISTS "notification_historys_created_at_idx" ON "identity_schema"."notification_historys"("created_at");
CREATE INDEX IF NOT EXISTS "notification_historys_sender_id_created_at_idx" ON "identity_schema"."notification_historys"("sender_id", "created_at");

