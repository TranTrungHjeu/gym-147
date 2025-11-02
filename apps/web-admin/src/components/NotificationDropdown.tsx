import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Notification, notificationService } from '../services/notification.service';
import { socketService } from '../services/socket.service';

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
    if (!userId) return;

    fetchNotifications();
    fetchUnreadCount();

    // Setup socket listener for real-time booking notifications
    const socket = socketService.getSocket();

    if (socket) {
      const handleBookingNew = (eventName: string, data?: any) => {
        console.log(`📢 Received ${eventName} event, refreshing notifications...`, data);
        // Add a small delay to ensure notification is saved to database
        setTimeout(() => {
          console.log(`📢 Fetching notifications after ${eventName} event...`);
          fetchNotifications();
          fetchUnreadCount();
        }, 500);
      };

      socket.on('booking:new', data => {
        console.log('📢 booking:new event:', data);
        handleBookingNew('booking:new', data);
      });
      socket.on('booking:pending_payment', data => {
        console.log('📢 booking:pending_payment event:', data);
        handleBookingNew('booking:pending_payment', data);
      });
      socket.on('booking:confirmed', data => {
        console.log('📢 booking:confirmed event:', data);
        handleBookingNew('booking:confirmed', data);
      });

      // Poll for new notifications every 30 seconds as backup
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => {
        socket.off('booking:new');
        socket.off('booking:pending_payment');
        socket.off('booking:confirmed');
        clearInterval(interval);
      };
    } else {
      // Fallback to polling if socket is not available
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
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
      console.log('📬 Full notification response:', response);
      if (response.success) {
        // Backend returns: { success: true, data: { notifications: [...], pagination: {...} } }
        const notifications = response.data?.notifications || [];
        console.log('📬 Fetched notifications:', notifications.length);
        console.log('📬 Notification data:', notifications);
        console.log('📬 Response data structure:', {
          hasData: !!response.data,
          hasNotifications: !!response.data?.notifications,
          notificationsIsArray: Array.isArray(notifications),
          notificationsLength: notifications.length,
        });
        if (Array.isArray(notifications)) {
          setNotifications(notifications);
        } else {
          console.error('❌ Notifications is not an array:', notifications);
          setNotifications([]);
        }
      } else {
        console.error('❌ Failed to fetch notifications:', response.message);
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount(userId);
      if (response.success) {
        console.log('📊 Unread count:', response.data.unreadCount);
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
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'CERTIFICATION_VERIFIED':
        return <CheckCheck className={iconClass} />;
      case 'CERTIFICATION_REJECTED':
        return <XCircle className={iconClass} />;
      case 'CERTIFICATION_AUTO_VERIFIED':
        return <Sparkles className={iconClass} />;
      case 'CLASS_BOOKING':
        return <Calendar className={iconClass} />;
      case 'CLASS_CANCELLED':
        return <AlertCircle className={iconClass} />;
      case 'MEMBERSHIP_EXPIRING':
        return <Clock className={iconClass} />;
      case 'ACHIEVEMENT_UNLOCKED':
        return <Trophy className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'CERTIFICATION_VERIFIED':
      case 'CERTIFICATION_AUTO_VERIFIED':
        return {
          text: 'text-success-600 dark:text-success-400',
          bg: 'bg-success-50 dark:bg-success-500/10',
          border: 'border-success-200 dark:border-success-500/20',
        };
      case 'CERTIFICATION_REJECTED':
        return {
          text: 'text-error-600 dark:text-error-400',
          bg: 'bg-error-50 dark:bg-error-500/10',
          border: 'border-error-200 dark:border-error-500/20',
        };
      case 'CLASS_BOOKING':
        return {
          text: 'text-blue-light-600 dark:text-blue-light-400',
          bg: 'bg-blue-light-50 dark:bg-blue-light-500/10',
          border: 'border-blue-light-200 dark:border-blue-light-500/20',
        };
      case 'CLASS_CANCELLED':
        return {
          text: 'text-warning-600 dark:text-warning-400',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
          border: 'border-warning-200 dark:border-warning-500/20',
        };
      case 'MEMBERSHIP_EXPIRING':
        return {
          text: 'text-warning-600 dark:text-warning-400',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
          border: 'border-warning-200 dark:border-warning-500/20',
        };
      case 'ACHIEVEMENT_UNLOCKED':
        return {
          text: 'text-primary-600 dark:text-primary-400',
          bg: 'bg-primary-50 dark:bg-primary-500/10',
          border: 'border-primary-200 dark:border-primary-500/20',
        };
      default:
        return {
          text: 'text-neutral-600 dark:text-neutral-400',
          bg: 'bg-neutral-50 dark:bg-neutral-800/50',
          border: 'border-neutral-200 dark:border-neutral-700',
        };
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
    <div className='relative font-sans' ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-all duration-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2'
        aria-label='Thông báo'
        aria-expanded={isOpen}
      >
        <Bell className='w-5 h-5' />
        {unreadCount > 0 && (
          <span className='absolute -top-0.5 -right-0.5 bg-error-500 text-white text-[10px] font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 animate-pulse'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className='absolute right-0 mt-2 w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-brand border border-neutral-200 dark:border-neutral-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200'>
          {/* Header */}
          <div className='px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-heading font-semibold text-neutral-900 dark:text-white'>
                  Thông báo
                </h3>
                {unreadCount > 0 && (
                  <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400'>
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className='text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-500/10'
                >
                  <CheckCheck className='w-4 h-4' />
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className='max-h-96 overflow-y-auto custom-scrollbar'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400 mx-auto'></div>
                <p className='text-sm font-medium text-neutral-600 dark:text-neutral-400 mt-3'>
                  Đang tải thông báo...
                </p>
              </div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <div className='p-10 text-center'>
                <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center'>
                  <Bell className='w-8 h-8 text-neutral-400 dark:text-neutral-500' />
                </div>
                <p className='text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Không có thông báo nào
                </p>
                <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                  Các thông báo mới sẽ hiển thị ở đây
                </p>
                {!Array.isArray(notifications) && (
                  <p className='text-xs text-error-500 mt-2'>
                    Debug: notifications is not an array ({typeof notifications})
                  </p>
                )}
              </div>
            ) : (
              notifications
                .filter(notification => notification && notification.id)
                .map((notification, index) => {
                  const colors = getNotificationColor(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`relative px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/50 transition-all duration-200 ${
                        !notification.is_read
                          ? `${colors.bg} border-l-4 ${colors.border}`
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      } ${index === 0 ? 'pt-4' : ''}`}
                    >
                      <div className='flex items-start gap-3'>
                        {/* Icon Container */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-2'>
                            <div className='flex-1 min-w-0'>
                              <h4
                                className={`text-sm font-semibold ${colors.text} mb-1 leading-snug`}
                              >
                                {notification.title}
                              </h4>
                              <p className='text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-2'>
                                {notification.message}
                              </p>
                              <div className='flex items-center gap-2 mt-2'>
                                <span className='text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {!notification.is_read && (
                                  <span className='inline-block w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400'></span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className='flex items-start gap-1 flex-shrink-0'>
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className='p-1.5 text-neutral-400 hover:text-success-600 dark:hover:text-success-400 hover:bg-success-50 dark:hover:bg-success-500/10 rounded-md transition-all duration-200'
                                  title='Đánh dấu đã đọc'
                                  aria-label='Đánh dấu đã đọc'
                                >
                                  <Check className='w-4 h-4' />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteNotification(notification.id)}
                                className='p-1.5 text-neutral-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-md transition-all duration-200'
                                title='Xóa thông báo'
                                aria-label='Xóa thông báo'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Footer */}
          {Array.isArray(notifications) && notifications.length > 0 && (
            <div className='px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50'>
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/notifications';
                }}
                className='w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200 py-2 rounded-md hover:bg-primary-50 dark:hover:bg-primary-500/10'
              >
                Xem tất cả thông báo →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
