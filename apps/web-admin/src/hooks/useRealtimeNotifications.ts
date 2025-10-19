import { useEffect, useState } from 'react';
import { scheduleService } from '../services/schedule.service';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface UseRealtimeNotificationsOptions {
  trainerId: string;
  enabled?: boolean;
  interval?: number; // milliseconds
}

export const useRealtimeNotifications = ({
  trainerId,
  enabled = true,
  interval = 5000, // 5 seconds
}: UseRealtimeNotificationsOptions) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!enabled || !trainerId) return;

    try {
      setIsLoading(true);
      setError(null);

      // This would need to be implemented in the backend
      // For now, we'll use a placeholder
      const response = await scheduleService.getUnreadNotifications(trainerId);

      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // This would need to be implemented in the backend
      await scheduleService.markNotificationAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      // This would need to be implemented in the backend
      await scheduleService.markAllNotificationsAsRead(trainerId);

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Polling effect
  useEffect(() => {
    if (!enabled || !trainerId) return;

    // Fetch immediately
    fetchNotifications();

    // Set up polling interval
    const intervalId = setInterval(fetchNotifications, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [trainerId, enabled, interval]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};
