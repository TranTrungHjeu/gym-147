import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminCard from '../components/common/AdminCard';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CustomSelect from '../components/common/CustomSelect';
import { TableLoading } from '../components/ui/AppLoading';
import { useToast } from '../hooks/useToast';
import useTranslation from '../hooks/useTranslation';
import { Notification, notificationService } from '../services/notification.service';
import { getCurrentUser } from '../utils/auth';

type NotificationType =
  | 'ALL'
  | 'WORKOUT_REMINDER'
  | 'MEMBERSHIP_EXPIRY'
  | 'PAYMENT_DUE'
  | 'CLASS_BOOKING'
  | 'ACHIEVEMENT'
  | 'MAINTENANCE'
  | 'PROMOTION'
  | 'SYSTEM';

type NotificationStatus = 'ALL' | 'UNREAD' | 'READ';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<NotificationStatus>('ALL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const user = getCurrentUser();

  const typeOptions = [
    { value: 'ALL', label: t('notifications.filters.allTypes') },
    { value: 'WORKOUT_REMINDER', label: t('notifications.filters.workoutReminder') },
    { value: 'MEMBERSHIP_EXPIRY', label: t('notifications.filters.membershipExpiry') },
    { value: 'PAYMENT_DUE', label: t('notifications.filters.paymentDue') },
    { value: 'CLASS_BOOKING', label: t('notifications.filters.classBooking') },
    { value: 'ACHIEVEMENT', label: t('notifications.filters.achievement') },
    { value: 'MAINTENANCE', label: t('notifications.filters.maintenance') },
    { value: 'PROMOTION', label: t('notifications.filters.promotion') },
    { value: 'SYSTEM', label: t('notifications.filters.system') },
  ];

  const statusOptions = [
    { value: 'ALL', label: t('notifications.filters.allStatuses') },
    { value: 'UNREAD', label: t('notifications.filters.unread') },
    { value: 'READ', label: t('notifications.filters.read') },
  ];

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    if (!user?.id) return;

    try {
      setLoading(!append);
      setRefreshing(append);

      const params: any = {
        page: pageNum,
        limit: 20,
      };

      if (selectedStatus !== 'ALL') {
        params.unreadOnly = selectedStatus === 'UNREAD';
      }

      if (selectedType !== 'ALL') {
        params.type = selectedType;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        notificationService.getUserNotifications(user.id, params),
        notificationService.getUnreadCount(user.id),
      ]);

      if (notificationsResponse.success) {
        const notificationsData = notificationsResponse.data?.notifications || [];
        const pagination = notificationsResponse.data?.pagination;

        if (append) {
          setNotifications(prev => [...prev, ...notificationsData]);
          setFilteredNotifications(prev => [...prev, ...notificationsData]);
        } else {
          setNotifications(notificationsData);
          setFilteredNotifications(notificationsData);
        }

        if (pagination) {
          setTotalPages(pagination.pages);
          setHasMore(pageNum < pagination.pages);
        }
      }

      if (unreadCountResponse.success) {
        setUnreadCount(unreadCountResponse.data.unreadCount || 0);
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      showToast(error.message || t('notifications.messages.loadError'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, true);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData(1, false);
  }, [user?.id, selectedType, selectedStatus, searchQuery]);

  const handleRefresh = async () => {
    setPage(1);
    await loadData(1, false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterNotifications(query, selectedType, selectedStatus);
  };

  const handleTypeFilter = (type: NotificationType) => {
    setSelectedType(type);
    filterNotifications(searchQuery, type, selectedStatus);
  };

  const handleStatusFilter = (status: NotificationStatus) => {
    setSelectedStatus(status);
    filterNotifications(searchQuery, selectedType, status);
  };

  const filterNotifications = (
    query: string,
    type: NotificationType,
    status: NotificationStatus
  ) => {
    // Filtering is now done server-side via API params
    // This function is kept for client-side filtering if needed
    let filtered = notifications;

    if (query) {
      filtered = filtered.filter(
        notification =>
          notification.title.toLowerCase().includes(query.toLowerCase()) ||
          notification.message.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (type !== 'ALL') {
      filtered = filtered.filter(notification => notification.type === type);
    }

    if (status !== 'ALL') {
      filtered = filtered.filter(notification => {
        if (status === 'UNREAD') return !notification.is_read;
        if (status === 'READ') return notification.is_read;
        return true;
      });
    }

    setFilteredNotifications(filtered);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        filterNotifications(searchQuery, selectedType, selectedStatus);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        showToast(t('notifications.messages.markAsReadError'), 'error');
      }
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      filterNotifications(searchQuery, selectedType, selectedStatus);
      showToast(t('notifications.messages.markAsReadSuccess'), 'success');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast(t('notifications.messages.markAsReadError'), 'error');
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      await notificationService.deleteNotification(notification.id);
      if (!notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      filterNotifications(searchQuery, selectedType, selectedStatus);
      showToast(t('notifications.messages.deleteSuccess'), 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast(t('notifications.messages.deleteError'), 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      filterNotifications(searchQuery, selectedType, selectedStatus);
      showToast(t('notifications.messages.markAllAsReadSuccess'), 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast(t('notifications.messages.markAllAsReadError'), 'error');
    }
  };

  const handleDeleteAllRead = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      await notificationService.deleteAllRead(user.id);
      await loadData();
      showToast(t('notifications.messages.deleteAllReadSuccess'), 'success');
      setIsDeleteAllDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting all read notifications:', error);
      showToast(error.message || t('notifications.messages.deleteAllReadError'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleBulkMarkAsRead = async () => {
    if (!user?.id || selectedNotifications.length === 0) return;

    try {
      // Optimistic update
      const unreadCountBefore = notifications.filter(
        n => selectedNotifications.includes(n.id) && !n.is_read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - unreadCountBefore));
      setNotifications(prev =>
        prev.map(n => (selectedNotifications.includes(n.id) ? { ...n, is_read: true } : n))
      );
      setFilteredNotifications(prev =>
        prev.map(n => (selectedNotifications.includes(n.id) ? { ...n, is_read: true } : n))
      );

      const notificationIds = [...selectedNotifications];
      setSelectedNotifications([]);
      setIsSelectionMode(false);

      const response = await notificationService.bulkMarkAsRead(user.id, notificationIds);

      if (response.success) {
        showToast(
          t('notifications.messages.bulkMarkAsReadSuccess', {
            count: response.data?.updated_count || notificationIds.length,
          }),
          'success'
        );
      } else {
        // Revert on error
        await loadData(page, false);
        showToast(t('notifications.messages.bulkMarkAsReadError'), 'error');
      }
    } catch (error: any) {
      console.error('Error bulk marking as read:', error);
      // Revert on error
      await loadData(page, false);
      showToast(error.message || t('notifications.messages.bulkMarkAsReadError'), 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.id || selectedNotifications.length === 0) return;

    try {
      // Optimistic update
      const unreadCountBefore = notifications.filter(
        n => selectedNotifications.includes(n.id) && !n.is_read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - unreadCountBefore));
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setFilteredNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));

      const notificationIds = [...selectedNotifications];
      setSelectedNotifications([]);
      setIsSelectionMode(false);

      const response = await notificationService.bulkDelete(user.id, notificationIds);

      if (response.success) {
        showToast(
          t('notifications.messages.bulkDeleteSuccess', {
            count: response.data?.deleted_count || notificationIds.length,
          }),
          'success'
        );
      } else {
        // Revert on error
        await loadData(page, false);
        showToast(t('notifications.messages.bulkDeleteError'), 'error');
      }
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      // Revert on error
      await loadData(page, false);
      showToast(error.message || t('notifications.messages.bulkDeleteError'), 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return t('common.justNow');
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h trước`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  if (loading) {
    return <TableLoading />;
  }

  return (
    <>
      {/* Header */}
      <div className='p-6 pb-0'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
              {t('notifications.title')}
            </h1>
            <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
              {t('notifications.subtitle')}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className='p-2 rounded-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              title={t('notifications.actions.refresh')}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <motion.button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`p-2 rounded-sm border ${
                isSelectionMode
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title={t('notifications.actions.selectionMode')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <motion.div
                animate={{ rotate: isSelectionMode ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <MoreVertical size={18} />
              </motion.div>
            </motion.button>
            <button
              className='p-2 rounded-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all'
              title={t('notifications.actions.settings')}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='px-6'>
        <div className='bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
            {/* Search Input */}
            <div className='md:col-span-2 group relative'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
              <input
                type='text'
                placeholder={t('notifications.searchPlaceholder')}
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              />
            </div>

            {/* Type Filter */}
            <div>
              <CustomSelect
                options={typeOptions}
                value={selectedType}
                onChange={value => handleTypeFilter(value as NotificationType)}
                placeholder={t('notifications.filters.allTypes')}
                className='font-inter'
              />
            </div>

            {/* Status Filter */}
            <div>
              <CustomSelect
                options={statusOptions}
                value={selectedStatus}
                onChange={value => handleStatusFilter(value as NotificationStatus)}
                placeholder={t('notifications.filters.allStatuses')}
                className='font-inter'
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {isSelectionMode && selectedNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className='px-6 mt-3'
          >
            <AdminCard
              padding='sm'
              className='bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 !rounded-sm'
            >
              <div className='flex items-center justify-between'>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className='text-sm font-medium text-gray-900 dark:text-white font-inter'
                >
                  {t('notifications.bulkActions.selectedCount', {
                    count: selectedNotifications.length,
                  })}
                </motion.span>
                <div className='flex gap-2'>
                  <motion.button
                    onClick={handleBulkMarkAsRead}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className='px-4 py-1.5 rounded-sm border border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all text-xs font-medium font-inter'
                  >
                    Đánh dấu đã đọc
                  </motion.button>
                  <motion.button
                    onClick={handleBulkDelete}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className='px-4 py-1.5 rounded-sm border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-xs font-medium font-inter'
                  >
                    Xóa
                  </motion.button>
                </div>
              </div>
            </AdminCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className='px-6 pb-6'>
        {loading ? (
          <TableLoading />
        ) : filteredNotifications.length > 0 ? (
          <div className='space-y-3 mt-3'>
            {filteredNotifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={false}
                animate={{
                  scale: 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
              >
                <AdminCard
                  padding='md'
                  hover
                  className={`cursor-pointer transition-all !rounded-sm ${
                    !notification.is_read
                      ? 'border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                      : ''
                  }`}
                  onClick={() =>
                    isSelectionMode
                      ? toggleSelection(notification.id)
                      : handleNotificationClick(notification)
                  }
                >
                  <div className='flex items-start gap-4'>
                    {/* Checkbox - Always rendered to prevent layout shift */}
                    <motion.div
                      className='mt-1 flex-shrink-0'
                      initial={false}
                      animate={{
                        opacity: isSelectionMode ? 1 : 0,
                        width: isSelectionMode ? 'auto' : 0,
                        marginRight: isSelectionMode ? 0 : 0,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                        delay: filteredNotifications.indexOf(notification) * 0.02,
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <motion.div
                        className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center cursor-pointer ${
                          selectedNotifications.includes(notification.id)
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        onClick={e => {
                          e.stopPropagation();
                          toggleSelection(notification.id);
                        }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        <AnimatePresence mode='wait'>
                          {selectedNotifications.includes(notification.id) && (
                            <motion.div
                              key='checked'
                              initial={{ scale: 0, rotate: -180, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              exit={{ scale: 0, rotate: 180, opacity: 0 }}
                              transition={{
                                type: 'spring',
                                stiffness: 600,
                                damping: 20,
                              }}
                            >
                              <Check size={14} className='text-white' />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2 mb-1.5'>
                        <h3 className='font-semibold text-sm font-heading text-gray-900 dark:text-white leading-tight'>
                          {notification.title}
                        </h3>
                        <div className='flex items-center gap-2 flex-shrink-0'>
                          {!notification.is_read && (
                            <motion.div
                              initial={false}
                              animate={{
                                opacity: !isSelectionMode ? 1 : 0,
                                scale: !isSelectionMode ? 1 : 0,
                              }}
                              transition={{ duration: 0.2 }}
                              className='w-2 h-2 rounded-full bg-orange-500 flex-shrink-0'
                            />
                          )}
                          {/* Action buttons - Always rendered to prevent layout shift */}
                          <motion.div
                            className='flex items-center gap-1'
                            initial={false}
                            animate={{
                              opacity: !isSelectionMode ? 1 : 0,
                              width: !isSelectionMode ? 'auto' : 0,
                              pointerEvents: !isSelectionMode ? 'auto' : 'none',
                            }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            {!notification.is_read && (
                              <motion.button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className='p-1.5 rounded-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all'
                                title={t('notifications.actions.markAsRead')}
                              >
                                <Check size={14} />
                              </motion.button>
                            )}
                            <motion.button
                              onClick={e => {
                                e.stopPropagation();
                                handleDelete(notification);
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className='p-1.5 rounded-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all'
                              title={t('notifications.actions.delete')}
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </motion.div>
                        </div>
                      </div>

                      <p className='mb-1.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300 font-inter leading-relaxed'>
                        {notification.message}
                      </p>

                      <div className='flex items-center gap-2'>
                        <span className='text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
                          {formatDate(notification.created_at)}
                        </span>
                        <span className='text-[10px] text-gray-400 dark:text-gray-500'>•</span>
                        <span className='text-[10px] text-gray-500 dark:text-gray-400 font-inter capitalize'>
                          {notification.type?.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <AdminCard padding='lg' className='text-center mt-3 !rounded-sm'>
            <Bell size={48} className='mx-auto mb-4 text-gray-400 dark:text-gray-500' />
            <h3 className='text-lg font-semibold mb-2 font-heading text-gray-900 dark:text-white'>
              {t('notifications.noNotifications')}
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
              {notifications.length === 0
                ? t('notifications.empty.noNotifications')
                : t('notifications.empty.noFilterMatch')}
            </p>
          </AdminCard>
        )}
      </div>

      {/* Load More */}
      {hasMore && filteredNotifications.length > 0 && (
        <div className='px-6 pb-4'>
          <button
            onClick={loadMore}
            disabled={loading || refreshing}
            className='w-full py-2 px-4 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter'
          >
            {loading || refreshing
              ? t('notifications.loadMore.loading')
              : t('notifications.loadMore.loadMore', { page, totalPages })}
          </button>
        </div>
      )}

      {/* Footer Actions */}
      {notifications.length > 0 && (
        <div className='px-6 pb-6'>
          <AdminCard padding='sm' className='!rounded-sm'>
            <div className='flex items-center justify-center gap-3'>
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className='px-4 py-2 rounded-sm border border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex items-center gap-2 text-xs font-medium font-inter disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <CheckCheck size={16} />
                Đánh dấu tất cả đã đọc
              </button>
              <button
                onClick={() => setIsDeleteAllDialogOpen(true)}
                className='px-4 py-2 rounded-sm border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 text-xs font-medium font-inter'
              >
                <Trash2 size={16} />
                Xóa tất cả đã đọc
              </button>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Delete All Read Dialog */}
      <ConfirmDialog
        isOpen={isDeleteAllDialogOpen}
        onClose={() => setIsDeleteAllDialogOpen(false)}
        onConfirm={handleDeleteAllRead}
        title={t('notifications.dialogs.deleteAllRead.title')}
        message={t('notifications.dialogs.deleteAllRead.message')}
        confirmText={t('notifications.dialogs.deleteAllRead.confirm')}
        cancelText={t('notifications.dialogs.deleteAllRead.cancel')}
        isLoading={isDeleting}
        variant='danger'
      />
    </>
  );
}
