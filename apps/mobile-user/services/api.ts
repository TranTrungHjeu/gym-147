import { environment } from '@/config/environment';
import { getToken } from '@/utils/auth/storage';

// Base API configuration
const API_BASE_URL = environment.API_URL;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: any[];
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    return await getToken();
  }

  /**
   * Get authorization headers
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data: any;

    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error: ApiError = {
        message:
          data?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        errors: data?.errors,
      };
      throw error;
    }

    return {
      success: true,
      data: data?.data || data,
      message: data?.message,
      errors: data?.errors,
    };
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any> | { baseURL?: string; [key: string]: any }
  ): Promise<ApiResponse<T>> {
    const baseURL =
      params && 'baseURL' in params ? params.baseURL : this.baseURL;
    const queryParams =
      params && 'baseURL' in params
        ? Object.fromEntries(
            Object.entries(params).filter(([key]) => key !== 'baseURL')
          )
        : params;

    const url = new URL(`${baseURL}${endpoint}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers = await this.getHeaders();

    console.log('🌐 API GET Request:');
    console.log('🌐 URL:', url.toString());
    console.log('🌐 Headers:', headers);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    console.log('🌐 API Response:');
    console.log('🌐 Status:', response.status);
    console.log('🌐 Status Text:', response.statusText);
    console.log('🌐 Headers:', Object.fromEntries(response.headers.entries()));

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    console.log('🌐 ApiService POST URL:', url);
    console.log('🌐 ApiService headers:', headers);
    console.log('🌐 ApiService data:', data);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log('🌐 ApiService response status:', response.status);
    console.log(
      '🌐 ApiService response headers:',
      Object.fromEntries(response.headers.entries())
    );

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, file: FormData): Promise<ApiResponse<T>> {
    const token = await getToken();
    const headers: HeadersInit = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: file,
    });

    return this.handleResponse<T>(response);
  }
}

// Export class and singleton instance
export { ApiService };
export const apiService = new ApiService();
export default apiService;
