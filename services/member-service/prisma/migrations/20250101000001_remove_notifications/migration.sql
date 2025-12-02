-- Drop indexes first
DROP INDEX IF EXISTS "notifications_member_id_idx";
DROP INDEX IF EXISTS "notifications_member_id_is_read_idx";
DROP INDEX IF EXISTS "notifications_member_id_type_idx";
DROP INDEX IF EXISTS "notifications_is_read_idx";
DROP INDEX IF EXISTS "notifications_type_idx";
DROP INDEX IF EXISTS "notifications_created_at_idx";
DROP INDEX IF EXISTS "notifications_send_at_idx";

-- Drop foreign key constraint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_member_id_fkey";

-- Drop the notifications table
DROP TABLE IF EXISTS "notifications";

-- Drop the NotificationType enum
DROP TYPE IF EXISTS "NotificationType";



















