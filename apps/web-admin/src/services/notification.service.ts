const API_BASE_URL = 'http://localhost:3003';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: NotificationPagination;
}

class NotificationService {
  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('accessToken');

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }

    return result;
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<ApiResponse<NotificationResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(unreadOnly && { unreadOnly: 'true' }),
    });

    // Backend route: /notifications/:user_id
    return this.request<NotificationResponse>(`/notifications/${userId}?${params}`);
  }

  async getUnreadCount(userId: string): Promise<ApiResponse<{ unreadCount: number }>> {
    // Backend route: /notifications/unread-count/:user_id
    return this.request<{ unreadCount: number }>(`/notifications/unread-count/${userId}`);
  }

  async markAsRead(notificationId: string, userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${notificationId}/read`, 'PUT', { userId });
  }

  async markAllAsRead(userId: string): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.request<{ updatedCount: number }>(`/users/${userId}/notifications/read-all`, 'PUT');
  }

  async deleteNotification(notificationId: string, userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${notificationId}`, 'DELETE', { userId });
  }
}

export const notificationService = new NotificationService();


