import { Bell, Check, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Notification, notificationService } from '../services/notification.service';

interface NotificationDropdownProps {
  userId: string;
}

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getUserNotifications(userId, 1, 10);
      if (response.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount(userId);
      if (response.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await notificationService.markAsRead(notificationId, userId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead(userId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const response = await notificationService.deleteNotification(notificationId, userId);
      if (response.success) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        // Check if the deleted notification was unread
        const deletedNotification = notifications.find(notif => notif.id === notificationId);
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CERTIFICATION_VERIFIED':
        return '✅';
      case 'CERTIFICATION_REJECTED':
        return '❌';
      case 'CERTIFICATION_AUTO_VERIFIED':
        return '🤖';
      case 'CLASS_BOOKING':
        return '📅';
      case 'CLASS_CANCELLED':
        return '🚫';
      case 'MEMBERSHIP_EXPIRING':
        return '⏰';
      case 'ACHIEVEMENT_UNLOCKED':
        return '🏆';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'CERTIFICATION_VERIFIED':
      case 'CERTIFICATION_AUTO_VERIFIED':
        return 'text-green-600';
      case 'CERTIFICATION_REJECTED':
        return 'text-red-600';
      case 'CLASS_BOOKING':
        return 'text-blue-600';
      case 'CLASS_CANCELLED':
        return 'text-orange-600';
      case 'MEMBERSHIP_EXPIRING':
        return 'text-yellow-600';
      case 'ACHIEVEMENT_UNLOCKED':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200'
      >
        <Bell className='w-6 h-6' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className='absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'>
          {/* Header */}
          <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Thông báo</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='p-4 text-center'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto'></div>
                <p className='text-sm text-gray-500 mt-2'>Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className='p-4 text-center text-gray-500 dark:text-gray-400'>
                <Bell className='w-8 h-8 mx-auto mb-2 opacity-50' />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                    !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className='flex items-start space-x-3'>
                    <div className='flex-shrink-0'>
                      <span className='text-lg'>{getNotificationIcon(notification.type)}</span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <p
                          className={`text-sm font-medium ${getNotificationColor(notification.type)}`}
                        >
                          {notification.title}
                        </p>
                        <div className='flex items-center space-x-1'>
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                              title='Đánh dấu đã đọc'
                            >
                              <Check className='w-4 h-4' />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className='p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                            title='Xóa thông báo'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                        {notification.message}
                      </p>
                      <p className='text-xs text-gray-400 dark:text-gray-500 mt-2'>
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='p-3 border-t border-gray-200 dark:border-gray-700'>
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/notifications';
                }}
                className='w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


