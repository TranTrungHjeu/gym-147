/**
 * Notification types matching backend NotificationType enum
 */
export enum NotificationType {
  // Certification related
  CERTIFICATION_UPLOAD = 'CERTIFICATION_UPLOAD',
  CERTIFICATION_VERIFIED = 'CERTIFICATION_VERIFIED',
  CERTIFICATION_REJECTED = 'CERTIFICATION_REJECTED',
  CERTIFICATION_AUTO_VERIFIED = 'CERTIFICATION_AUTO_VERIFIED',
  CERTIFICATION_EXPIRED = 'CERTIFICATION_EXPIRED',
  CERTIFICATION_PENDING = 'CERTIFICATION_PENDING',
  CERTIFICATION_DELETED = 'CERTIFICATION_DELETED',

  // Class/Booking related
  CLASS_BOOKING = 'CLASS_BOOKING',
  CLASS_CANCELLED = 'CLASS_CANCELLED',
  CLASS_REMINDER = 'CLASS_REMINDER',
  WAITLIST_ADDED = 'WAITLIST_ADDED',
  WAITLIST_PROMOTED = 'WAITLIST_PROMOTED',
  SCHEDULE_CANCELLED = 'SCHEDULE_CANCELLED',
  SCHEDULE_CREATED = 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED = 'SCHEDULE_UPDATED',
  ROOM_CHANGED = 'ROOM_CHANGED',
  MEMBER_CHECKED_IN = 'MEMBER_CHECKED_IN',
  BOOKING_UPDATED = 'BOOKING_UPDATED',

  // Membership related
  MEMBERSHIP_EXPIRING = 'MEMBERSHIP_EXPIRING',
  MEMBERSHIP_EXPIRED = 'MEMBERSHIP_EXPIRED',
  MEMBERSHIP_RENEWED = 'MEMBERSHIP_RENEWED',

  // Member related
  MEMBER_REGISTERED = 'MEMBER_REGISTERED',
  MEMBER_UPDATED = 'MEMBER_UPDATED',
  MEMBER_DELETED = 'MEMBER_DELETED',

  // Achievement/Reward related
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  REWARD_REDEMPTION = 'REWARD_REDEMPTION',

  // Payment related
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',

  // Subscription related
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',

  // Invoice related
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',

  // Queue related
  QUEUE_JOINED = 'QUEUE_JOINED',
  QUEUE_POSITION_UPDATED = 'QUEUE_POSITION_UPDATED',
  QUEUE_EXPIRED = 'QUEUE_EXPIRED',
  QUEUE_YOUR_TURN = 'QUEUE_YOUR_TURN',

  // Equipment related
  EQUIPMENT_AVAILABLE = 'EQUIPMENT_AVAILABLE',
  EQUIPMENT_MAINTENANCE_SCHEDULED = 'EQUIPMENT_MAINTENANCE_SCHEDULED',
  EQUIPMENT_MAINTENANCE_COMPLETED = 'EQUIPMENT_MAINTENANCE_COMPLETED',

  // Trainer related
  TRAINER_DELETED = 'TRAINER_DELETED',

  // System
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  GENERAL = 'GENERAL',
}

/**
 * Notification status
 */
export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

/**
 * Notification priority
 */
export type NotificationPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  status: NotificationStatus;
  priority: NotificationPriority | string;
  createdAt: string;
  readAt: string | null;
  metadata?: Record<string, any>;
  userId?: string;
  memberId?: string;
}

/**
 * Notification data payload structure
 */
export interface NotificationData {
  type: NotificationType | string;
  notificationType?: NotificationType | string; // Alias for type

  // Equipment/Queue related
  equipment_id?: string;
  equipment_name?: string;
  queue_id?: string;

  // Class/Booking related
  class_id?: string;
  schedule_id?: string;
  booking_id?: string;

  // Payment/Subscription related
  payment_id?: string;
  subscription_id?: string;
  invoice_id?: string;

  // Achievement/Reward related
  achievement_id?: string;
  reward_id?: string;
  redemption_id?: string;

  // Additional metadata
  [key: string]: any;
}

/**
 * Validate notification data before navigation
 */
export function validateNotificationData(data: any): data is NotificationData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const type = data.type || data.notificationType;
  if (!type) {
    return false;
  }

  return true;
}
