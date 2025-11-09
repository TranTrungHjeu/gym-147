import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import AdminCard from './AdminCard';
import AdminButton from './AdminButton';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
  realTimeUpdates?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  onNotificationClick,
  realTimeUpdates = true,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNotifications();
    
    if (realTimeUpdates) {
      // Poll for new notifications every 30 seconds
      intervalRef.current = setInterval(() => {
        loadNotifications();
      }, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, realTimeUpdates]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await notificationService.getNotifications(userId);
      
      // Mock data for now
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'info',
          title: 'Thông báo hệ thống',
          message: 'Hệ thống sẽ bảo trì vào ngày mai từ 2h-4h sáng',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          read: false,
        },
        {
          id: '2',
          type: 'success',
          title: 'Đăng ký thành công',
          message: 'Thành viên mới đã đăng ký gói tập Premium',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          read: false,
        },
        {
          id: '3',
          type: 'warning',
          title: 'Cảnh báo thiết bị',
          message: 'Thiết bị "Máy chạy bộ 1" đang trong trạng thái bảo trì',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          read: true,
        },
        {
          id: '4',
          type: 'error',
          title: 'Lỗi thanh toán',
          message: 'Giao dịch thanh toán #12345 thất bại',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
          read: false,
        },
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // TODO: Replace with actual API call
      // await notificationService.markAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // TODO: Replace with actual API call
      // await notificationService.markAllAsRead(userId);
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // TODO: Replace with actual API call
      // await notificationService.deleteNotification(notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className='w-5 h-5 text-success-500 dark:text-success-400' />;
      case 'warning':
        return <AlertTriangle className='w-5 h-5 text-warning-500 dark:text-warning-400' />;
      case 'error':
        return <AlertCircle className='w-5 h-5 text-error-500 dark:text-error-400' />;
      case 'info':
      default:
        return <Info className='w-5 h-5 text-blue-500 dark:text-blue-400' />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800';
      case 'warning':
        return 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800';
      case 'error':
        return 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return timestamp.toLocaleDateString('vi-VN');
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div className='relative'>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
      >
        <Bell className='w-6 h-6 text-gray-600 dark:text-gray-400' />
        {unreadCount > 0 && (
          <span className='absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-orange-600 dark:bg-orange-500 text-white text-xs font-bold rounded-full font-inter'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className='absolute right-0 top-full mt-2 w-96 max-h-[600px] overflow-hidden z-50'>
            <AdminCard padding='none' className='shadow-xl'>
              {/* Header */}
              <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800'>
                <div className='flex items-center gap-2'>
                  <Bell className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
                    Thông báo
                  </h3>
                  {unreadCount > 0 && (
                    <span className='px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs rounded-full font-inter'>
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  {unreadCount > 0 && (
                    <AdminButton
                      variant='outline'
                      size='sm'
                      onClick={markAllAsRead}
                    >
                      Đánh dấu tất cả
                    </AdminButton>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                  >
                    <X className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className='max-h-[500px] overflow-y-auto'>
                {isLoading ? (
                  <div className='p-8 text-center text-gray-500 dark:text-gray-400 font-inter'>
                    Đang tải...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className='p-8 text-center text-gray-500 dark:text-gray-400 font-inter'>
                    <Bell className='w-12 h-12 mx-auto mb-2 opacity-50' />
                    <p>Không có thông báo nào</p>
                  </div>
                ) : (
                  <div className='divide-y divide-gray-200 dark:divide-gray-800'>
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className='flex items-start gap-3'>
                          <div className='flex-shrink-0 mt-0.5'>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-start justify-between gap-2'>
                              <h4 className='text-sm font-semibold font-heading text-gray-900 dark:text-white'>
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className='w-2 h-2 bg-orange-600 dark:bg-orange-500 rounded-full flex-shrink-0 mt-1.5' />
                              )}
                            </div>
                            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1 font-inter line-clamp-2'>
                              {notification.message}
                            </p>
                            <div className='flex items-center justify-between mt-2'>
                              <span className='text-xs text-gray-500 dark:text-gray-500 font-inter'>
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              {notification.actionLabel && (
                                <span className='text-xs text-orange-600 dark:text-orange-400 font-inter font-medium'>
                                  {notification.actionLabel} →
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className='flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors'
                          >
                            <X className='w-4 h-4 text-gray-400 dark:text-gray-500' />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className='p-4 border-t border-gray-200 dark:border-gray-800'>
                  <AdminButton
                    variant='outline'
                    size='sm'
                    className='w-full'
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to full notifications page
                      window.location.href = '/notifications';
                    }}
                  >
                    Xem tất cả thông báo
                  </AdminButton>
                </div>
              )}
            </AdminCard>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;

