// Application Constants
export const APP_CONSTANTS = {
  APP_NAME: 'Gym Management System',
  APP_VERSION: '1.0.0',
  COMPANY_NAME: 'Gym 147',
  SUPPORT_EMAIL: 'support@gym147.com',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  TRAINER: 'trainer',
  MEMBER: 'member',
} as const;

// Member Status
export const MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  ONLINE: 'online',
} as const;

// Class Difficulty Levels
export const CLASS_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

// Class Categories
export const CLASS_CATEGORIES = {
  YOGA: 'yoga',
  CARDIO: 'cardio',
  STRENGTH: 'strength',
  PILATES: 'pilates',
  ZUMBA: 'zumba',
  CROSSFIT: 'crossfit',
  MARTIAL_ARTS: 'martial_arts',
  SWIMMING: 'swimming',
} as const;

// Schedule Status
export const SCHEDULE_STATUS = {
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Booking Status
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  WAITLIST: 'waitlist',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

// Gender Options
export const GENDER_OPTIONS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

// Membership Plan Categories
export const PLAN_CATEGORIES = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  VIP: 'vip',
  FAMILY: 'family',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
} as const;

// Currency
export const CURRENCY = {
  VND: 'VND',
  USD: 'USD',
} as const;
