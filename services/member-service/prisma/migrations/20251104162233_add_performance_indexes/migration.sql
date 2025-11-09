-- CreateIndex
CREATE INDEX "achievements_member_id_idx" ON "achievements"("member_id");

-- CreateIndex
CREATE INDEX "achievements_member_id_category_idx" ON "achievements"("member_id", "category");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "achievements_unlocked_at_idx" ON "achievements"("unlocked_at");

-- CreateIndex
CREATE INDEX "equipment_usage_member_id_idx" ON "equipment_usage"("member_id");

-- CreateIndex
CREATE INDEX "equipment_usage_equipment_id_idx" ON "equipment_usage"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_usage_member_id_equipment_id_idx" ON "equipment_usage"("member_id", "equipment_id");

-- CreateIndex
CREATE INDEX "equipment_usage_member_id_start_time_idx" ON "equipment_usage"("member_id", "start_time");

-- CreateIndex
CREATE INDEX "equipment_usage_start_time_idx" ON "equipment_usage"("start_time");

-- CreateIndex
CREATE INDEX "equipment_usage_end_time_idx" ON "equipment_usage"("end_time");

-- CreateIndex
CREATE INDEX "equipment_usage_session_id_idx" ON "equipment_usage"("session_id");

-- CreateIndex
CREATE INDEX "gym_sessions_member_id_idx" ON "gym_sessions"("member_id");

-- CreateIndex
CREATE INDEX "gym_sessions_member_id_entry_time_idx" ON "gym_sessions"("member_id", "entry_time");

-- CreateIndex
CREATE INDEX "gym_sessions_entry_time_idx" ON "gym_sessions"("entry_time");

-- CreateIndex
CREATE INDEX "gym_sessions_exit_time_idx" ON "gym_sessions"("exit_time");

-- CreateIndex
CREATE INDEX "gym_sessions_entry_method_idx" ON "gym_sessions"("entry_method");

-- CreateIndex
CREATE INDEX "health_metrics_member_id_idx" ON "health_metrics"("member_id");

-- CreateIndex
CREATE INDEX "health_metrics_member_id_metric_type_idx" ON "health_metrics"("member_id", "metric_type");

-- CreateIndex
CREATE INDEX "health_metrics_member_id_recorded_at_idx" ON "health_metrics"("member_id", "recorded_at");

-- CreateIndex
CREATE INDEX "health_metrics_recorded_at_idx" ON "health_metrics"("recorded_at");

-- CreateIndex
CREATE INDEX "health_metrics_metric_type_idx" ON "health_metrics"("metric_type");

-- CreateIndex
CREATE INDEX "members_membership_status_idx" ON "members"("membership_status");

-- CreateIndex
CREATE INDEX "members_membership_type_idx" ON "members"("membership_type");

-- CreateIndex
CREATE INDEX "members_membership_status_membership_type_idx" ON "members"("membership_status", "membership_type");

-- CreateIndex
CREATE INDEX "members_created_at_idx" ON "members"("created_at");

-- CreateIndex
CREATE INDEX "members_updated_at_idx" ON "members"("updated_at");

-- CreateIndex
CREATE INDEX "members_expires_at_idx" ON "members"("expires_at");

-- CreateIndex
CREATE INDEX "members_access_enabled_idx" ON "members"("access_enabled");

-- CreateIndex
CREATE INDEX "members_onboarding_completed_idx" ON "members"("onboarding_completed");

-- CreateIndex
CREATE INDEX "memberships_member_id_idx" ON "memberships"("member_id");

-- CreateIndex
CREATE INDEX "memberships_status_idx" ON "memberships"("status");

-- CreateIndex
CREATE INDEX "memberships_member_id_status_idx" ON "memberships"("member_id", "status");

-- CreateIndex
CREATE INDEX "memberships_start_date_idx" ON "memberships"("start_date");

-- CreateIndex
CREATE INDEX "memberships_end_date_idx" ON "memberships"("end_date");

-- CreateIndex
CREATE INDEX "memberships_created_at_idx" ON "memberships"("created_at");

-- CreateIndex
CREATE INDEX "notifications_member_id_idx" ON "notifications"("member_id");

-- CreateIndex
CREATE INDEX "notifications_member_id_is_read_idx" ON "notifications"("member_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_member_id_type_idx" ON "notifications"("member_id", "type");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_send_at_idx" ON "notifications"("send_at");

-- CreateIndex
CREATE INDEX "workout_plans_member_id_idx" ON "workout_plans"("member_id");

-- CreateIndex
CREATE INDEX "workout_plans_member_id_is_active_idx" ON "workout_plans"("member_id", "is_active");

-- CreateIndex
CREATE INDEX "workout_plans_is_active_idx" ON "workout_plans"("is_active");

-- CreateIndex
CREATE INDEX "workout_plans_created_at_idx" ON "workout_plans"("created_at");
