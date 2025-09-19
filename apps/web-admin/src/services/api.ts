import axios from "axios";

// Create axios instance with default config
export const api = axios.create({
  baseURL: "/",
  headers: { 
    "Content-Type": "application/json" 
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
