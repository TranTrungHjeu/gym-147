import axios from 'axios';

// API Gateway endpoints - routed through nginx
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const SERVICES = {
  IDENTITY: `${API_BASE_URL}/api/identity`,
  MEMBER: `${API_BASE_URL}/api/members`,
  SCHEDULE: `${API_BASE_URL}/api/schedule`,
  BILLING: `${API_BASE_URL}/api/billing`,
};

// Create axios instance with default config
export const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Create service-specific API instances
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
      const token = localStorage.getItem('auth_token');
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
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/auth';
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
