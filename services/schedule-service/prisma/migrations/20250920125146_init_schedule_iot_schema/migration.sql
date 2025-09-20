-- CreateEnum
CREATE TYPE "public"."InstructorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "public"."CertStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."ClassCategory" AS ENUM ('CARDIO', 'STRENGTH', 'YOGA', 'PILATES', 'DANCE', 'MARTIAL_ARTS', 'AQUA', 'FUNCTIONAL', 'RECOVERY', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'RESERVED');

-- CreateEnum
CREATE TYPE "public"."SensorType" AS ENUM ('TEMPERATURE', 'HUMIDITY', 'AIR_QUALITY', 'NOISE_LEVEL', 'OCCUPANCY', 'LIGHT_LEVEL');

-- CreateEnum
CREATE TYPE "public"."SensorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'WAITLIST', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AttendanceMethod" AS ENUM ('MANUAL', 'RFID', 'QR_CODE', 'FACE_RECOGNITION', 'MOBILE_APP');

-- CreateEnum
CREATE TYPE "public"."FeedbackCategory" AS ENUM ('INSTRUCTION_QUALITY', 'CLASS_CONTENT', 'COMMUNICATION', 'PUNCTUALITY', 'PROFESSIONALISM', 'MOTIVATION', 'OVERALL');

-- CreateTable
CREATE TABLE "public"."instructors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "specializations" TEXT[],
    "bio" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(10,2),
    "profile_photo" TEXT,
    "status" "public"."InstructorStatus" NOT NULL DEFAULT 'ACTIVE',
    "availability" JSONB,
    "max_classes_per_day" INTEGER NOT NULL DEFAULT 8,
    "preferred_time_slots" TEXT[],
    "rating_average" DOUBLE PRECISION DEFAULT 0,
    "total_classes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certifications" (
    "id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "issued_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "certificate_url" TEXT,
    "status" "public"."CertStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gym_classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ClassCategory" NOT NULL,
    "duration" INTEGER NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 20,
    "difficulty" "public"."Difficulty" NOT NULL,
    "equipment_needed" TEXT[],
    "calories_per_session" INTEGER,
    "heart_rate_zones" JSONB,
    "music_playlist" TEXT,
    "room_requirements" JSONB,
    "price" DECIMAL(10,2),
    "credits_required" INTEGER,
    "thumbnail" TEXT,
    "video_preview" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_instructors" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "area_sqm" DOUBLE PRECISION,
    "equipment" TEXT[],
    "smart_controls" BOOLEAN NOT NULL DEFAULT false,
    "climate_control" BOOLEAN NOT NULL DEFAULT false,
    "sound_system" BOOLEAN NOT NULL DEFAULT false,
    "lighting_control" BOOLEAN NOT NULL DEFAULT false,
    "occupancy_sensors" BOOLEAN NOT NULL DEFAULT false,
    "temperature_sensor_id" TEXT,
    "humidity_sensor_id" TEXT,
    "air_quality_sensor_id" TEXT,
    "amenities" TEXT[],
    "floor_type" TEXT,
    "special_features" TEXT[],
    "status" "public"."RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maintenance_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."room_sensors" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sensor_type" "public"."SensorType" NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "current_value" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "last_reading" TIMESTAMP(3),
    "status" "public"."SensorStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "room_sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedules" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "instructor_id" TEXT,
    "room_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "recurrence" "public"."RecurrenceType",
    "recurrence_end" TIMESTAMP(3),
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "current_bookings" INTEGER NOT NULL DEFAULT 0,
    "max_capacity" INTEGER NOT NULL,
    "waitlist_count" INTEGER NOT NULL DEFAULT 0,
    "auto_confirm" BOOLEAN NOT NULL DEFAULT true,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "feedback_collected" BOOLEAN NOT NULL DEFAULT false,
    "room_prepared" BOOLEAN NOT NULL DEFAULT false,
    "equipment_checked" BOOLEAN NOT NULL DEFAULT false,
    "climate_optimized" BOOLEAN NOT NULL DEFAULT false,
    "price_override" DECIMAL(10,2),
    "special_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "payment_status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "credits_used" INTEGER,
    "amount_paid" DECIMAL(10,2),
    "special_needs" TEXT,
    "is_waitlist" BOOLEAN NOT NULL DEFAULT false,
    "waitlist_position" INTEGER,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_attendance" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "attendance_method" "public"."AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
    "calories_burned" INTEGER,
    "heart_rate_avg" INTEGER,
    "heart_rate_max" INTEGER,
    "workout_intensity" DOUBLE PRECISION,
    "class_rating" INTEGER,
    "instructor_rating" INTEGER,
    "feedback_notes" TEXT,
    "sensor_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."instructor_feedback" (
    "id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "rating" INTEGER NOT NULL,
    "category" "public"."FeedbackCategory" NOT NULL,
    "comments" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructor_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments_ref" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_ref_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instructors_user_id_key" ON "public"."instructors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "instructors_phone_key" ON "public"."instructors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "instructors_email_key" ON "public"."instructors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "class_instructors_class_id_instructor_id_role_key" ON "public"."class_instructors"("class_id", "instructor_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "public"."rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_temperature_sensor_id_key" ON "public"."rooms"("temperature_sensor_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_humidity_sensor_id_key" ON "public"."rooms"("humidity_sensor_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_air_quality_sensor_id_key" ON "public"."rooms"("air_quality_sensor_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_schedule_id_member_id_key" ON "public"."bookings"("schedule_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_schedule_id_member_id_key" ON "public"."attendance"("schedule_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ref_booking_id_key" ON "public"."payments_ref"("booking_id");

-- AddForeignKey
ALTER TABLE "public"."certifications" ADD CONSTRAINT "certifications_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_instructors" ADD CONSTRAINT "class_instructors_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."gym_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_instructors" ADD CONSTRAINT "class_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_sensors" ADD CONSTRAINT "room_sensors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."gym_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instructor_feedback" ADD CONSTRAINT "instructor_feedback_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments_ref" ADD CONSTRAINT "payments_ref_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
