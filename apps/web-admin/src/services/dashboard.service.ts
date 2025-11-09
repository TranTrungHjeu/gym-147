import { identityApi } from './api';
import type { AxiosResponse } from 'axios';

export interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalTrainers: number;
  totalMembers: number;
  totalEquipment?: number;
  recentRegistrations?: number;
  activeSessions?: number;
}

export interface UserStats {
  role: string;
  count: number;
  recentRegistrations: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class DashboardService {
  private async request<T>(endpoint: string): Promise<T> {
    try {
      const response = await identityApi.get<T>(endpoint);
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };

      // If token expired, try to refresh
      if (error.response?.status === 401 || error.response?.status === 403) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          try {
            const retryResponse = await identityApi.get<T>(endpoint);
            return retryResponse.data;
          } catch (retryError) {
            // If retry also fails, throw the original error
            throw error;
          }
        }
      }

      console.error('Dashboard API Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
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
      window.location.href = '/auth';
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/auth';
      return false;
    }
  }

  // Get dashboard statistics for Super Admin
  async getSuperAdminStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<ApiResponse<DashboardStats>>('/dashboard/super-admin-stats');
  }

  // Get dashboard statistics for Admin
  async getAdminStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<ApiResponse<DashboardStats>>('/dashboard/admin-stats');
  }

  // Get user statistics by role
  async getUserStats(): Promise<ApiResponse<UserStats[]>> {
    return this.request<ApiResponse<UserStats[]>>('/dashboard/user-stats');
  }

  async getUserGrowthData(filters?: { from?: string; to?: string }): Promise<
    ApiResponse<{
      dates: string[];
      newUsers: number[];
      activeUsers?: number[];
    }>
  > {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);

    const response = await this.request<ApiResponse<any>>(`/dashboard/user-growth-data?${params}`);

    // Transform response data to chart format
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          dates: response.data.dates || response.data.months || [],
          newUsers: response.data.newUsers || response.data.registrations || [],
          activeUsers: response.data.activeUsers || response.data.active || [],
        },
      };
    }

    return response;
  }

  // Get recent activities
  async getRecentActivities(): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>('/dashboard/recent-activities');
  }
}

export const dashboardService = new DashboardService();
