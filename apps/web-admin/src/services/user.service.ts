import { identityApi, scheduleApi } from './api';
import type { AxiosResponse } from 'axios';

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'MEMBER';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface UserResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  isActive?: boolean;
}

class UserService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    try {
      let response: AxiosResponse<T>;

      switch (method) {
        case 'POST':
          response = await identityApi.post<T>(endpoint, data);
          break;
        case 'PUT':
          response = await identityApi.put<T>(endpoint, data);
          break;
        case 'DELETE':
          response = await identityApi.delete<T>(endpoint);
          break;
        default:
          response = await identityApi.get<T>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('User API Error:', errorData);

      // If token expired, try to refresh
      if (error.response?.status === 401 || error.response?.status === 403) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          try {
            let retryResponse: AxiosResponse<T>;
            switch (method) {
              case 'POST':
                retryResponse = await identityApi.post<T>(endpoint, data);
                break;
              case 'PUT':
                retryResponse = await identityApi.put<T>(endpoint, data);
                break;
              case 'DELETE':
                retryResponse = await identityApi.delete<T>(endpoint);
                break;
              default:
                retryResponse = await identityApi.get<T>(endpoint);
            }
            return retryResponse.data;
          } catch (retryError) {
            // If retry also fails, throw the original error
            throw error;
          }
        }
      }

      const apiError = new Error(
        errorData.message || `HTTP error! status: ${error.response?.status}`
      );
      (apiError as any).response = {
        status: error.response?.status,
        data: errorData,
      };
      throw apiError;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await identityApi.post('/auth/refresh-token', { refreshToken });

      if (response.data.success && response.data.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.data.accessToken);
        if (response.data.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
        return true;
      }

      // If refresh fails, clear tokens and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return false;
    }
  }

  // Get all users with pagination and filtering
  async getAllUsers(params?: {
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.role) queryParams.append('role', params.role);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/auth/users?${queryString}` : '/auth/users';

    return this.request<UserListResponse>(endpoint, 'GET');
  }

  // Get user by ID
  async getUserById(id: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/auth/users/${id}`, 'GET');
  }

  // Get current user profile
  async getProfile(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/profile', 'GET');
  }

  // Update current user profile
  async updateProfile(data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/profile', 'PUT', data);
  }

  // Update user
  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>(`/auth/users/${id}`, 'PUT', data);
  }

  // Send OTP for email/phone change
  async sendOTPForEmailPhoneChange(verificationMethod: 'EMAIL' | 'PHONE', newEmail?: string, newPhone?: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/profile/send-otp-for-email-phone-change', 'POST', {
      verificationMethod,
      newEmail,
      newPhone,
    });
  }

  // Update email/phone with OTP verification
  async updateEmailPhoneWithOTP(data: {
    verificationMethod: 'EMAIL' | 'PHONE';
    otp: string;
    newEmail?: string;
    newPhone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserResponse> {
    return this.request<UserResponse>('/profile/update-email-phone-with-otp', 'PUT', data);
  }

  // Delete user
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/auth/users/${id}`, 'DELETE');
  }

  // Get trainers only
  async getTrainers(page: number = 1, limit: number = 10): Promise<UserListResponse> {
    return this.getAllUsers({ role: 'TRAINER', page, limit });
  }

  // Get admins only
  async getAdmins(page: number = 1, limit: number = 10): Promise<UserListResponse> {
    return this.getAllUsers({ role: 'ADMIN', page, limit });
  }

  // Get members only
  async getMembers(page: number = 1, limit: number = 10): Promise<UserListResponse> {
    return this.getAllUsers({ role: 'MEMBER', page, limit });
  }

  // Get trainer stats from schedule service
  async getTrainerStats(): Promise<{
    success: boolean;
    message: string;
    data: {
      totalClasses: number;
      totalStudents: number;
      rating: number;
      completedSessions: number;
      upcomingClasses: number;
      monthlyRevenue: number;
      achievements: number;
      goalsCompleted: number;
    };
  }> {
    // Get current user first to get user_id
    const profileResponse = await this.getProfile();
    if (!profileResponse.success) {
      throw new Error('Failed to get user profile');
    }

    const userId = profileResponse.data.user.id;

    // Call schedule service for trainer stats using centralized config
    try {
      const response = await scheduleApi.get(`/trainers/user/${userId}/stats`);
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('Schedule Service API Error:', errorData);
      const apiError = new Error(
        errorData.message || `HTTP error! status: ${error.response?.status}`
      );
      (apiError as any).response = {
        status: error.response?.status,
        data: errorData,
      };
      throw apiError;
    }
  }

  // Send OTP for password change
  async sendOTPForPasswordChange(verificationMethod: 'EMAIL' | 'PHONE'): Promise<{
    success: boolean;
    message: string;
    data: {
      verificationMethod: 'EMAIL' | 'PHONE';
      identifier: string;
      otp?: string; // Only in development
    };
  }> {
    return this.request('/profile/send-otp-for-password-change', 'POST', {
      verificationMethod,
    });
  }

  // Change password with OTP
  async changePasswordWithOTP(data: {
    verificationMethod: 'EMAIL' | 'PHONE';
    otp: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: null;
  }> {
    return this.request('/profile/change-password-with-otp', 'POST', data);
  }
}

export const userService = new UserService();
