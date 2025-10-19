-- CreateEnum
CREATE TYPE "TrainerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ClassCategory" AS ENUM ('CARDIO', 'STRENGTH', 'YOGA', 'PILATES', 'DANCE', 'MARTIAL_ARTS', 'AQUA', 'FUNCTIONAL', 'RECOVERY', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'RESERVED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'WAITLIST', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('MANUAL', 'QR_CODE', 'MOBILE_APP');

-- CreateEnum
CREATE TYPE "CertificationLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "trainers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "specializations" "ClassCategory"[],
    "bio" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(10,2),
    "profile_photo" TEXT,
    "status" "TrainerStatus" NOT NULL DEFAULT 'ACTIVE',
    "rating_average" DOUBLE PRECISION DEFAULT 0,
    "total_classes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ClassCategory" NOT NULL,
    "duration" INTEGER NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 20,
    "difficulty" "Difficulty" NOT NULL,
    "equipment_needed" TEXT[],
    "price" DECIMAL(10,2),
    "thumbnail" TEXT,
    "required_certification_level" "CertificationLevel" NOT NULL DEFAULT 'BASIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "area_sqm" DOUBLE PRECISION,
    "equipment" TEXT[],
    "amenities" TEXT[],
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maintenance_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "trainer_id" TEXT,
    "room_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "current_bookings" INTEGER NOT NULL DEFAULT 0,
    "max_capacity" INTEGER NOT NULL,
    "waitlist_count" INTEGER NOT NULL DEFAULT 0,
    "price_override" DECIMAL(10,2),
    "special_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount_paid" DECIMAL(10,2),
    "special_needs" TEXT,
    "is_waitlist" BOOLEAN NOT NULL DEFAULT false,
    "waitlist_position" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "attendance_method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
    "class_rating" INTEGER,
    "trainer_rating" INTEGER,
    "feedback_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_certifications" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "category" "ClassCategory" NOT NULL,
    "certification_name" TEXT NOT NULL,
    "certification_issuer" TEXT NOT NULL,
    "certification_level" "CertificationLevel" NOT NULL DEFAULT 'BASIC',
    "issued_date" TIMESTAMP(3) NOT NULL,
    "expiration_date" TIMESTAMP(3),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "certificate_file_url" TEXT,
    "certificate_file_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainers_user_id_key" ON "trainers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_phone_key" ON "trainers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_email_key" ON "trainers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_schedule_id_member_id_key" ON "bookings"("schedule_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_schedule_id_member_id_key" ON "attendance"("schedule_id", "member_id");

-- CreateIndex
CREATE INDEX "trainer_certifications_trainer_id_idx" ON "trainer_certifications"("trainer_id");

-- CreateIndex
CREATE INDEX "trainer_certifications_category_idx" ON "trainer_certifications"("category");

-- CreateIndex
CREATE INDEX "trainer_certifications_verification_status_idx" ON "trainer_certifications"("verification_status");

-- CreateIndex
CREATE INDEX "trainer_certifications_expiration_date_idx" ON "trainer_certifications"("expiration_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_active_certification_per_category" ON "trainer_certifications"("trainer_id", "category");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "gym_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_certifications" ADD CONSTRAINT "trainer_certifications_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Migration: Add rating validation and auto-update triggers

-- 1. Tạo function để validate rating (1-5)
CREATE OR REPLACE FUNCTION validate_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate class_rating
    IF NEW.class_rating IS NOT NULL AND (NEW.class_rating < 1 OR NEW.class_rating > 5) THEN
        RAISE EXCEPTION 'class_rating must be between 1 and 5, got %', NEW.class_rating;
    END IF;
    
    -- Validate trainer_rating
    IF NEW.trainer_rating IS NOT NULL AND (NEW.trainer_rating < 1 OR NEW.trainer_rating > 5) THEN
        RAISE EXCEPTION 'trainer_rating must be between 1 and 5, got %', NEW.trainer_rating;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo function để cập nhật trainer rating_average
CREATE OR REPLACE FUNCTION update_trainer_rating()
RETURNS TRIGGER AS $$
DECLARE
    trainer_id_to_update TEXT;
    new_rating_average FLOAT;
BEGIN
    -- Xác định trainer_id cần cập nhật
    IF TG_OP = 'DELETE' THEN
        trainer_id_to_update := (
            SELECT s.trainer_id 
            FROM schedules s 
            WHERE s.id = OLD.schedule_id
        );
    ELSE
        trainer_id_to_update := (
            SELECT s.trainer_id 
            FROM schedules s 
            WHERE s.id = NEW.schedule_id
        );
    END IF;
    
    -- Chỉ cập nhật nếu có trainer_id
    IF trainer_id_to_update IS NOT NULL THEN
        -- Tính rating_average mới
        SELECT AVG(a.trainer_rating) INTO new_rating_average
        FROM attendance a
        JOIN schedules s ON a.schedule_id = s.id
        WHERE s.trainer_id = trainer_id_to_update 
          AND a.trainer_rating IS NOT NULL;
        
        -- Cập nhật trainer rating_average
        UPDATE trainers 
        SET rating_average = COALESCE(new_rating_average, 0),
            updated_at = NOW()
        WHERE id = trainer_id_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Tạo trigger để validate rating
DROP TRIGGER IF EXISTS trigger_validate_rating ON attendance;
CREATE TRIGGER trigger_validate_rating
    BEFORE INSERT OR UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating();

-- 4. Tạo trigger để cập nhật trainer rating khi có rating mới
DROP TRIGGER IF EXISTS trigger_update_trainer_rating_insert ON attendance;
CREATE TRIGGER trigger_update_trainer_rating_insert
    AFTER INSERT ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_trainer_rating();

-- 5. Tạo trigger để cập nhật trainer rating khi rating được update
DROP TRIGGER IF EXISTS trigger_update_trainer_rating_update ON attendance;
CREATE TRIGGER trigger_update_trainer_rating_update
    AFTER UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_trainer_rating();

-- 6. Tạo trigger để cập nhật trainer rating khi rating bị xóa
DROP TRIGGER IF EXISTS trigger_update_trainer_rating_delete ON attendance;
CREATE TRIGGER trigger_update_trainer_rating_delete
    AFTER DELETE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_trainer_rating();

-- 7. Cập nhật rating_average cho tất cả trainers hiện tại
UPDATE trainers 
SET rating_average = (
    SELECT COALESCE(AVG(a.trainer_rating), 0)
    FROM attendance a
    JOIN schedules s ON a.schedule_id = s.id
    WHERE s.trainer_id = trainers.id 
      AND a.trainer_rating IS NOT NULL
),
updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM attendance a
    JOIN schedules s ON a.schedule_id = s.id
    WHERE s.trainer_id = trainers.id 
      AND a.trainer_rating IS NOT NULL
);
-- 8. Tạo function để cập nhật trainer total_classes
CREATE OR REPLACE FUNCTION update_trainer_total_classes()
RETURNS TRIGGER AS $$
DECLARE
    trainer_id_to_update TEXT;
    new_total_classes INTEGER;
BEGIN
    -- Xác định trainer_id cần cập nhật
    IF TG_OP = 'DELETE' THEN
        trainer_id_to_update := OLD.trainer_id;
    ELSE
        trainer_id_to_update := NEW.trainer_id;
    END IF;
    
    -- Chỉ cập nhật nếu có trainer_id
    IF trainer_id_to_update IS NOT NULL THEN
        -- Tính total_classes mới (số lượng schedules đã hoàn thành)
        SELECT COUNT(*) INTO new_total_classes
        FROM schedules s
        WHERE s.trainer_id = trainer_id_to_update 
          AND s.status = 'COMPLETED';
        
        -- Cập nhật trainer total_classes
        UPDATE trainers 
        SET total_classes = new_total_classes,
            updated_at = NOW()
        WHERE id = trainer_id_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 9. Tạo trigger để cập nhật trainer total_classes khi schedule status thay đổi
DROP TRIGGER IF EXISTS trigger_update_trainer_total_classes ON schedules;
CREATE TRIGGER trigger_update_trainer_total_classes
    AFTER INSERT OR UPDATE OR DELETE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_trainer_total_classes();

-- 10. Cập nhật total_classes cho tất cả trainers hiện tại
UPDATE trainers 
SET total_classes = (
    SELECT COUNT(*)
    FROM schedules s
    WHERE s.trainer_id = trainers.id 
      AND s.status = 'COMPLETED'
),
updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.trainer_id = trainers.id 
      AND s.status = 'COMPLETED'
);
