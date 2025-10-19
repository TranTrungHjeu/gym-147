-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('BASIC', 'PREMIUM', 'VIP', 'STUDENT');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('RFID', 'QR_CODE', 'FACE_RECOGNITION', 'MANUAL', 'MOBILE_APP');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('WEIGHT', 'HEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'BMI', 'HEART_RATE', 'BLOOD_PRESSURE', 'FLEXIBILITY', 'ENDURANCE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WORKOUT_REMINDER', 'MEMBERSHIP_EXPIRY', 'PAYMENT_DUE', 'CLASS_BOOKING', 'ACHIEVEMENT', 'MAINTENANCE', 'PROMOTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('CARDIO', 'STRENGTH', 'FREE_WEIGHTS', 'FUNCTIONAL', 'STRETCHING', 'RECOVERY', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER', 'RESERVED');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "membership_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender",
    "address" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "body_fat_percent" DOUBLE PRECISION,
    "fitness_goals" TEXT[],
    "medical_conditions" TEXT[],
    "allergies" TEXT[],
    "membership_status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "membership_type" "MembershipType" NOT NULL DEFAULT 'BASIC',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "rfid_tag" TEXT,
    "qr_code" TEXT,
    "access_enabled" BOOLEAN NOT NULL DEFAULT true,
    "profile_photo" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" "MembershipType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "price" DECIMAL(10,2) NOT NULL,
    "benefits" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_sessions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exit_time" TIMESTAMP(3),
    "duration" INTEGER,
    "entry_method" "AccessMethod" NOT NULL,
    "exit_method" "AccessMethod",
    "entry_gate" TEXT,
    "exit_gate" TEXT,
    "calories_burned" INTEGER,
    "session_rating" INTEGER,
    "notes" TEXT,

    CONSTRAINT "gym_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_usage" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "duration" INTEGER,
    "calories_burned" INTEGER,
    "sets_completed" INTEGER,
    "weight_used" DOUBLE PRECISION,
    "reps_completed" INTEGER,
    "heart_rate_avg" INTEGER,
    "heart_rate_max" INTEGER,
    "sensor_data" JSONB,

    CONSTRAINT "equipment_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "metric_type" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "goal" TEXT NOT NULL,
    "exercises" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "badge_icon" TEXT,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "send_at" TIMESTAMP(3),
    "channels" TEXT[],
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "warranty_until" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sensor_id" TEXT,
    "last_maintenance" TIMESTAMP(3),
    "next_maintenance" TIMESTAMP(3),
    "usage_hours" INTEGER NOT NULL DEFAULT 0,
    "max_weight" DOUBLE PRECISION,
    "has_heart_monitor" BOOLEAN NOT NULL DEFAULT false,
    "has_calorie_counter" BOOLEAN NOT NULL DEFAULT false,
    "has_rep_counter" BOOLEAN NOT NULL DEFAULT false,
    "wifi_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "cost" DECIMAL(10,2),
    "parts_replaced" TEXT[],
    "next_due" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings_ref" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "bookings_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments_ref" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions_ref" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_ref_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_membership_number_key" ON "members"("membership_number");

-- CreateIndex
CREATE UNIQUE INDEX "members_phone_key" ON "members"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_rfid_tag_key" ON "members"("rfid_tag");

-- CreateIndex
CREATE UNIQUE INDEX "members_qr_code_key" ON "members"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serial_number_key" ON "equipment"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_sensor_id_key" ON "equipment"("sensor_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_sessions" ADD CONSTRAINT "gym_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings_ref" ADD CONSTRAINT "bookings_ref_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments_ref" ADD CONSTRAINT "payments_ref_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions_ref" ADD CONSTRAINT "subscriptions_ref_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
