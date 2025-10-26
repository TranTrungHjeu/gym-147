-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PREMIUM', 'VIP', 'STUDENT');

-- CreateEnum
CREATE TYPE "AddonType" AS ENUM ('PERSONAL_TRAINING', 'NUTRITION_CONSULTATION', 'GUEST_PASS', 'EQUIPMENT_RENTAL', 'MASSAGE_THERAPY', 'LOCKER_RENTAL', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'VNPAY', 'MOMO', 'ZALO_PAY', 'CASH', 'CRYPTO');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'CLASS_BOOKING', 'ADDON_PURCHASE', 'LATE_FEE', 'EQUIPMENT_DAMAGE', 'GUEST_PASS', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('MEMBER_REQUEST', 'SERVICE_ISSUE', 'BILLING_ERROR', 'CANCELLATION', 'EQUIPMENT_ISSUE', 'CLASS_CANCELLED', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_TRIAL', 'FIRST_MONTH_FREE');

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PlanType" NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "setup_fee" DECIMAL(10,2),
    "benefits" TEXT[],
    "class_credits" INTEGER,
    "guest_passes" INTEGER NOT NULL DEFAULT 0,
    "access_hours" JSONB,
    "access_areas" TEXT[],
    "equipment_priority" BOOLEAN NOT NULL DEFAULT false,
    "personal_training_sessions" INTEGER NOT NULL DEFAULT 0,
    "nutritionist_consultations" INTEGER NOT NULL DEFAULT 0,
    "smart_workout_plans" BOOLEAN NOT NULL DEFAULT false,
    "wearable_integration" BOOLEAN NOT NULL DEFAULT false,
    "advanced_analytics" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "max_members" INTEGER,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "billing_interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "cancellation_policy" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_addons" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "addon_type" "AddonType" NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_billing_date" TIMESTAMP(3) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2),
    "tax_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "classes_used" INTEGER NOT NULL DEFAULT 0,
    "classes_remaining" INTEGER,
    "guest_passes_used" INTEGER NOT NULL DEFAULT 0,
    "pt_sessions_used" INTEGER NOT NULL DEFAULT 0,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "payment_method_id" TEXT,
    "failed_payments" INTEGER NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "cancelled_by" TEXT,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_addons" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "addon_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod" NOT NULL,
    "transaction_id" TEXT,
    "gateway" TEXT,
    "gateway_fee" DECIMAL(10,2),
    "net_amount" DECIMAL(10,2) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "reference_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "refunded_amount" DECIMAL(10,2),
    "refunded_at" TIMESTAMP(3),
    "refund_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "payment_id" TEXT,
    "member_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "InvoiceType" NOT NULL DEFAULT 'SUBSCRIPTION',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,4),
    "tax_amount" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "issued_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_date" TIMESTAMP(3),
    "line_items" JSONB NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "max_discount" DECIMAL(10,2),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "usage_limit_per_member" INTEGER,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "applicable_plans" TEXT[],
    "minimum_amount" DECIMAL(10,2),
    "first_time_only" BOOLEAN NOT NULL DEFAULT false,
    "referrer_member_id" TEXT,
    "bonus_days" INTEGER,
    "referral_reward" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_usage" (
    "id" TEXT NOT NULL,
    "discount_code_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "amount_discounted" DECIMAL(10,2) NOT NULL,
    "bonus_days_added" INTEGER,
    "referrer_member_id" TEXT,
    "referrer_reward" DECIMAL(10,2),
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_reports" (
    "id" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "subscription_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "class_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "addon_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "new_members" INTEGER NOT NULL DEFAULT 0,
    "cancelled_members" INTEGER NOT NULL DEFAULT 0,
    "active_members" INTEGER NOT NULL DEFAULT 0,
    "successful_payments" INTEGER NOT NULL DEFAULT 0,
    "failed_payments" INTEGER NOT NULL DEFAULT 0,
    "refunds_issued" INTEGER NOT NULL DEFAULT 0,
    "refunds_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "from_plan_id" TEXT,
    "to_plan_id" TEXT NOT NULL,
    "from_status" "SubscriptionStatus",
    "to_status" "SubscriptionStatus" NOT NULL,
    "old_price" DECIMAL(10,2),
    "new_price" DECIMAL(10,2) NOT NULL,
    "price_difference" DECIMAL(10,2) NOT NULL,
    "change_reason" TEXT,
    "changed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_lifetime_values" (
    "member_id" TEXT NOT NULL,
    "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avg_monthly_spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "predicted_ltv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subscription_months" INTEGER NOT NULL DEFAULT 0,
    "total_renewals" INTEGER NOT NULL DEFAULT 0,
    "total_upgrades" INTEGER NOT NULL DEFAULT 0,
    "total_downgrades" INTEGER NOT NULL DEFAULT 0,
    "first_payment_date" TIMESTAMP(3),
    "last_payment_date" TIMESTAMP(3),
    "next_expected_payment" TIMESTAMP(3),
    "churn_risk_score" DOUBLE PRECISION,
    "engagement_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_lifetime_values_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "member_payment_methods" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" "PaymentMethod" NOT NULL,
    "provider" TEXT,
    "external_id" TEXT,
    "last_four" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_name_key" ON "membership_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_member_id_key" ON "subscriptions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_reports_report_date_key" ON "revenue_reports"("report_date");

-- CreateIndex
CREATE INDEX "subscription_history_subscription_id_idx" ON "subscription_history"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_history_member_id_idx" ON "subscription_history"("member_id");

-- AddForeignKey
ALTER TABLE "plan_addons" ADD CONSTRAINT "plan_addons_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
