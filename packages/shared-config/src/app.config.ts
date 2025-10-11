// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Service Ports
export const SERVICE_PORTS = {
  IDENTITY: 3001,
  MEMBER: 3002,
  SCHEDULE: 3003,
  BILLING: 3004,
  GATEWAY: 8080,
} as const;

// Service URLs
export const SERVICE_URLS = {
  IDENTITY: `http://localhost:${SERVICE_PORTS.IDENTITY}`,
  MEMBER: `http://localhost:${SERVICE_PORTS.MEMBER}`,
  SCHEDULE: `http://localhost:${SERVICE_PORTS.SCHEDULE}`,
  BILLING: `http://localhost:${SERVICE_PORTS.BILLING}`,
  GATEWAY: `http://localhost:${SERVICE_PORTS.GATEWAY}`,
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT: 30000,
  QUERY_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  JWT_EXPIRES_IN: '7d',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// File Upload Configuration
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  UPLOAD_PATH: './uploads',
} as const;
