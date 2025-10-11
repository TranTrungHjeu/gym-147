// API Gateway endpoints - routed through nginx
const API_BASE_URL = 'http://localhost:3001';

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
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('accessToken');

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dashboard API Error:', error);
      throw error;
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

  // Get recent activities
  async getRecentActivities(): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>('/dashboard/recent-activities');
  }
}

export const dashboardService = new DashboardService();
