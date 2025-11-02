import type {
  CreateNotificationRequest,
  Notification,
  NotificationFilters,
  NotificationPreferences,
  UpdateNotificationRequest,
} from '@/types/notificationTypes';
import { memberApiService } from './api.service';

export class NotificationService {
  // Notifications
  async getMemberNotifications(
    memberId: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await memberApiService.get(
        `/members/${memberId}/notifications?${params}`
      );
      return response.data as Notification[];
    } catch (error) {
      console.error('Error fetching member notifications:', error);
      throw error;
    }
  }

  async getNotificationById(notificationId: string): Promise<Notification> {
    try {
      const response = await memberApiService.get(
        `/notifications/${notificationId}`
      );
      return response.data as Notification;
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  }

  async createNotification(
    notification: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      const response = await memberApiService.post(
        '/notifications',
        notification
      );
      return response.data as Notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async updateNotification(
    notificationId: string,
    updates: UpdateNotificationRequest
  ): Promise<Notification> {
    try {
      const response = await memberApiService.put(
        `/notifications/${notificationId}`,
        updates
      );
      return response.data as Notification;
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await memberApiService.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Notification Status
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const response = await memberApiService.put(
        `/notifications/${notificationId}/read`
      );
      return response.data as Notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAsUnread(notificationId: string): Promise<Notification> {
    try {
      const response = await memberApiService.put(
        `/notifications/${notificationId}/unread`
      );
      return response.data as Notification;
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      throw error;
    }
  }

  async markAllAsRead(memberId: string): Promise<void> {
    try {
      await memberApiService.put(`/members/${memberId}/notifications/read-all`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteAllRead(memberId: string): Promise<void> {
    try {
      await memberApiService.delete(`/members/${memberId}/notifications/read`);
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
      throw error;
    }
  }

  // Notification Counts
  async getUnreadCount(memberId: string): Promise<number> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/notifications/unread-count`
      );
      return (response.data as any).count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  async getNotificationStats(memberId: string): Promise<any> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/notifications/stats`
      );
      return response.data as any;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  // Notification Preferences
  async getNotificationPreferences(
    memberId: string
  ): Promise<NotificationPreferences> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/notification-preferences`
      );
      return response.data as NotificationPreferences;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(
    memberId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const response = await memberApiService.put(
        `/members/${memberId}/notification-preferences`,
        preferences
      );
      return response.data as NotificationPreferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Push Notifications
  async registerPushToken(
    memberId: string,
    token: string,
    platform: 'ios' | 'android'
  ): Promise<void> {
    try {
      await memberApiService.post(`/members/${memberId}/push-tokens`, {
        token,
        platform,
      });
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  async unregisterPushToken(memberId: string, token: string): Promise<void> {
    try {
      await memberApiService.delete(
        `/members/${memberId}/push-tokens/${token}`
      );
    } catch (error) {
      console.error('Error unregistering push token:', error);
      throw error;
    }
  }

  // Notification Templates
  async getNotificationTemplates(): Promise<any[]> {
    try {
      const response = await memberApiService.get('/notification-templates');
      return response.data as any[];
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      throw error;
    }
  }

  // Bulk Operations
  async bulkMarkAsRead(
    memberId: string,
    notificationIds: string[]
  ): Promise<void> {
    try {
      await memberApiService.put(
        `/members/${memberId}/notifications/bulk-read`,
        {
          notificationIds,
        }
      );
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
      throw error;
    }
  }

  async bulkDelete(memberId: string, notificationIds: string[]): Promise<void> {
    try {
      // For bulk delete, we'll use POST with the IDs in the body
      await memberApiService.post(
        `/members/${memberId}/notifications/bulk-delete`,
        { notificationIds }
      );
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      throw error;
    }
  }

  // Search and Filter
  async searchNotifications(
    memberId: string,
    query: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await memberApiService.get(
        `/members/${memberId}/notifications/search?${params}`
      );
      return response.data as Notification[];
    } catch (error) {
      console.error('Error searching notifications:', error);
      throw error;
    }
  }

  // Notification Analytics
  async getNotificationAnalytics(
    memberId: string,
    period: string = 'monthly'
  ): Promise<any> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/notifications/analytics?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
