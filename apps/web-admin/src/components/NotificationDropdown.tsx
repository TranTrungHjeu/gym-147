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
import { useCallback, useEffect, useRef, useState } from 'react';
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

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await notificationService.getUserNotifications(userId, 1, 10);
      if (response.success) {
        const notifications = response.data?.notifications || [];
        if (Array.isArray(notifications)) {
          setNotifications(notifications);
        } else {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await notificationService.getUnreadCount(userId);
      if (response.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    fetchUnreadCount();

    // Socket should already be connected by AppLayout/TrainerLayout
    // Just get the socket and setup listeners
    const setupSocketListeners = () => {
      // Ensure socket is connected (but don't create new connection if already exists)
      const currentSocket = socketService.getSocket() || socketService.connect(userId);
      
      if (!currentSocket) {
        setTimeout(setupSocketListeners, 1000);
        return null;
      }

      if (!currentSocket.connected) {
        currentSocket.once('connect', setupSocketListeners);
        return null;
      }
      
      // Ensure we're subscribed to the user room
      if (userId) {
        currentSocket.emit('subscribe:user', userId);
      }
      
      const handleBookingNew = (eventName: string, data?: any) => {
        // Add a delay to ensure notification is saved to database
        // Use longer delay for schedule:new and certification events as they need to save to multiple admins
        const needsLongDelay = eventName === 'schedule:new' || 
                               eventName === 'certification:pending' || 
                               eventName === 'certification:verified' ||
                               eventName === 'certification:rejected' ||
                               eventName === 'certification:status';
        const delay = needsLongDelay ? 1000 : 500;
        
        // First fetch after delay
        setTimeout(() => {
          fetchNotifications();
          fetchUnreadCount();
        }, delay);
        
        // Retry fetch after additional delay if needed (for schedule:new and certification events)
        if (needsLongDelay) {
          setTimeout(() => {
            fetchNotifications();
            fetchUnreadCount();
          }, delay + 1000);
        }
      };

      currentSocket.on('booking:new', data => handleBookingNew('booking:new', data));
      currentSocket.on('booking:pending_payment', data => handleBookingNew('booking:pending_payment', data));
      currentSocket.on('booking:confirmed', data => handleBookingNew('booking:confirmed', data));
      currentSocket.on('schedule:new', data => handleBookingNew('schedule:new', data));
      currentSocket.on('certification:pending', data => handleBookingNew('certification:pending', data));
      currentSocket.on('certification:status', data => handleBookingNew('certification:status', data));
      currentSocket.on('certification:verified', data => handleBookingNew('certification:verified', data));
      currentSocket.on('certification:rejected', data => handleBookingNew('certification:rejected', data));

      // Poll for new notifications every 30 seconds as backup
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => {
        currentSocket.off('booking:new');
        currentSocket.off('booking:pending_payment');
        currentSocket.off('booking:confirmed');
        currentSocket.off('schedule:new');
        currentSocket.off('certification:pending');
        currentSocket.off('certification:status');
        currentSocket.off('certification:verified');
        currentSocket.off('certification:rejected');
        clearInterval(interval);
      };
    };

    const cleanup = setupSocketListeners();

    // Fallback to polling if socket is not available
    const pollingInterval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => {
      if (cleanup) cleanup();
      clearInterval(pollingInterval);
    };
  }, [userId, fetchNotifications, fetchUnreadCount]);

  // Listen for custom events from AppLayout/TrainerLayout (for certification updates)
  useEffect(() => {
    const handleCertificationUpdated = (event: CustomEvent) => {
      // Use same delay logic as socket events (1000ms + retry 2000ms)
      setTimeout(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 1000);
      
      // Retry after additional delay
      setTimeout(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 2000);
    };

    window.addEventListener('certification:updated', handleCertificationUpdated as EventListener);

    return () => {
      window.removeEventListener('certification:updated', handleCertificationUpdated as EventListener);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
        // Reload notifications and unread count from backend to ensure consistency
        await fetchNotifications();
        await fetchUnreadCount();
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

  const getNotificationRole = (notification: Notification): string | null => {
    const { type, data } = notification;

    // Check if data contains role information
    if (data && typeof data === 'object') {
      if ('role' in data) {
        return data.role as string;
      }
      // If notification has trainer_id or trainer_name, it's from TRAINER
      if ('trainer_id' in data || 'trainer_name' in data) {
        return 'TRAINER';
      }
      // If notification has member_id or member_name, it's from MEMBER
      if ('member_id' in data || 'member_name' in data) {
        return 'MEMBER';
      }
    }

    // Infer role from notification type
    if (type.startsWith('CERTIFICATION_')) {
      return 'TRAINER';
    }
    if (type === 'CLASS_BOOKING' || type === 'MEMBERSHIP_' || type.startsWith('MEMBERSHIP_')) {
      return 'MEMBER';
    }
    if (type === 'SYSTEM_ANNOUNCEMENT' || type === 'GENERAL') {
      // Check message content for hints
      const message = notification.message.toLowerCase();
      if (message.includes('trainer') || message.includes('huấn luyện viên')) {
        return 'TRAINER';
      }
      if (message.includes('admin') || message.includes('quản trị')) {
        return 'ADMIN';
      }
      // Default for GENERAL from trainer creating class
      if (message.includes('tạo lớp') || message.includes('lớp học mới')) {
        return 'TRAINER';
      }
      return 'SYSTEM';
    }

    return null;
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;

    const roleConfig: Record<string, { label: string; className: string }> = {
      TRAINER: {
        label: 'Huấn luyện viên',
        className:
          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
      },
      MEMBER: {
        label: 'Thành viên',
        className:
          'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30',
      },
      ADMIN: {
        label: 'Quản trị viên',
        className:
          'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
      },
      SUPER_ADMIN: {
        label: 'Super Admin',
        className:
          'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
      },
      SYSTEM: {
        label: 'Hệ thống',
        className:
          'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
      },
    };

    const config = roleConfig[role] || {
      label: role,
      className:
        'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-theme-xs font-heading font-semibold border ${config.className} shadow-sm`}
      >
        {config.label}
      </span>
    );
  };

  const renderMessageWithBadge = (notification: Notification) => {
    const role = getNotificationRole(notification);
    const badge = getRoleBadge(role);
    
    // Extract name from message or data
    let name = '';
    if (notification.data && typeof notification.data === 'object') {
      name = notification.data.trainer_name || notification.data.member_name || '';
    }
    
    // If no name in data, try to extract from message (first word before "đã")
    if (!name) {
      const match = notification.message.match(/^([^đ]+?)\s+đã/);
      if (match) {
        name = match[1].trim();
      }
    }
    
    // Format message with bold name
    const formatMessage = (message: string, nameToBold: string) => {
      if (!nameToBold) {
        return message;
      }
      // Replace name with bold version
      const regex = new RegExp(`(${nameToBold.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
      const parts = message.split(regex);
      return parts.map((part, index) => 
        part === nameToBold ? (
          <strong key={index} className='font-bold'>{part}</strong>
        ) : (
          part
        )
      );
    };
    
    if (!badge) {
      return <span>{formatMessage(notification.message, name)}</span>;
    }

    // Render badge and message as inline elements within the same container
    return (
      <>
        {badge}
        <span className='ml-2'>{formatMessage(notification.message, name)}</span>
      </>
    );
  };

  return (
    <div className='relative font-sans' ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-all duration-300 ease-in-out rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-2 active:scale-95'
        aria-label='Thông báo'
        aria-expanded={isOpen}
      >
        <Bell className='w-5 h-5 transition-transform duration-300 hover:scale-110' />
        {unreadCount > 0 && (
          <span className='absolute -top-0.5 -right-0.5 bg-error-500 text-white text-theme-xs font-heading font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg shadow-error-500/50 border-2 border-white dark:border-gray-900 animate-pulse'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className='absolute right-0 mt-2.5 w-[420px] bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl shadow-gray-900/10 dark:shadow-gray-900/50 border border-gray-200/80 dark:border-gray-800/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300'>
          {/* Header */}
          <div className='px-5 py-4 border-b border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900/95'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <h3 className='text-theme-xl font-heading font-semibold text-gray-900 dark:text-white tracking-tight'>
                  Thông báo
                </h3>
                {unreadCount > 0 && (
                  <span className='inline-flex items-center px-2.5 py-1 rounded-full text-theme-xs font-heading font-bold bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400 shadow-sm'>
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className='text-theme-xs font-heading font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 active:scale-95'
                >
                  <CheckCheck className='w-3.5 h-3.5' />
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className='max-h-[480px] overflow-y-auto custom-scrollbar'>
            {loading ? (
              <div className='p-10 text-center'>
                <div className='animate-spin rounded-full h-9 w-9 border-[3px] border-orange-200 border-t-orange-600 dark:border-orange-800 dark:border-t-orange-400 mx-auto'></div>
                <p className='text-theme-sm font-inter font-medium text-gray-600 dark:text-gray-400 mt-4'>
                  Đang tải thông báo...
                </p>
              </div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <div className='p-12 text-center'>
                <div className='w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center shadow-inner'>
                  <Bell className='w-9 h-9 text-gray-400 dark:text-gray-500' />
                </div>
                <p className='text-theme-sm font-heading font-semibold text-gray-700 dark:text-gray-300 mb-1.5'>
                  Không có thông báo nào
                </p>
                <p className='text-theme-xs font-inter text-gray-500 dark:text-gray-400'>
                  Các thông báo mới sẽ hiển thị ở đây
                </p>
                {!Array.isArray(notifications) && (
                  <p className='text-theme-xs font-inter text-error-500 mt-2'>
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
                      className={`group relative pl-16 pr-5 py-4 transition-all duration-300 ease-in-out ${
                        !notification.is_read
                          ? `${colors.bg} border-l-[3px] border-orange-500 dark:border-orange-400 shadow-sm ring-1 ring-orange-200 dark:ring-orange-500/20`
                          : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 bg-white dark:bg-gray-900/95'
                      } ${index === 0 ? 'pt-4' : ''}`}
                    >
                      {/* Icon - positioned at center left */}
                      <div className='absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center'>
                        <div className={colors.text}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className='flex-1 min-w-0 relative'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='flex-1 min-w-0'>
                              <h4
                                className={`text-theme-sm font-heading font-semibold ${colors.text} mb-1.5 leading-tight tracking-tight`}
                              >
                                {notification.title}
                              </h4>
                              <p className='text-theme-xs font-heading text-gray-600 dark:text-gray-300 leading-relaxed mb-2'>
                                {renderMessageWithBadge(notification)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className='flex items-start gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className='p-1.5 text-gray-400 hover:text-success-600 dark:hover:text-success-400 hover:bg-success-50 dark:hover:bg-success-500/10 rounded-lg transition-all duration-200 active:scale-95'
                                  title='Đánh dấu đã đọc'
                                  aria-label='Đánh dấu đã đọc'
                                >
                                  <Check className='w-4 h-4' />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteNotification(notification.id)}
                                className='p-1.5 text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all duration-200 active:scale-95'
                                title='Xóa thông báo'
                                aria-label='Xóa thông báo'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </div>
                          {/* Time - positioned at bottom right */}
                          <div className='absolute bottom-0 right-0'>
                            <span className='text-[10px] font-heading font-medium text-gray-400 dark:text-gray-500'>
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Footer */}
          {Array.isArray(notifications) && notifications.length > 0 && (
            <div className='px-5 py-3 border-t border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900/95'>
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/notifications';
                }}
                className='w-full text-center text-theme-xs font-heading font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-all duration-200 py-2.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 active:scale-[0.98]'
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
