import type { AxiosResponse } from 'axios';
import { identityApi } from './api';

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
          response = await identityApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await identityApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await identityApi.delete<ApiResponse<T>>(endpoint, { data });
          break;
        default:
          response = await identityApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Request failed' };
      throw new Error(errorData.message || 'Request failed');
    }
  }

  async getUserNotifications(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ): Promise<ApiResponse<NotificationResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
    if (params?.type) queryParams.append('type', params.type);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.search) queryParams.append('search', params.search);

    // Backend route: GET /notifications (uses auth middleware to get userId from token)
    // Note: userId parameter is kept for consistency but backend gets it from token
    return this.request<NotificationResponse>(`/notifications?${queryParams}`);
  }

  async getUnreadCount(
    userId: string
  ): Promise<ApiResponse<{ count: number; unreadCount: number }>> {
    // Backend route: GET /notifications/unread-count/:userId (no auth required for this endpoint)
    return this.request<{ count: number; unreadCount: number }>(
      `/notifications/unread-count/${userId}`
    );
  }

  async markAsRead(notificationId: string, userId?: string): Promise<ApiResponse<any>> {
    // Backend route: PUT /notifications/:notificationId/read (uses auth middleware)
    return this.request<any>(`/notifications/${notificationId}/read`, 'PUT');
  }

  async markAllAsRead(userId?: string): Promise<ApiResponse<{ updated_count: number }>> {
    // Backend route: PUT /notifications/read-all (uses auth middleware)
    return this.request<{ updated_count: number }>(`/notifications/read-all`, 'PUT');
  }

  async deleteNotification(notificationId: string, userId?: string): Promise<ApiResponse<any>> {
    // Backend route: DELETE /notifications/:notificationId (uses auth middleware)
    return this.request<any>(`/notifications/${notificationId}`, 'DELETE');
  }

  async bulkMarkAsRead(userId: string, notificationIds: string[]): Promise<ApiResponse<{ updated_count: number }>> {
    // Backend route: PUT /notifications/bulk/read
    return this.request<{ updated_count: number }>(
      `/notifications/bulk/read`,
      'PUT',
      { notification_ids: notificationIds }
    );
  }

  async bulkDelete(userId: string, notificationIds: string[]): Promise<ApiResponse<{ deleted_count: number }>> {
    // Backend route: DELETE /notifications/bulk
    return this.request<{ deleted_count: number }>(
      `/notifications/bulk`,
      'DELETE',
      { notification_ids: notificationIds }
    );
  }

  async deleteAllRead(userId: string): Promise<ApiResponse<{ deleted_count: number }>> {
    // Note: This method fetches all read notifications and deletes them
    // A dedicated backend endpoint would be more efficient
    try {
      // First, get all notifications (backend uses token, userId param is for consistency)
      const response = await this.getUserNotifications(userId, { page: 1, limit: 1000 });
      if (response.success && response.data?.notifications) {
        const readNotifications = response.data.notifications.filter(n => n.is_read);
        if (readNotifications.length > 0) {
          return await this.bulkDelete(userId, readNotifications.map(n => n.id));
        }
      }

      return {
        success: true,
        data: { deleted_count: 0 },
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete all read notifications');
    }
  }

  // ==================== BULK NOTIFICATION METHODS ====================

  /**
   * Send bulk notification to members
   */
  async sendBulkNotificationToMembers(data: {
    title: string;
    message: string;
    type?: string;
    filters?: {
      membership_type?: string;
      membership_status?: string;
      search?: string;
    };
    member_ids?: string[];
    data?: any;
  }): Promise<ApiResponse<{
    total_targets: number;
    sent_count: number;
    failed_count: number;
    errors?: Array<{ userId: string; error: string }>;
    history_id?: string;
  }>> {
    // Backend route: POST /notifications/bulk/members
    return this.request<{
      total_targets: number;
      sent_count: number;
      failed_count: number;
      errors?: Array<{ userId: string; error: string }>;
      history_id?: string;
    }>('/notifications/bulk/members', 'POST', data);
  }

  /**
   * Send bulk notification to trainers
   */
  async sendBulkNotificationToTrainers(data: {
    title: string;
    message: string;
    type?: string;
    filters?: {
      status?: string;
      specialization?: string;
    };
    trainer_ids?: string[];
    data?: any;
  }): Promise<ApiResponse<{
    total_targets: number;
    sent_count: number;
    failed_count: number;
    errors?: Array<{ userId: string; error: string }>;
    history_id?: string;
  }>> {
    // Backend route: POST /notifications/bulk/trainers
    return this.request<{
      total_targets: number;
      sent_count: number;
      failed_count: number;
      errors?: Array<{ userId: string; error: string }>;
      history_id?: string;
    }>('/notifications/bulk/trainers', 'POST', data);
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(filters?: {
    page?: number;
    limit?: number;
    sender_id?: string;
    target_type?: 'MEMBER' | 'TRAINER';
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    history: Array<{
      id: string;
      sender_id: string;
      sender_role: string;
      target_type: string;
      target_ids?: string[];
      filters?: any;
      title: string;
      message: string;
      notification_type: string;
      sent_count: number;
      failed_count: number;
      total_targets: number;
      created_at: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.sender_id) queryParams.append('sender_id', filters.sender_id);
    if (filters?.target_type) queryParams.append('target_type', filters.target_type);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    // Backend route: GET /notifications/history
    return this.request<{
      history: Array<{
        id: string;
        sender_id: string;
        sender_role: string;
        target_type: string;
        target_ids?: string[];
        filters?: any;
        title: string;
        message: string;
        notification_type: string;
        sent_count: number;
        failed_count: number;
        total_targets: number;
        created_at: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/notifications/history?${queryParams.toString()}`);
  }
}

export const notificationService = new NotificationService();
