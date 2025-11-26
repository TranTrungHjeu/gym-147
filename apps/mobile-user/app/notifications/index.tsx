import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/member/notification.service';
import type {
  Notification,
  NotificationStatus,
  NotificationType,
} from '@/types/notificationTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Check,
  MoreVertical,
  Search,
  Trash2,
  Dumbbell,
  Clock,
  CreditCard,
  Calendar,
  Trophy,
  Wrench,
  PartyPopper,
  Settings,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Notification[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType | 'ALL'>(
    'ALL'
  );
  const [selectedStatus, setSelectedStatus] = useState<
    NotificationStatus | 'ALL'
  >('ALL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const typeOptions = [
    { label: t('notifications.all'), value: 'ALL' },
    { label: t('notifications.types.workout'), value: 'WORKOUT_REMINDER' },
    { label: 'Membership Expiry', value: 'MEMBERSHIP_EXPIRY' },
    { label: t('notifications.types.payment'), value: 'PAYMENT_DUE' },
    { label: t('notifications.types.class'), value: 'CLASS_BOOKING' },
    { label: t('notifications.types.achievement'), value: 'ACHIEVEMENT' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Promotion', value: 'PROMOTION' },
    { label: t('notifications.types.system'), value: 'SYSTEM' },
  ];

  const statusOptions = [
    { label: t('notifications.all'), value: 'ALL' },
    { label: t('notifications.unread'), value: 'UNREAD' },
    { label: t('notifications.read'), value: 'READ' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        notificationService.getMemberNotifications(user.id, { limit: 100 }),
        notificationService.getUnreadCount(user.id),
      ]);

      setNotifications(notificationsData);
      setFilteredNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert(t('common.error'), t('notifications.failedToLoad'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterNotifications(query, selectedType, selectedStatus);
  };

  const handleTypeFilter = (type: NotificationType | 'ALL') => {
    setSelectedType(type);
    filterNotifications(searchQuery, type, selectedStatus);
  };

  const handleStatusFilter = (status: NotificationStatus | 'ALL') => {
    setSelectedStatus(status);
    filterNotifications(searchQuery, selectedType, status);
  };

  const filterNotifications = (
    query: string,
    type: NotificationType | 'ALL',
    status: NotificationStatus | 'ALL'
  ) => {
    let filtered = notifications;

    if (query) {
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query.toLowerCase()) ||
          notification.message.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (type !== 'ALL') {
      filtered = filtered.filter((notification) => notification.type === type);
    }

    if (status !== 'ALL') {
      filtered = filtered.filter(
        (notification) => notification.status === status
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (notification.status === 'UNREAD') {
      try {
        await notificationService.markAsRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        loadData();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    router.push(`/notifications/${notification.id}`);
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      loadData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert(t('common.error'), t('notifications.failedToMarkAsRead'));
    }
  };

  const handleDelete = async (notification: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notification.id);
              if (notification.status === 'UNREAD') {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
              loadData();
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert(t('common.error'), t('notifications.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setUnreadCount(0);
      loadData();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert(t('common.error'), t('notifications.failedToMarkAllAsRead'));
    }
  };

  const handleDeleteAllRead = async () => {
    if (!user?.id) return;

    Alert.alert(
      t('notifications.deleteAll'),
      t('notifications.confirmDeleteAll'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.deleteAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteAllRead(user.id);
              loadData();
            } catch (error) {
              console.error('Error deleting all read notifications:', error);
              Alert.alert(
                t('common.error'),
                t('notifications.failedToDeleteAll')
              );
            }
          },
        },
      ]
    );
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleBulkMarkAsRead = async () => {
    if (!user?.id || selectedNotifications.length === 0) return;

    try {
      await notificationService.bulkMarkAsRead(user.id, selectedNotifications);
      setUnreadCount((prev) =>
        Math.max(0, prev - selectedNotifications.length)
      );
      setSelectedNotifications([]);
      setIsSelectionMode(false);
      loadData();
    } catch (error) {
      console.error('Error bulk marking as read:', error);
      Alert.alert(
        t('common.error'),
        t('notifications.failedToMarkSelectedAsRead')
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.id || selectedNotifications.length === 0) return;

    Alert.alert(
      t('notifications.deleteSelected'),
      t('notifications.confirmDeleteSelected', {
        count: selectedNotifications.length,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.bulkDelete(
                user.id,
                selectedNotifications
              );
              setSelectedNotifications([]);
              setIsSelectionMode(false);
              loadData();
            } catch (error) {
              console.error('Error bulk deleting:', error);
              Alert.alert(
                t('common.error'),
                t('notifications.failedToDeleteSelected')
              );
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconSize = 24;
    const iconColor = theme.colors.primary;
    switch (type) {
      case 'WORKOUT_REMINDER':
        return <Dumbbell size={iconSize} color={iconColor} />;
      case 'MEMBERSHIP_EXPIRY':
        return <Clock size={iconSize} color={iconColor} />;
      case 'PAYMENT_DUE':
        return <CreditCard size={iconSize} color={iconColor} />;
      case 'CLASS_BOOKING':
        return <Calendar size={iconSize} color={iconColor} />;
      case 'ACHIEVEMENT':
        return <Trophy size={iconSize} color={iconColor} />;
      case 'MAINTENANCE':
        return <Wrench size={iconSize} color={iconColor} />;
      case 'PROMOTION':
        return <PartyPopper size={iconSize} color={iconColor} />;
      case 'SYSTEM':
        return <Settings size={iconSize} color={iconColor} />;
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return theme.colors.error;
      case 'HIGH':
        return theme.colors.warning;
      case 'MEDIUM':
        return theme.colors.info;
      case 'LOW':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString(i18n.language);
    }
  };

  useEffect(() => {
    loadData();
    setLoading(false);
  }, [user?.id]);

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('notifications.loadingNotifications')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: theme.colors.text, flex: 1 }]}>
            {t('notifications.title')}
          </Text>
          {unreadCount > 0 && (
            <View
              style={[styles.badge, { backgroundColor: theme.colors.error }]}
            >
              <Text
                style={[Typography.caption, { color: theme.colors.surface }]}
              >
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={() => setIsSelectionMode(!isSelectionMode)}
          >
            <MoreVertical size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={() => router.push('/settings/notifications')}
          >
            <Bell size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: theme.colors.text }]}
            placeholder={t('notifications.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Picker
            selectedValue={selectedType}
            onValueChange={handleTypeFilter}
            items={typeOptions}
          />
        </View>
        <View style={styles.filterGroup}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={handleStatusFilter}
            items={statusOptions}
          />
        </View>
      </View>

      {isSelectionMode && selectedNotifications.length > 0 && (
        <View
          style={[
            styles.bulkActions,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[Typography.body, { color: theme.colors.text }]}>
            {t('notifications.selectedCount', {
              count: selectedNotifications.length,
            })}
          </Text>
          <View style={styles.bulkButtons}>
            <Button
              title={t('notifications.markAsRead')}
              onPress={handleBulkMarkAsRead}
              size="small"
              variant="outline"
            />
            <Button
              title={t('notifications.delete')}
              onPress={handleBulkDelete}
              size="small"
              variant="outline"
            />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    notification.status === 'UNREAD'
                      ? theme.colors.primary
                      : theme.colors.border,
                  borderLeftWidth: notification.status === 'UNREAD' ? 4 : 0,
                },
              ]}
              onPress={() =>
                isSelectionMode
                  ? toggleSelection(notification.id)
                  : handleNotificationPress(notification)
              }
              onLongPress={() => {
                setIsSelectionMode(true);
                toggleSelection(notification.id);
              }}
            >
              {isSelectionMode && (
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => toggleSelection(notification.id)}
                >
                  {selectedNotifications.includes(notification.id) && (
                    <Check size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={[Typography.h4, { color: theme.colors.text }]}>
                      {notification.title}
                    </Text>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.notificationActions}>
                    <View
                      style={[
                        styles.priorityDot,
                        {
                          backgroundColor: getPriorityColor(
                            notification.priority
                          ),
                        },
                      ]}
                    />
                    {notification.status === 'UNREAD' && (
                      <View
                        style={[
                          styles.unreadDot,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      />
                    )}
                  </View>
                </View>

                <Text
                  style={[
                    Typography.body,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {notification.message}
                </Text>

                {!isSelectionMode && (
                  <View style={styles.notificationActions}>
                    {notification.status === 'UNREAD' && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { borderColor: theme.colors.border },
                        ]}
                        onPress={() => handleMarkAsRead(notification)}
                      >
                        <Check size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { borderColor: theme.colors.border },
                      ]}
                      onPress={() => handleDelete(notification)}
                    >
                      <Trash2 size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Bell size={48} color={theme.colors.textSecondary} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              {t('notifications.noNotifications')}
            </Text>
            <Text
              style={[Typography.body, { color: theme.colors.textSecondary }]}
            >
              {notifications.length === 0
                ? t('notifications.noNotifications')
                : t('notifications.noNotifications')}
            </Text>
          </View>
        )}
      </ScrollView>

      {notifications.length > 0 && (
        <View
          style={[
            styles.footerActions,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Button
            title={t('notifications.markAllAsRead')}
            onPress={handleMarkAllAsRead}
            variant="outline"
            size="small"
          />
          <Button
            title={t('notifications.deleteAll')}
            onPress={handleDeleteAllRead}
            variant="outline"
            size="small"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  searchText: {
    flex: 1,
    ...Typography.body,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  filterGroup: {
    flex: 1,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  notificationCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});
