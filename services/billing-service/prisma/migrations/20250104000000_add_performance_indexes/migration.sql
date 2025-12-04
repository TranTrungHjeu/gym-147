-- Add performance indexes for billing service

-- Payment indexes
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "billing_schema"."payments"("status");
CREATE INDEX IF NOT EXISTS "payments_member_id_idx" ON "billing_schema"."payments"("member_id");
CREATE INDEX IF NOT EXISTS "payments_subscription_id_idx" ON "billing_schema"."payments"("subscription_id");
CREATE INDEX IF NOT EXISTS "payments_payment_type_idx" ON "billing_schema"."payments"("payment_type");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "billing_schema"."payments"("created_at");
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx" ON "billing_schema"."payments"("status", "created_at");
CREATE INDEX IF NOT EXISTS "payments_member_id_created_at_idx" ON "billing_schema"."payments"("member_id", "created_at");
CREATE INDEX IF NOT EXISTS "payments_payment_type_status_idx" ON "billing_schema"."payments"("payment_type", "status");

-- Subscription indexes
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "billing_schema"."subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_member_id_idx" ON "billing_schema"."subscriptions"("member_id");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "billing_schema"."subscriptions"("plan_id");
CREATE INDEX IF NOT EXISTS "subscriptions_created_at_idx" ON "billing_schema"."subscriptions"("created_at");
CREATE INDEX IF NOT EXISTS "subscriptions_status_created_at_idx" ON "billing_schema"."subscriptions"("status", "created_at");

-- Invoice indexes
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "billing_schema"."invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_member_id_idx" ON "billing_schema"."invoices"("member_id");
CREATE INDEX IF NOT EXISTS "invoices_subscription_id_idx" ON "billing_schema"."invoices"("subscription_id");
CREATE INDEX IF NOT EXISTS "invoices_type_idx" ON "billing_schema"."invoices"("type");
CREATE INDEX IF NOT EXISTS "invoices_created_at_idx" ON "billing_schema"."invoices"("created_at");
CREATE INDEX IF NOT EXISTS "invoices_status_created_at_idx" ON "billing_schema"."invoices"("status", "created_at");
CREATE INDEX IF NOT EXISTS "invoices_member_id_created_at_idx" ON "billing_schema"."invoices"("member_id", "created_at");

-- MembershipPlan indexes
CREATE INDEX IF NOT EXISTS "membership_plans_is_active_idx" ON "billing_schema"."membership_plans"("is_active");
CREATE INDEX IF NOT EXISTS "membership_plans_is_featured_idx" ON "billing_schema"."membership_plans"("is_featured");
CREATE INDEX IF NOT EXISTS "membership_plans_type_idx" ON "billing_schema"."membership_plans"("type");
CREATE INDEX IF NOT EXISTS "membership_plans_is_active_is_featured_idx" ON "billing_schema"."membership_plans"("is_active", "is_featured");
CREATE INDEX IF NOT EXISTS "membership_plans_created_at_idx" ON "billing_schema"."membership_plans"("created_at");

-- PlanAddon indexes
CREATE INDEX IF NOT EXISTS "plan_addons_plan_id_idx" ON "billing_schema"."plan_addons"("plan_id");
CREATE INDEX IF NOT EXISTS "plan_addons_is_active_idx" ON "billing_schema"."plan_addons"("is_active");
CREATE INDEX IF NOT EXISTS "plan_addons_plan_id_is_active_idx" ON "billing_schema"."plan_addons"("plan_id", "is_active");

-- Refund indexes
CREATE INDEX IF NOT EXISTS "refunds_payment_id_idx" ON "billing_schema"."refunds"("payment_id");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "billing_schema"."refunds"("status");
CREATE INDEX IF NOT EXISTS "refunds_requested_by_idx" ON "billing_schema"."refunds"("requested_by");
CREATE INDEX IF NOT EXISTS "refunds_created_at_idx" ON "billing_schema"."refunds"("created_at");
CREATE INDEX IF NOT EXISTS "refunds_status_created_at_idx" ON "billing_schema"."refunds"("status", "created_at");

-- DiscountUsage indexes
CREATE INDEX IF NOT EXISTS "discount_usage_discount_code_id_idx" ON "billing_schema"."discount_usage"("discount_code_id");
CREATE INDEX IF NOT EXISTS "discount_usage_member_id_idx" ON "billing_schema"."discount_usage"("member_id");
CREATE INDEX IF NOT EXISTS "discount_usage_used_at_idx" ON "billing_schema"."discount_usage"("used_at");
CREATE INDEX IF NOT EXISTS "discount_usage_member_id_used_at_idx" ON "billing_schema"."discount_usage"("member_id", "used_at");

-- SubscriptionHistory indexes
CREATE INDEX IF NOT EXISTS "subscription_history_created_at_idx" ON "billing_schema"."subscription_history"("created_at");
CREATE INDEX IF NOT EXISTS "subscription_history_member_id_created_at_idx" ON "billing_schema"."subscription_history"("member_id", "created_at");
CREATE INDEX IF NOT EXISTS "subscription_history_to_status_created_at_idx" ON "billing_schema"."subscription_history"("to_status", "created_at");

-- RevenueReport indexes
CREATE INDEX IF NOT EXISTS "revenue_reports_report_date_idx" ON "billing_schema"."revenue_reports"("report_date");
CREATE INDEX IF NOT EXISTS "revenue_reports_created_at_idx" ON "billing_schema"."revenue_reports"("created_at");
