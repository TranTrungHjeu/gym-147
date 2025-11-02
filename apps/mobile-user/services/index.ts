// API Services
export { billingApiService } from './billing/api.service';
export { identityApiService } from './identity/api.service';
export { memberApiService } from './member/api.service';
export { scheduleApiService } from './schedule/api.service';

// Identity Services
export { authService } from './identity/auth.service';
export { userService } from './identity/user.service';

// Business Services
export { paymentService } from './billing/payment.service';
export { subscriptionService } from './billing/subscription.service';
export { youtubeVideoService } from './media/youtube-video.service';
export { accessService } from './member/access.service';
export { achievementService } from './member/achievement.service';
export { analyticsService } from './member/analytics.service';
export { equipmentService } from './member/equipment.service';
export { healthService } from './member/health.service';
export { memberService } from './member/member.service';
export { notificationService } from './member/notification.service';
export { bookingService } from './schedule/booking.service';
export { classService } from './schedule/class.service';
export { favoriteService } from './schedule/favorite.service';
export { scheduleService } from './schedule/schedule.service';
export { trainerService } from './schedule/trainer.service';
export { workoutPlanService } from './schedule/workout-plan.service';
export { workoutService } from './schedule/workout.service';

// Types
export type {
  AccessMethod,
  Gender,
  GymSession,
  HealthMetric,
  HealthSummary,
  HealthTrend,
  Member,
  MemberStats,
  MembershipStatus,
  MembershipType,
  MetricType,
} from '@/types/memberTypes';

export type {
  Difficulty,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutRecommendation,
} from '@/types/workoutTypes';

export type {
  Achievement,
  AchievementCategory,
  AchievementSummary,
  LeaderboardEntry,
} from '@/types/achievementTypes';

export type {
  DashboardData,
  HealthAnalytics,
  MemberAnalytics,
  SessionAnalytics,
} from './member/analytics.service';

export type {
  Attendance,
  Booking,
  BookingFilters,
  BookingStats,
  ClassCardProps,
  ClassCategory,
  ClassFilters,
  CreateBookingRequest,
  Difficulty,
  FavoriteType,
  GymClass,
  MemberFavorite,
  Room,
  Schedule,
  ScheduleFilters,
  ScheduleStats,
  Trainer,
  TrainerFilters,
} from '@/types/classTypes';

export type {
  AlertSeverity,
  AlertType,
  Equipment,
  EquipmentAnalytics,
  EquipmentCardProps,
  EquipmentCategory,
  EquipmentFilters,
  EquipmentListProps,
  EquipmentReservation,
  EquipmentStats,
  EquipmentStatus,
  EquipmentUsage,
  MaintenanceAlert,
  MaintenanceLog,
  MaintenanceSchedule,
  MaintenanceType,
  MemberEquipmentStats,
  ReservationStatus,
  StartEquipmentUsageRequest,
  StopEquipmentUsageRequest,
  UsageFilters,
  UsageHistoryProps,
  WorkoutLoggerProps,
  WorkoutSession,
  WorkoutSet,
} from '@/types/equipmentTypes';

export type {
  AddMetricRequest,
  HealthAnalytics,
  HealthBackupProps,
  HealthDashboardProps,
  HealthExportProps,
  HealthInsightsProps,
  HealthMetric,
  HealthMetricChartProps,
  HealthPrivacyProps,
  HealthReminderProps,
  HealthSummary,
  HealthSyncProps,
  HealthTrend,
  HealthTrendsProps,
  MetricCardProps,
  MetricComparisonProps,
  MetricDetailProps,
  MetricFilters,
  MetricGoal,
  MetricGoalProps,
  MetricType,
  TrendDirection,
  UpdateMetricRequest,
} from '@/types/healthTypes';

export type {
  AddonCardProps,
  AddonType,
  BillingDashboardProps,
  BillingInterval,
  CreatePaymentMethodRequest,
  CreatePaymentRequest,
  CreateSubscriptionRequest,
  DiscountCode,
  DiscountType,
  DiscountUsage,
  Invoice,
  InvoiceStatus,
  InvoiceType,
  MemberPaymentMethod,
  MembershipPlan,
  Payment,
  PaymentFilters,
  PaymentHistoryProps,
  PaymentMethod,
  PaymentMethodCardProps,
  PaymentStatus,
  PaymentType,
  PlanCardProps,
  PlanType,
  Refund,
  RefundReason,
  RefundStatus,
  RevenueReport,
  Subscription,
  SubscriptionAddon,
  SubscriptionCardProps,
  SubscriptionFilters,
  SubscriptionManagementProps,
  SubscriptionStatus,
  UpdateSubscriptionRequest,
} from '@/types/billingTypes';

export type {
  CreateNotificationRequest,
  Notification,
  NotificationAnalyticsProps,
  NotificationBadgeProps,
  NotificationBulkActionsProps,
  NotificationCenterProps,
  NotificationChannel,
  NotificationCreateProps,
  NotificationDetailProps,
  NotificationEditProps,
  NotificationFilterProps,
  NotificationFilters,
  NotificationItemProps,
  NotificationListProps,
  NotificationPreferences,
  NotificationPreferencesProps,
  NotificationPreviewProps,
  NotificationPriority,
  NotificationSearchProps,
  NotificationSettingsProps,
  NotificationStats,
  NotificationStatus,
  NotificationTemplate,
  NotificationTemplateProps,
  NotificationType,
  PushToken,
  UpdateNotificationRequest,
} from '@/types/notificationTypes';
