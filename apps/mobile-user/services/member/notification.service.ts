import type {
  CreateNotificationRequest,
  Notification,
  NotificationFilters,
  NotificationPreferences,
  UpdateNotificationRequest,
} from '@/types/notificationTypes';
import { memberApiService } from './api.service';
import { identityApiService } from '../identity/api.service';

export class NotificationService {
  // Notifications
  async getMemberNotifications(
    userId: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status === 'UNREAD') params.append('unreadOnly', 'true');
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) {
        // Convert offset to page number
        const page = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
        params.append('page', page.toString());
      }

      console.log('[BELL] Fetching notifications from identity service with params:', params.toString());
      const response = await identityApiService.get(
        `/notifications?${params}`
      );
      console.log('[BELL] Identity service notifications response:', response);
      // Identity service returns { success: true, data: { notifications: [...], pagination: {...} } }
      const notifications = (response.data as any)?.data?.notifications || (response.data as any)?.notifications || [];
      return notifications as Notification[];
    } catch (error) {
      console.error('Error fetching member notifications:', error);
      throw error;
    }
  }

  async getNotificationById(notificationId: string): Promise<Notification> {
    try {
      // Notifications are in identity-service, but there's no direct endpoint for single notification
      // We'll need to get all notifications and filter, or this might need to be handled differently
      // For now, try to get from identity service notifications list
      const response = await identityApiService.get(`/notifications`);
      const notifications = (response.data as any)?.data?.notifications || (response.data as any)?.notifications || [];
      const notification = notifications.find((n: Notification) => n.id === notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      return notification as Notification;
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  }

  async createNotification(
    notification: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      // Notifications are in identity-service, use identityApiService
      const response = await identityApiService.post(
        '/notifications',
        notification
      );
      return (response.data as any)?.data || response.data as Notification;
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
      // Notifications are in identity-service, but there's no update endpoint
      // This might need to be handled differently or removed
      throw new Error('Update notification not supported');
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      // Notifications are in identity-service, use identityApiService
      await identityApiService.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Notification Status
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      // Notifications are in identity-service, use identityApiService
      const response = await identityApiService.put(
        `/notifications/${notificationId}/read`
      );
      return (response.data as any)?.data || response.data as Notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAsUnread(notificationId: string): Promise<Notification> {
    try {
      // Notifications are in identity-service, but there's no unread endpoint
      // This might need to be handled differently or removed
      throw new Error('Mark as unread not supported');
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      await identityApiService.put(`/notifications/read-all`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteAllRead(userId: string): Promise<void> {
    try {
      // Notifications are in identity-service, but there's no delete all read endpoint
      // This might need to be handled differently or removed
      throw new Error('Delete all read notifications not supported');
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
      throw error;
    }
  }

  // Notification Counts
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Notifications are in identity-service, use identityApiService
      const response = await identityApiService.get(
        `/notifications/unread-count/${userId}`
      );
      return (response.data as any)?.count || (response.data as any)?.unreadCount || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  async getNotificationStats(userId: string): Promise<any> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Use /metrics endpoint which provides notification statistics
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      const response = await identityApiService.get(`/notifications/metrics`);
      return (response.data as any)?.data || response.data as any;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  // Notification Preferences
  async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      const response = await identityApiService.get(`/notifications/preferences`);
      return (response.data as any)?.data || response.data as NotificationPreferences;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      const response = await identityApiService.put(`/notifications/preferences`, {
        preferences,
      });
      return (response.data as any)?.data || response.data as NotificationPreferences;
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
    userId: string,
    notificationIds: string[]
  ): Promise<void> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      await identityApiService.put(
        `/notifications/bulk/read`,
        {
          notificationIds,
        }
      );
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
      throw error;
    }
  }

  async bulkDelete(userId: string, notificationIds: string[]): Promise<void> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      // Identity service expects notification_ids (snake_case) in the body
      // We'll need to manually construct the DELETE request with body since ApiService.delete doesn't support body
      const { SERVICE_URLS } = require('@/config/environment');
      const { getToken } = require('../api');
      
      const url = `${SERVICE_URLS.IDENTITY}/notifications/bulk`;
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('[API] API DELETE Request (with body):', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ notification_ids: notificationIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      throw error;
    }
  }

  // Search and Filter
  async searchNotifications(
    userId: string,
    query: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Use search query parameter instead of separate search endpoint
      const params = new URLSearchParams();
      params.append('search', query);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status === 'UNREAD') params.append('unreadOnly', 'true');
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) {
        // Convert offset to page number
        const page = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
        params.append('page', page.toString());
      }

      const response = await identityApiService.get(
        `/notifications?${params}`
      );
      // Identity service returns { success: true, data: { notifications: [...], pagination: {...} } }
      const notifications = (response.data as any)?.data?.notifications || (response.data as any)?.notifications || [];
      return notifications as Notification[];
    } catch (error) {
      console.error('Error searching notifications:', error);
      throw error;
    }
  }

  // Notification Analytics
  async getNotificationAnalytics(
    userId: string,
    period: string = 'monthly'
  ): Promise<any> {
    try {
      // Notifications are in identity-service, use identityApiService
      // Use /metrics endpoint which provides notification statistics
      // Note: userId parameter is kept for API compatibility but identity service gets userId from JWT token
      // Period parameter might not be supported, but we'll try to add it as a query param
      const response = await identityApiService.get(
        `/notifications/metrics${period ? `?period=${period}` : ''}`
      );
      return (response.data as any)?.data || response.data as any;
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
