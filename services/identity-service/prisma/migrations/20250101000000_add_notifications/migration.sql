-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'CERTIFICATION_UPLOAD',
  'CERTIFICATION_VERIFIED',
  'CERTIFICATION_REJECTED',
  'CERTIFICATION_AUTO_VERIFIED',
  'CERTIFICATION_EXPIRED',
  'CERTIFICATION_PENDING',
  'CLASS_BOOKING',
  'CLASS_CANCELLED',
  'CLASS_REMINDER',
  'WAITLIST_ADDED',
  'WAITLIST_PROMOTED',
  'SCHEDULE_CANCELLED',
  'SCHEDULE_CREATED',
  'SCHEDULE_UPDATED',
  'ROOM_CHANGED',
  'MEMBER_CHECKED_IN',
  'MEMBERSHIP_EXPIRING',
  'MEMBERSHIP_EXPIRED',
  'MEMBERSHIP_RENEWED',
  'MEMBER_REGISTERED',
  'MEMBER_UPDATED',
  'MEMBER_DELETED',
  'ACHIEVEMENT_UNLOCKED',
  'REWARD_REDEMPTION',
  'SYSTEM_ANNOUNCEMENT',
  'GENERAL'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_is_read_created_at_idx" ON "notifications"("is_read", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;








