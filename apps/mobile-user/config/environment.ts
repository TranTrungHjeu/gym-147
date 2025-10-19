import Constants from 'expo-constants';

export interface EnvironmentConfig {
  API_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  GOOGLE_CLIENT_ID?: string;
  FACEBOOK_APP_ID?: string;
  DEBUG: boolean;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const config = Constants.expoConfig?.extra || {};

  return {
    API_URL:
      process.env.EXPO_PUBLIC_API_URL ||
      config.API_URL ||
      'http://10.0.2.2:3001', // Android emulator - Identity Service
    // 'http://localhost:3001', // iOS simulator - Identity Service
    // 'http://192.168.1.100:3001', // Real device - Identity Service
    APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || config.APP_NAME || 'Gym147',
    APP_VERSION:
      process.env.EXPO_PUBLIC_APP_VERSION || config.APP_VERSION || '1.0.0',
    ENVIRONMENT: (process.env.EXPO_PUBLIC_ENVIRONMENT ||
      config.ENVIRONMENT ||
      'development') as 'development' | 'staging' | 'production',
    GOOGLE_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID,
    FACEBOOK_APP_ID:
      process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || config.FACEBOOK_APP_ID,
    DEBUG: __DEV__,
  };
};

export const environment = getEnvironmentConfig();

// API Endpoints - Direct service connections (no gateway)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/profile/me',
    GOOGLE: '/auth/google',
    FACEBOOK: '/auth/facebook',
  },
  USERS: {
    PROFILE: '/members/profile',
    UPDATE_PROFILE: '/members/profile',
    CHANGE_PASSWORD: '/security/change-password',
    UPLOAD_IMAGE: '/members/upload-image',
    DELETE_IMAGE: '/members/delete-image',
    STATS: '/analytics/member-stats',
    ACHIEVEMENTS: '/achievements',
    DELETE_ACCOUNT: '/security/delete-account',
    EXPORT: '/analytics/export-data',
    PREFERENCES: '/members/preferences',
  },
  WORKOUTS: {
    LIST: '/workout-plans',
    DETAIL: '/workout-plans',
    CREATE: '/workout-plans',
    UPDATE: '/workout-plans',
    DELETE: '/workout-plans',
    MY_WORKOUTS: '/members/workout-plans',
    START_SESSION: '/sessions/start',
    SESSIONS: '/sessions',
    EXERCISES: '/workout-plans/exercises',
    CATEGORIES: '/workout-plans/categories',
    EXERCISE_CATEGORIES: '/workout-plans/exercise-categories',
    MUSCLE_GROUPS: '/workout-plans/muscle-groups',
  },
  SCHEDULES: {
    LIST: '/schedules',
    DETAIL: '/schedules',
    CREATE: '/schedules',
    UPDATE: '/schedules',
    DELETE: '/schedules',
    TOGGLE_STATUS: '/schedules',
    TODAY: '/schedules/today',
    BY_DATE: '/schedules/date',
    WEEK: '/schedules/week',
    COMPLETE_WORKOUT: '/attendance/complete',
    INCOMPLETE_WORKOUT: '/attendance/incomplete',
    PROGRESS: '/schedules/progress',
    ALL_PROGRESS: '/schedules/all-progress',
    ADD_WORKOUT: '/schedules/add-workout',
    UPDATE_WORKOUT: '/schedules/update-workout',
    REMOVE_WORKOUT: '/schedules/remove-workout',
    STATS: '/schedules/stats',
  },
  BILLING: {
    PLANS: '/plans',
    SUBSCRIPTIONS: '/subscriptions',
    PAYMENTS: '/payments',
    INVOICES: '/invoices',
    STATS: '/stats',
  },
} as const;

// Service URLs for direct connections
export const SERVICE_URLS = {
  IDENTITY: 'http://10.0.2.2:3001', // Android emulator
  MEMBER: 'http://10.0.2.2:3002',
  SCHEDULE: 'http://10.0.2.2:3003',
  BILLING: 'http://10.0.2.2:3004',
} as const;

// App Configuration
export const APP_CONFIG = {
  STORAGE_KEYS: {
    AUTH_TOKEN: '@gym147_auth_token',
    USER_DATA: '@gym147_user_data',
    PREFERENCES: '@gym147_preferences',
    WORKOUT_CACHE: '@gym147_workout_cache',
    SCHEDULE_CACHE: '@gym147_schedule_cache',
  },
  CACHE_DURATION: {
    WORKOUTS: 5 * 60 * 1000, // 5 minutes
    SCHEDULES: 2 * 60 * 1000, // 2 minutes
    USER_STATS: 10 * 60 * 1000, // 10 minutes
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    NAME_MIN_LENGTH: 2,
    PHONE_REGEX: /^[0-9]{10,}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  WORKOUT: {
    MAX_DURATION: 300, // 5 hours in minutes
    MIN_DURATION: 5, // 5 minutes
    MAX_SETS: 20,
    MAX_REPS: 1000,
    MAX_WEIGHT: 1000, // kg
  },
} as const;

export default environment;
