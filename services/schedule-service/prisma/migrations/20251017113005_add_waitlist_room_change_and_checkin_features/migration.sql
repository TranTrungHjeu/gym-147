-- CreateEnum
CREATE TYPE "FavoriteType" AS ENUM ('CLASS', 'TRAINER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('SELF', 'TRAINER_MANUAL');

-- CreateEnum
CREATE TYPE "CheckOutMethod" AS ENUM ('SELF', 'TRAINER_MANUAL', 'AUTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'WAITLIST_ADDED';
ALTER TYPE "NotificationType" ADD VALUE 'WAITLIST_PROMOTED';
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'ROOM_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_CHECKED_IN';

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "check_in_method" "CheckInMethod" NOT NULL DEFAULT 'SELF',
ADD COLUMN     "check_out_method" "CheckOutMethod" NOT NULL DEFAULT 'SELF',
ADD COLUMN     "is_auto_checkout" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "auto_checkout_at" TIMESTAMP(3),
ADD COLUMN     "auto_checkout_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "check_in_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "check_in_opened_at" TIMESTAMP(3),
ADD COLUMN     "check_in_opened_by" TEXT;

-- CreateTable
CREATE TABLE "member_favorites" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "favorite_type" "FavoriteType" NOT NULL,
    "favorite_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_change_requests" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "current_room_id" TEXT NOT NULL,
    "requested_room_id" TEXT,
    "reason" TEXT NOT NULL,
    "waitlist_count" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_favorites_member_id_favorite_type_favorite_id_key" ON "member_favorites"("member_id", "favorite_type", "favorite_id");

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
