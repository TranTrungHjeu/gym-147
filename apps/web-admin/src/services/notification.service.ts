import { scheduleApi } from './api';
import type { AxiosResponse } from 'axios';

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
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response: AxiosResponse<ApiResponse<T>>;

      switch (method) {
        case 'POST':
          response = await scheduleApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await scheduleApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await scheduleApi.delete<ApiResponse<T>>(endpoint, { data });
          break;
        default:
          response = await scheduleApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Request failed' };
      throw new Error(errorData.message || 'Request failed');
    }
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
    return this.request<{ updatedCount: number }>(`/notifications/read-all/${userId}`, 'PUT');
  }

  async deleteNotification(notificationId: string, userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${notificationId}`, 'DELETE', { userId });
  }
}

export const notificationService = new NotificationService();


