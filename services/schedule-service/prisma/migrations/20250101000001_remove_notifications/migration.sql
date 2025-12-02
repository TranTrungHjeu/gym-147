-- Drop indexes first
DROP INDEX IF EXISTS "notifications_user_id_idx";
DROP INDEX IF EXISTS "notifications_type_idx";
DROP INDEX IF EXISTS "notifications_is_read_idx";
DROP INDEX IF EXISTS "notifications_created_at_idx";

-- Drop the notifications table
DROP TABLE IF EXISTS "notifications";

-- Drop the NotificationType enum
DROP TYPE IF EXISTS "NotificationType";



















