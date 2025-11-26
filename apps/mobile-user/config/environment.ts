import { buildServiceUrls, normalizeBaseUrl } from '@gym-147/shared-config';
import Constants from 'expo-constants';

export interface EnvironmentConfig {
  API_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  GOOGLE_CLIENT_ID?: string;
  FACEBOOK_APP_ID?: string;
  PROVINCES_API_KEY?: string; // API key for Vietnam address API (if needed)
  PROVINCES_API_URL?: string; // Base URL for Vietnam address API (default: http://tinhthanhpho.com/api/v1)
  DEBUG: boolean;
}

const extraConfig = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

const pickFirstNonEmpty = (
  ...values: Array<string | undefined | null>
): string | undefined =>
  values.find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0
  );

const resolveApiBaseUrl = (): string => {
  const value = pickFirstNonEmpty(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    process.env.EXPO_PUBLIC_API_URL,
    extraConfig.API_BASE_URL,
    extraConfig.API_URL
  );

  if (!value) {
    throw new Error(
      'Missing API base URL configuration. Set EXPO_PUBLIC_API_BASE_URL or define expo.extra.API_BASE_URL.'
    );
  }

  return normalizeBaseUrl(value.trim());
};

const getEnvironmentConfig = (): EnvironmentConfig => {
  const API_BASE_URL = resolveApiBaseUrl();

  return {
    API_URL: API_BASE_URL,
    APP_NAME:
      pickFirstNonEmpty(
        process.env.EXPO_PUBLIC_APP_NAME,
        extraConfig.APP_NAME
      ) || 'Gym147',
    APP_VERSION:
      pickFirstNonEmpty(
        process.env.EXPO_PUBLIC_APP_VERSION,
        extraConfig.APP_VERSION
      ) || '1.0.0',
    ENVIRONMENT: (pickFirstNonEmpty(
      process.env.EXPO_PUBLIC_ENVIRONMENT,
      extraConfig.ENVIRONMENT
    ) || 'development') as 'development' | 'staging' | 'production',
    GOOGLE_CLIENT_ID: pickFirstNonEmpty(
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      extraConfig.GOOGLE_CLIENT_ID
    ),
    FACEBOOK_APP_ID: pickFirstNonEmpty(
      process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
      extraConfig.FACEBOOK_APP_ID
    ),
    PROVINCES_API_KEY: pickFirstNonEmpty(
      process.env.EXPO_PUBLIC_PROVINCES_API_KEY,
      extraConfig.PROVINCES_API_KEY
    ),
    PROVINCES_API_URL:
      pickFirstNonEmpty(
        process.env.EXPO_PUBLIC_PROVINCES_API_URL,
        extraConfig.PROVINCES_API_URL
      ) || 'http://tinhthanhpho.com/api/v1', // Default to public API (can be overridden)
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

// ================================
// 🔧 SERVICE URLS CONFIGURATION
// ================================
// Centralized service URLs - modify here to switch between different environments
//
// 📱 For REAL DEVICE (same WiFi network):
//    - Find your computer's IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
//    - Use format: http://[YOUR_IP]:PORT
//
// 🖥️  For ANDROID EMULATOR:
//    - Use: http://10.0.2.2:PORT
//
// 🍎 For iOS SIMULATOR:
//    - Use: http://localhost:PORT
//
// ================================

export const SERVICE_URLS = buildServiceUrls(environment.API_URL);

// Debug: Log service URLs on initialization
if (__DEV__) {
  console.log('🔧 Environment API_URL:', environment.API_URL);
  console.log('🔧 Built SERVICE_URLS:', SERVICE_URLS);
}

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
