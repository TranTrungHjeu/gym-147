import { notificationService } from '@/services/notification.service';
import { AlertCircle, AlertTriangle, Bell, CheckCircle, Info, X, Filter, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../../hooks/useTranslation';
import AdminButton from './AdminButton';
import AdminCard from './AdminCard';
import CustomSelect from './CustomSelect';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  notificationData?: any;
  notificationType?: string;
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNotifications(1, false);
    setPage(1);

    if (realTimeUpdates) {
      // Poll for new notifications every 30 seconds
      intervalRef.current = setInterval(() => {
        loadNotifications(1, false);
      }, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, realTimeUpdates, filterType, filterRead]);

  // ... (inside component)

  const loadNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: pageNum,
        limit: 20,
      };
      
      if (filterRead !== 'all') {
        params.unreadOnly = filterRead === 'unread';
      }
      
      if (filterType !== 'all') {
        params.type = filterType;
      }

      const response = await notificationService.getUserNotifications(userId, params);

      if (response.success && response.data) {
        const mappedNotifications: Notification[] = response.data.notifications.map((n: any) => ({
          id: n.id,
          type: mapNotificationType(n.type),
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.is_read,
          actionUrl: n.data?.action_route || n.data?.actionUrl,
          actionLabel: n.data?.actionLabel,
          notificationData: n.data, // Store full data for custom handling
          notificationType: n.type, // Store original type
        }));

        if (append) {
          setNotifications(prev => [...prev, ...mappedNotifications]);
        } else {
          setNotifications(mappedNotifications);
        }

        setUnreadCount(response.data.pagination?.total || mappedNotifications.filter(n => !n.read).length);
        setHasMore(mappedNotifications.length === 20 && (response.data.pagination?.pages || 0) > pageNum);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mapNotificationType = (type: string): Notification['type'] => {
    if (type.includes('SUCCESS') || type.includes('VERIFIED')) return 'success';
    if (type.includes('FAILED') || type.includes('ERROR') || type.includes('REJECTED')) return 'error';
    if (type.includes('WARNING') || type.includes('EXPIRING') || type.includes('OVERDUE')) return 'warning';
    return 'info';
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadNotifications(nextPage, true);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationService.markAsRead(notificationId, userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      loadNotifications(page, false);
    }
  };

  const bulkMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      const notificationIds = Array.from(selectedNotifications);
      
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (notificationIds.includes(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.filter(id => {
        const notif = notifications.find(n => n.id === id);
        return notif && !notif.read;
      }).length));
      setSelectedNotifications(new Set());

      await notificationService.bulkMarkAsRead(userId, notificationIds);
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
      loadNotifications(page, false);
    }
  };

  const bulkDelete = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      const notificationIds = Array.from(selectedNotifications);
      
      // Optimistic update
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setUnreadCount(prev => {
        const deletedUnread = notifications.filter(n => notificationIds.includes(n.id) && !n.read).length;
        return Math.max(0, prev - deletedUnread);
      });
      setSelectedNotifications(new Set());

      await notificationService.bulkDelete(userId, notificationIds);
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      loadNotifications(page, false);
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      loadNotifications(page, false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId, userId);

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

    if (minutes < 1) return t('notificationCenter.time.justNow');
    if (minutes < 60) return t('notificationCenter.time.minutesAgo', { minutes });
    if (hours < 24) return t('notificationCenter.time.hoursAgo', { hours });
    if (days < 7) return t('notificationCenter.time.daysAgo', { days });
    return timestamp.toLocaleDateString('vi-VN');
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Handle SALARY_REQUEST notification
    if ((notification as any).notificationType === 'SALARY_REQUEST' && (notification as any).notificationData) {
      const data = (notification as any).notificationData;
      const trainerId = data.trainer_id;
      if (trainerId) {
        navigate(`/management/salary-requests?trainer_id=${trainerId}&action=set_salary`);
        setIsOpen(false);
        return;
      }
    }
    
    // Handle other notifications with actionUrl
    if (notification.actionUrl) {
      // Check if it's a relative path or full URL
      if (notification.actionUrl.startsWith('http')) {
        window.location.href = notification.actionUrl;
      } else {
        navigate(notification.actionUrl);
      }
      setIsOpen(false);
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
          <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />

          {/* Dropdown Panel */}
          <div className='absolute right-0 top-full mt-2 w-96 max-h-[600px] overflow-hidden z-50'>
            <AdminCard padding='none' className='shadow-xl'>
              {/* Header */}
              <div className='p-4 border-b border-gray-200 dark:border-gray-800'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <Bell className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                    <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
                      {t('notificationCenter.title')}
                    </h3>
                    {unreadCount > 0 && (
                      <span className='px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs rounded-full font-inter'>
                        {t('notificationCenter.newCount', { count: unreadCount })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                  >
                    <X className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  </button>
                </div>

                {/* Filters */}
                <div className='grid grid-cols-2 gap-2 mb-3'>
                  <CustomSelect
                    options={[
                      { value: 'all', label: t('notificationCenter.filters.all') },
                      { value: 'read', label: t('notificationCenter.filters.read') },
                      { value: 'unread', label: t('notificationCenter.filters.unread') },
                    ]}
                    value={filterRead}
                    onChange={setFilterRead}
                    placeholder={t('notificationCenter.filters.statusPlaceholder')}
                    className='text-xs font-inter'
                  />
                  <CustomSelect
                    options={[
                      { value: 'all', label: t('notificationCenter.filters.allTypes') },
                      { value: 'PAYMENT_SUCCESS', label: t('notificationCenter.filters.payment') },
                      { value: 'CLASS_BOOKING', label: t('notificationCenter.filters.booking') },
                      { value: 'SALARY_REQUEST', label: 'Yêu cầu xét lương' },
                      { value: 'SYSTEM_ANNOUNCEMENT', label: t('notificationCenter.filters.system') },
                    ]}
                    value={filterType}
                    onChange={setFilterType}
                    placeholder={t('notificationCenter.filters.typePlaceholder')}
                    className='text-xs font-inter'
                  />
                </div>

                {/* Bulk Actions */}
                {selectedNotifications.size > 0 && (
                  <div className='flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800'>
                    <span className='text-xs text-gray-600 dark:text-gray-400 font-inter'>
                      {t('notificationCenter.selected', { count: selectedNotifications.size })}
                    </span>
                    <AdminButton
                      variant='outline'
                      size='xs'
                      onClick={bulkMarkAsRead}
                      className='text-xs'
                    >
                      {t('notificationCenter.bulkActions.markAsRead')}
                    </AdminButton>
                    <AdminButton
                      variant='outline'
                      size='xs'
                      onClick={bulkDelete}
                      className='text-xs text-red-600 dark:text-red-400'
                    >
                      <Trash2 className='w-3 h-3 mr-1' />
                      {t('common.delete')}
                    </AdminButton>
                    <button
                      onClick={() => setSelectedNotifications(new Set())}
                      className='text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-inter'
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}

                {/* Quick Actions */}
                {selectedNotifications.size === 0 && (
                  <div className='flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800'>
                    {unreadCount > 0 && (
                      <AdminButton variant='outline' size='xs' onClick={markAllAsRead} className='text-xs'>
                        {t('notificationCenter.quickActions.markAllAsRead')}
                      </AdminButton>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications List */}
              <div className='max-h-[500px] overflow-y-auto'>
                {isLoading ? (
                  <div className='p-8 text-center text-gray-500 dark:text-gray-400 font-inter'>
                    {t('common.loading')}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className='p-8 text-center text-gray-500 dark:text-gray-400 font-inter'>
                    <Bell className='w-12 h-12 mx-auto mb-2 opacity-50' />
                    <p>{t('notificationCenter.empty')}</p>
                  </div>
                ) : (
                  <div className='divide-y divide-gray-200 dark:divide-gray-800'>
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          !notification.read ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                        } ${selectedNotifications.has(notification.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        <div className='flex items-start gap-3'>
                          {/* Selection Checkbox */}
                          <input
                            type='checkbox'
                            checked={selectedNotifications.has(notification.id)}
                            onChange={() => toggleSelection(notification.id)}
                            onClick={e => e.stopPropagation()}
                            className='mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500'
                          />
                          <div
                            className='flex-1 min-w-0 cursor-pointer'
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className='flex items-start gap-2'>
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
                  
                  {/* Load More */}
                  {hasMore && (
                    <div className='p-4 text-center border-t border-gray-200 dark:border-gray-800'>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        onClick={loadMore}
                        disabled={isLoading}
                        className='text-xs font-inter'
                      >
                        {isLoading ? t('common.loading') : t('notificationCenter.loadMore')}
                      </AdminButton>
                    </div>
                  )}
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
                    {t('notificationCenter.viewAll')}
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
