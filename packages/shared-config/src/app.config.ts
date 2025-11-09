export const API_REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

export const SERVICE_PATHS = {
  IDENTITY: 'identity',
  MEMBER: 'members',
  SCHEDULE: 'schedule',
  BILLING: 'billing',
} as const;

export type ServiceKey = keyof typeof SERVICE_PATHS;

/**
 * Normalize base URL by trimming trailing slashes.
 */
export const normalizeBaseUrl = (url: string): string => {
  if (!url) {
    throw new Error('Base URL is required to build service URLs.');
  }

  return url.replace(/\/+$/, '');
};

/**
 * Normalize service path by removing leading slashes.
 */
const normalizeServicePath = (path: string): string => path.replace(/^\/+/, '');

/**
 * Build a single service URL from base URL and service key.
 */
export const buildServiceUrl = (baseUrl: string, service: ServiceKey): string => {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const path = normalizeServicePath(SERVICE_PATHS[service]);
  return `${normalizedBase}/${path}`;
};

/**
 * Build full service URL map from a single base URL.
 */
export const buildServiceUrls = (baseUrl: string): Record<ServiceKey, string> => {
  const normalizedBase = normalizeBaseUrl(baseUrl);

  return Object.entries(SERVICE_PATHS).reduce((acc, [key, path]) => {
    acc[key as ServiceKey] = `${normalizedBase}/${normalizeServicePath(path)}`;
    return acc;
  }, {} as Record<ServiceKey, string>);
};
