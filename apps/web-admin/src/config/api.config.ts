import { buildServiceUrls, normalizeBaseUrl } from '@gym-147/shared-config';

const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please check your .env.${import.meta.env.MODE} file.`
    );
  }
  return value;
};

/**
 * API Configuration
 * All URLs are derived from environment variables - no hardcoded values
 */
const BASE_URL = normalizeBaseUrl(getEnvVar('VITE_API_BASE_URL'));

export const API_CONFIG = {
  // Base URL for API Gateway (Nginx)
  BASE_URL,

  // WebSocket URL for Schedule Service (Socket.io)
  WS_SCHEDULE_URL: getEnvVar('VITE_WS_SCHEDULE_URL'),

  SERVICES: buildServiceUrls(BASE_URL),
} as const;

/**
 * Type-safe API config
 */
export type ApiConfig = typeof API_CONFIG;
