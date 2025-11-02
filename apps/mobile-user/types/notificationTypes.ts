export enum NotificationType {
  WORKOUT_REMINDER = 'WORKOUT_REMINDER',
  MEMBERSHIP_EXPIRY = 'MEMBERSHIP_EXPIRY',
  PAYMENT_DUE = 'PAYMENT_DUE',
  CLASS_BOOKING = 'CLASS_BOOKING',
  ACHIEVEMENT = 'ACHIEVEMENT',
  MAINTENANCE = 'MAINTENANCE',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
  EQUIPMENT_AVAILABLE = 'EQUIPMENT_AVAILABLE',
  HEALTH_MILESTONE = 'HEALTH_MILESTONE',
  SOCIAL = 'SOCIAL',
  SECURITY = 'SECURITY',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export interface Notification {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: {
    [key: string]: any;
  };
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface CreateNotificationRequest {
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: {
    [key: string]: any;
  };
  scheduledAt?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: {
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  id: string;
  memberId: string;
  workoutReminders: {
    enabled: boolean;
    time: string; // HH:MM format
    days: number[]; // 0-6 (Sunday-Saturday)
    types: string[];
  };
  membershipAlerts: {
    enabled: boolean;
    expiryReminder: boolean;
    renewalReminder: boolean;
    daysBeforeExpiry: number;
  };
  paymentAlerts: {
    enabled: boolean;
    dueReminder: boolean;
    failedPayment: boolean;
    successfulPayment: boolean;
  };
  classNotifications: {
    enabled: boolean;
    bookingConfirmation: boolean;
    cancellation: boolean;
    waitlist: boolean;
    reminder: boolean;
    hoursBeforeClass: number;
  };
  achievementAlerts: {
    enabled: boolean;
    newAchievement: boolean;
    progressUpdate: boolean;
    milestone: boolean;
  };
  equipmentAlerts: {
    enabled: boolean;
    maintenance: boolean;
    availability: boolean;
    usageReminder: boolean;
  };
  healthAlerts: {
    enabled: boolean;
    milestone: boolean;
    goalReminder: boolean;
    trendAlert: boolean;
  };
  promotionalAlerts: {
    enabled: boolean;
    offers: boolean;
    events: boolean;
    news: boolean;
  };
  systemAlerts: {
    enabled: boolean;
    maintenance: boolean;
    security: boolean;
    updates: boolean;
  };
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: {
    [key in NotificationType]: number;
  };
  byPriority: {
    [key in NotificationPriority]: number;
  };
  recentActivity: {
    date: string;
    count: number;
  }[];
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  title: string;
  message: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushToken {
  id: string;
  memberId: string;
  token: string;
  platform: 'ios' | 'android';
  isActive: boolean;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

// UI Component Props
export interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onMarkAsRead?: (notification: Notification) => void;
  onDelete?: (notification: Notification) => void;
  onArchive?: (notification: Notification) => void;
}

export interface NotificationListProps {
  memberId: string;
  onNotificationPress?: (notification: Notification) => void;
  onRefresh?: () => void;
  filters?: NotificationFilters;
}

export interface NotificationCenterProps {
  memberId: string;
  onNotificationSelect?: (notification: Notification) => void;
  onMarkAllAsRead?: () => void;
  onDeleteAllRead?: () => void;
}

export interface NotificationPreferencesProps {
  memberId: string;
  onPreferencesUpdate?: (preferences: NotificationPreferences) => void;
}

export interface NotificationBadgeProps {
  count: number;
  onPress?: () => void;
}

export interface NotificationFilterProps {
  filters: NotificationFilters;
  onFiltersChange: (filters: NotificationFilters) => void;
  onClearFilters: () => void;
}

export interface NotificationSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export interface NotificationBulkActionsProps {
  selectedNotifications: string[];
  onBulkMarkAsRead: () => void;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
  onClearSelection: () => void;
}

export interface NotificationSettingsProps {
  memberId: string;
  onSettingsUpdate?: (settings: NotificationPreferences) => void;
}

export interface NotificationAnalyticsProps {
  memberId: string;
  period: string;
  onPeriodChange: (period: string) => void;
}

export interface NotificationTemplateProps {
  template: NotificationTemplate;
  onEdit?: (template: NotificationTemplate) => void;
  onDelete?: (template: NotificationTemplate) => void;
  onToggleActive?: (template: NotificationTemplate) => void;
}

export interface NotificationCreateProps {
  memberId: string;
  onNotificationCreate?: (notification: CreateNotificationRequest) => void;
  onCancel?: () => void;
}

export interface NotificationEditProps {
  notification: Notification;
  onNotificationUpdate?: (notification: UpdateNotificationRequest) => void;
  onCancel?: () => void;
}

export interface NotificationDetailProps {
  notification: Notification;
  onNotificationUpdate?: (notification: UpdateNotificationRequest) => void;
  onNotificationDelete?: (notification: Notification) => void;
  onBack?: () => void;
}

export interface NotificationPreviewProps {
  notification: Notification;
  onSend?: (notification: Notification) => void;
  onSchedule?: (notification: Notification, scheduledAt: string) => void;
  onCancel?: () => void;
}
