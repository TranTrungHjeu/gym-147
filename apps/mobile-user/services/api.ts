import { environment, SERVICE_URLS } from '@/config/environment';
import { getRefreshToken, getToken, storeTokens } from '@/utils/auth/storage';

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
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Add subscriber to wait for token refresh
   */
  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Notify all subscribers when token refreshed
   */
  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        console.log('[ERROR] No refresh token found');
        return null;
      }

      console.log('[REFRESH] Refreshing access token...');

      const response = await fetch(
        `${SERVICE_URLS.IDENTITY}/auth/refresh-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!response.ok) {
        console.log('[ERROR] Token refresh failed:', response.status);
        return null;
      }

      const data: any = await response.json();

      if (data.success && data.data?.accessToken) {
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        // Store new tokens
        await storeTokens(accessToken, newRefreshToken);

        console.log('[SUCCESS] Access token refreshed successfully');
        return accessToken;
      }

      return null;
    } catch (error) {
      console.error('[ERROR] Token refresh error:', error);
      return null;
    }
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    return await getToken();
  }

  /**
   * Get authorization headers
   * Skip Authorization header for public endpoints to prevent expired token errors
   */
  private async getHeaders(endpoint?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Public endpoints that should NOT include Authorization header
    const publicEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/send-otp',
      '/auth/verify-otp',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh-token',
      '/auth/verify-2fa-login',
    ];

    // Skip Authorization header for public endpoints
    const isPublicEndpoint =
      endpoint && publicEndpoints.some((pe) => endpoint.includes(pe));

    if (!isPublicEndpoint) {
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log('[AUTH] Token found, added to headers');
      } else {
        console.log('[WARN] No token found for protected endpoint:', endpoint);
      }
    } else {
      console.log('🔓 Public endpoint, skipping token:', endpoint);
    }

    return headers;
  }

  /**
   * Handle API response with auto-refresh on 401
   */
  private async handleResponse<T>(
    response: Response,
    originalRequest?: () => Promise<Response>,
    endpoint?: string
  ): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data: any;

    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle 401 Unauthorized - Token expired
    // Skip auto-refresh for public endpoints (login, register, etc.)
    const publicEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/send-otp',
      '/auth/verify-otp',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh-token',
      '/auth/verify-2fa-login',
    ];
    const isPublicEndpoint =
      endpoint && publicEndpoints.some((pe) => endpoint.includes(pe));

    if (response.status === 401 && originalRequest && !isPublicEndpoint) {
      console.log('🔒 Token expired (401), attempting refresh...');

      // If already refreshing, wait for it
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.subscribeTokenRefresh(async (token: string) => {
            try {
              // Retry original request with new token
              const retryResponse = await originalRequest();
              const result = await this.handleResponse<T>(
                retryResponse,
                undefined,
                endpoint
              );
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
        });
      }

      // Start refresh process
      this.isRefreshing = true;

      try {
        const newToken = await this.refreshAccessToken();

        if (newToken) {
          this.isRefreshing = false;
          this.onTokenRefreshed(newToken);

          // Retry original request with new token
          const retryResponse = await originalRequest();
          return await this.handleResponse<T>(
            retryResponse,
            undefined,
            endpoint
          );
        } else {
          // Refresh failed - clear tokens and redirect to login
          this.isRefreshing = false;
          console.log('[ERROR] Token refresh failed, please login again');

          // Import and call logout
          const { clearAuthData } = await import('@/utils/auth/storage');
          await clearAuthData();

          const error: ApiError = {
            message: 'Session expired. Please login again.',
            status: 401,
          };
          throw error;
        }
      } catch (error) {
        this.isRefreshing = false;
        throw error;
      }
    }

    // Handle other errors
    if (!response.ok) {
      // Special handling for 503 Service Unavailable
      if (response.status === 503) {
        const fullUrl = response.url || `${this.baseURL}${endpoint || ''}`;
        console.error('[ERROR] Service temporarily unavailable (503):', {
          endpoint: endpoint || 'unknown',
          fullUrl,
          baseURL: this.baseURL,
          status: response.status,
          statusText: response.statusText,
          message: data?.message || 'Service temporarily unavailable',
          errors: data?.errors,
        });
        console.error(
          '   → This usually means the backend service is not running or unreachable'
        );
        console.error(
          '   → Check if the service container is running: docker ps'
        );
        console.error('   → Check service logs: docker logs <service-name>');
      }

      // Special handling for 504 Gateway Timeout
      if (response.status === 504) {
        const fullUrl = response.url || `${this.baseURL}${endpoint || ''}`;
        console.error('[ERROR] Gateway timeout (504):', {
          endpoint: endpoint || 'unknown',
          fullUrl,
          baseURL: this.baseURL,
          status: response.status,
          statusText: response.statusText,
          message: data?.message || 'Request timed out',
          errors: data?.errors,
        });
        console.error(
          '   → This usually means the database query took too long'
        );
        console.error(
          '   → The request may have timed out but data might still be loading'
        );
      }

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
   * GET request with auto-refresh
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any> | { baseURL?: string; [key: string]: any }
  ): Promise<ApiResponse<T>> {
    const makeRequest = async () => {
      const baseURL =
        params && 'baseURL' in params ? params.baseURL : this.baseURL;

      // Check if endpoint already has query params
      const [endpointPath, existingQuery] = endpoint.split('?');

      const queryParams =
        params && 'baseURL' in params
          ? Object.fromEntries(
              Object.entries(params).filter(([key]) => key !== 'baseURL')
            )
          : params;

      const url = new URL(`${baseURL}${endpointPath}`);

      // Add existing query params first (if any)
      if (existingQuery) {
        existingQuery.split('&').forEach((param) => {
          const [key, value] = param.split('=');
          if (key && value) {
            url.searchParams.append(
              decodeURIComponent(key),
              decodeURIComponent(value)
            );
          }
        });
      }

      // Then add params object
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      const headers = await this.getHeaders(endpointPath);

      console.log('[API] API GET Request:', url.toString());
      console.log('[AUTH] Headers:', {
        'Content-Type': headers['Content-Type'],
        Authorization: headers.Authorization
          ? `${headers.Authorization.substring(0, 20)}...`
          : 'NOT SET',
      });

      return await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
    };

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest, endpoint);
  }

  /**
   * POST request with auto-refresh
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const makeRequest = async () => {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders(endpoint);

      console.log('[API] API POST Request:', url);
      if (data) {
        console.log('[API] API POST Body:', JSON.stringify(data, null, 2));
      }

      return await fetch(url, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    };

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest, endpoint);
  }

  /**
   * PUT request with auto-refresh
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: { baseURL?: string }
  ): Promise<ApiResponse<T>> {
    const makeRequest = async () => {
      const baseURL = options?.baseURL || this.baseURL;
      const url = `${baseURL}${endpoint}`;
      const headers = await this.getHeaders(endpoint);

      console.log('[API] API PUT Request:', url);
      if (data) {
        console.log('[API] API PUT Body:', JSON.stringify(data, null, 2));
      }

      return await fetch(url, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    };

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest, endpoint);
  }

  /**
   * PATCH request with auto-refresh
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const makeRequest = async () => {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders(endpoint);
      const body = data ? JSON.stringify(data) : undefined;

      console.log('🔵 PATCH request:', {
        url,
        method: 'PATCH',
        hasBody: !!body,
        endpoint,
      });

      return await fetch(url, {
        method: 'PATCH',
        headers,
        body,
      });
    };

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest, endpoint);
  }

  /**
   * DELETE request with auto-refresh
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const makeRequest = async () => {
      return await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: await this.getHeaders(endpoint),
      });
    };

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest, endpoint);
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, file: FormData): Promise<ApiResponse<T>> {
    const makeRequest = async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: file as any, // FormData type compatibility for React Native
      });
    };

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest, endpoint);
  }
}

// Export class and singleton instance
export { ApiService };
export const apiService = new ApiService();
export default apiService;
