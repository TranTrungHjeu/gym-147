const API_BASE_URL = 'http://localhost:3001';

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
}

class UserService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('User API Error:', errorData);

      // If token expired, try to refresh
      if (response.status === 401 || response.status === 403) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const newToken = localStorage.getItem('accessToken');
          const retryOptions: RequestInit = {
            ...defaultOptions,
            headers: {
              ...defaultOptions.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };

          const retryResponse = await fetch(url, { ...retryOptions, ...options });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      }

      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      (error as any).response = { status: response.status, data: errorData };
      throw error;
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.accessToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          if (data.data.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          return true;
        }
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

    return this.request<UserListResponse>(endpoint, {
      method: 'GET',
    });
  }

  // Get user by ID
  async getUserById(id: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/auth/users/${id}`, {
      method: 'GET',
    });
  }

  // Get current user profile
  async getProfile(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/profile', {
      method: 'GET',
    });
  }

  // Update current user profile
  async updateProfile(data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Update user
  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete user
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/auth/users/${id}`, {
      method: 'DELETE',
    });
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

    // Call schedule service for trainer stats
    const scheduleServiceUrl = 'http://localhost:3003';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${scheduleServiceUrl}/trainers/user/${userId}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Schedule Service API Error:', errorData);
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      (error as any).response = { status: response.status, data: errorData };
      throw error;
    }

    return response.json();
  }
}

export const userService = new UserService();
