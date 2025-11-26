import { API_CONFIG } from '@/config/api.config';
import axios from 'axios';

const { SERVICES } = API_CONFIG;

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Create service-specific API instances using centralized config
export const identityApi = axios.create({
  baseURL: SERVICES.IDENTITY,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const memberApi = axios.create({
  baseURL: SERVICES.MEMBER,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const scheduleApi = axios.create({
  baseURL: SERVICES.SCHEDULE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const billingApi = axios.create({
  baseURL: SERVICES.BILLING,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Add auth token to all service requests
const addAuthInterceptor = (apiInstance: any) => {
  apiInstance.interceptors.request.use(
    (config: any) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );

  apiInstance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      // Check for ERR_BLOCKED_BY_CLIENT early in the interceptor
      // This happens when browser extensions (ad blockers) block the request
      // When blocked, axios may report ERR_NETWORK but browser console shows ERR_BLOCKED_BY_CLIENT
      const errorCode = error.code || '';
      const errorMessage = (error.message || '').toLowerCase();
      const requestUrl = error.config?.url || '';
      const isBillingEndpoint = requestUrl.includes('/billing/') || requestUrl.includes('/plans/');
      
      // Check if it's blocked by client
      const isBlockedByClient =
        errorCode === 'ERR_BLOCKED_BY_CLIENT' ||
        errorMessage.includes('err_blocked_by_client') ||
        errorMessage.includes('blocked by client') ||
        errorMessage.includes('net::err_blocked_by_client') ||
        // Network error on billing/plans endpoint without response is likely blocked
        (errorCode === 'ERR_NETWORK' &&
         !error.response &&
         isBillingEndpoint &&
         errorMessage === 'network error');
      
      if (isBlockedByClient) {
        const blockedError: any = new Error(
          'Request bị chặn bởi trình chặn quảng cáo hoặc extension trình duyệt. Vui lòng tắt ad blocker cho localhost:8080 hoặc thử lại.'
        );
        blockedError.code = 'ERR_BLOCKED_BY_CLIENT';
        blockedError.isBlocked = true;
        return Promise.reject(blockedError);
      }

      if (error.response?.status === 401) {
        // Don't redirect if already on auth/login page or if it's a login request
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('/auth') || currentPath.includes('/login');
        const isLoginRequest = error.config?.url?.includes('/auth/login') || 
                               error.config?.url?.includes('/auth/register');
        
        // Only redirect if not on auth page and not a login/register request
        if (!isAuthPage && !isLoginRequest) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/auth';
        }
        // For login/register errors, just clear tokens but don't redirect
        else if (isLoginRequest) {
          // Don't clear tokens on login failure - let the component handle it
          // The error will be caught by the component and shown in modal
        }
      }
      return Promise.reject(error);
    }
  );
};

// Apply auth interceptors to all APIs
[api, identityApi, memberApi, scheduleApi, billingApi].forEach(addAuthInterceptor);

// Generic API service functions
export async function pingService(path: string) {
  const { data } = await api.get(path);
  return data;
}

export async function get<T>(path: string): Promise<T> {
  const { data } = await api.get(path);
  return data;
}

export async function post<T>(path: string, body: any): Promise<T> {
  const { data } = await api.post(path, body);
  return data;
}

export async function put<T>(path: string, body: any): Promise<T> {
  const { data } = await api.put(path, body);
  return data;
}

export async function del<T>(path: string): Promise<T> {
  const { data } = await api.delete(path);
  return data;
}

// Member Service API functions
export async function fetchMembers() {
  try {
    const response = await memberApi.get('/members');
    return response.data;
  } catch (error) {
    console.error('Error fetching members:', error);
    throw error;
  }
}

export async function fetchMemberStats() {
  try {
    const response = await memberApi.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching member stats:', error);
    throw error;
  }
}

// Schedule Service API functions
export async function fetchSchedules() {
  try {
    const response = await scheduleApi.get('/schedules');
    return response.data;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
}

export async function fetchScheduleStats() {
  try {
    const response = await scheduleApi.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    throw error;
  }
}

export async function fetchClasses() {
  try {
    const response = await scheduleApi.get('/classes');
    return response.data;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
}

export async function fetchInstructors() {
  try {
    const response = await scheduleApi.get('/instructors');
    return response.data;
  } catch (error) {
    console.error('Error fetching instructors:', error);
    throw error;
  }
}

export async function fetchRooms() {
  try {
    const response = await scheduleApi.get('/rooms');
    return response.data;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
}
