import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { notificationService } from '@/services/member/notification.service';
import type {
  Notification,
  NotificationStatus,
  NotificationType,
} from '@/types/notificationTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { AppEvents } from '@/utils/eventEmitter';
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
  Filter,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NotificationAnimation {
  opacity: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
}

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { unreadCount: contextUnreadCount, refreshCount } = useNotifications();
  const styles = createStyles(theme);
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
  const [showFilters, setShowFilters] = useState(false);

  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const notificationAnimations = useRef<Map<string, NotificationAnimation>>(
    new Map()
  ).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  // Refs to store current filter values for use in event handlers
  const searchQueryRef = useRef(searchQuery);
  const selectedTypeRef = useRef(selectedType);
  const selectedStatusRef = useRef(selectedStatus);

  // Keep refs in sync with state
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);

  useEffect(() => {
    selectedStatusRef.current = selectedStatus;
  }, [selectedStatus]);

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

  // Initialize animations for notifications
  const initializeNotificationAnimation = useCallback(
    (notificationId: string): NotificationAnimation => {
      if (!notificationAnimations.has(notificationId)) {
        notificationAnimations.set(notificationId, {
          opacity: new Animated.Value(0),
          translateY: new Animated.Value(30),
          scale: new Animated.Value(0.95),
        });
      }
      return notificationAnimations.get(notificationId)!;
    },
    [notificationAnimations]
  );

  // Animate notification entry
  const animateNotificationEntry = useCallback(
    (notificationId: string, index: number) => {
      const anim = initializeNotificationAnimation(notificationId);
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [initializeNotificationAnimation]
  );

  // Animate notification removal
  const animateNotificationRemoval = useCallback(
    (notificationId: string, callback: () => void) => {
      const anim = notificationAnimations.get(notificationId);
      if (!anim) {
        callback();
        return;
      }

      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: -20,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim.scale, {
          toValue: 0.9,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        notificationAnimations.delete(notificationId);
        callback();
      });
    },
    [notificationAnimations]
  );

  // Map API response (snake_case) to Notification interface (camelCase)
  const mapNotificationFromAPI = (apiNotification: any): Notification => {
    return {
      id: apiNotification.id,
      type: apiNotification.type || 'GENERAL',
      title: apiNotification.title || '',
      message: apiNotification.message || '',
      status:
        apiNotification.is_read === false || apiNotification.is_read === 0
          ? 'UNREAD'
          : apiNotification.is_read === true || apiNotification.is_read === 1
          ? 'READ'
          : (apiNotification.status as NotificationStatus) || 'UNREAD',
      priority: apiNotification.priority || 'NORMAL',
      createdAt:
        apiNotification.created_at ||
        apiNotification.createdAt ||
        new Date().toISOString(),
      readAt: apiNotification.read_at || apiNotification.readAt || null,
      metadata: apiNotification.data || apiNotification.metadata || {},
      userId: apiNotification.user_id || apiNotification.userId,
      memberId: apiNotification.member_id || apiNotification.memberId,
    };
  };

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        notificationService.getMemberNotifications(user.id, { limit: 100 }),
        notificationService.getUnreadCount(user.id),
      ]);

      console.log('[NOTIFICATIONS] Loaded notifications data:', {
        count: notificationsData?.length || 0,
        firstNotification: notificationsData?.[0]
          ? {
              id: notificationsData[0].id,
              title: notificationsData[0].title,
              createdAt: notificationsData[0].createdAt,
              created_at: (notificationsData[0] as any).created_at,
              date: (notificationsData[0] as any).date,
              allKeys: Object.keys(notificationsData[0] || {}),
            }
          : null,
        sampleNotification: notificationsData?.[0],
      });

      // Map API response to Notification interface
      const mappedNotifications = (notificationsData || []).map(
        mapNotificationFromAPI
      );

      console.log('[NOTIFICATIONS] Mapped notifications:', {
        count: mappedNotifications.length,
        firstMapped: mappedNotifications[0],
      });

      setNotifications(mappedNotifications);
      setUnreadCount(unreadCountData);

      // Animate list entry
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Animate each notification
      notificationsData.forEach((notification, index) => {
        animateNotificationEntry(notification.id, index);
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert(t('common.error'), t('notifications.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterNotifications(query, selectedType, selectedStatus, notifications);
  };

  const handleTypeFilter = (type: NotificationType | 'ALL') => {
    setSelectedType(type);
    filterNotifications(searchQuery, type, selectedStatus, notifications);
  };

  const handleStatusFilter = (status: NotificationStatus | 'ALL') => {
    setSelectedStatus(status);
    filterNotifications(searchQuery, selectedType, status, notifications);
  };

  const filterNotifications = useCallback(
    (
      query: string,
      type: NotificationType | 'ALL',
      status: NotificationStatus | 'ALL',
      notificationsList: Notification[]
    ) => {
      console.log('[NOTIFICATIONS] filterNotifications called:', {
        inputCount: notificationsList.length,
        query,
        type,
        status,
        firstNotificationId: notificationsList[0]?.id,
      });

      let filtered = notificationsList;

      if (query) {
        const beforeSearchCount = filtered.length;
        filtered = filtered.filter(
          (notification) =>
            notification.title.toLowerCase().includes(query.toLowerCase()) ||
            notification.message.toLowerCase().includes(query.toLowerCase())
        );
        console.log(
          `[NOTIFICATIONS] After search filter: ${beforeSearchCount} -> ${filtered.length}`
        );
      }

      if (type !== 'ALL') {
        const beforeTypeCount = filtered.length;
        filtered = filtered.filter(
          (notification) => notification.type === type
        );
        console.log(
          `[NOTIFICATIONS] After type filter: ${beforeTypeCount} -> ${filtered.length}`
        );
      }

      if (status !== 'ALL') {
        const beforeStatusCount = filtered.length;
        filtered = filtered.filter(
          (notification) => notification.status === status
        );
        console.log(
          `[NOTIFICATIONS] After status filter: ${beforeStatusCount} -> ${filtered.length}`
        );
      }

      console.log('[NOTIFICATIONS] filterNotifications result:', {
        outputCount: filtered.length,
        filteredIds: filtered.map((n) => n.id).slice(0, 5),
      });

      setFilteredNotifications(filtered);
    },
    []
  );

  const handleNotificationPress = async (notification: Notification) => {
    if (notification.status === 'UNREAD') {
      try {
        await notificationService.markAsRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, status: 'READ' as NotificationStatus }
              : n
          )
        );
        // Refresh context to update badge in other screens
        await refreshCount();
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
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, status: 'READ' as NotificationStatus }
            : n
        )
      );
      // Refresh context to update badge in other screens
      await refreshCount();
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
            animateNotificationRemoval(notification.id, async () => {
              try {
                await notificationService.deleteNotification(notification.id);
                if (notification.status === 'UNREAD') {
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                }
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                );
                // Refresh context to update badge in other screens
                await refreshCount();
              } catch (error) {
                console.error('Error deleting notification:', error);
                Alert.alert(
                  t('common.error'),
                  t('notifications.failedToDelete')
                );
              }
            });
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
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ' as NotificationStatus }))
      );
      // Refresh context to update badge in other screens
      await refreshCount();
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
              const readNotifications = notifications.filter(
                (n) => n.status === 'READ'
              );
              await Promise.all(
                readNotifications.map((n) =>
                  notificationService.deleteNotification(n.id)
                )
              );
              setNotifications((prev) =>
                prev.filter((n) => n.status !== 'READ')
              );
              // Refresh context to update badge in other screens
              await refreshCount();
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
      setNotifications((prev) =>
        prev.map((n) =>
          selectedNotifications.includes(n.id)
            ? { ...n, status: 'READ' as NotificationStatus }
            : n
        )
      );
      setSelectedNotifications([]);
      setIsSelectionMode(false);
      // Refresh context to update badge in other screens
      await refreshCount();
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
              const idsToDelete = new Set(selectedNotifications);
              // Count how many unread notifications are being deleted
              const unreadDeletedCount = notifications.filter(
                (n) => idsToDelete.has(n.id) && n.status === 'UNREAD'
              ).length;

              setNotifications((prev) =>
                prev.filter((n) => !idsToDelete.has(n.id))
              );

              // Update unread count if any unread notifications were deleted
              if (unreadDeletedCount > 0) {
                setUnreadCount((prev) =>
                  Math.max(0, prev - unreadDeletedCount)
                );
              }

              setSelectedNotifications([]);
              setIsSelectionMode(false);
              // Refresh context to update badge in other screens
              await refreshCount();
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

  const getNotificationIcon = (type: string) => {
    const iconSize = 22;
    const iconColor = '#FFFFFF';
    switch (type) {
      case 'WORKOUT_REMINDER':
        return <Dumbbell size={iconSize} color={iconColor} />;
      case 'MEMBERSHIP_EXPIRY':
      case 'MEMBERSHIP_EXPIRING':
      case 'MEMBERSHIP_EXPIRED':
        return <Clock size={iconSize} color={iconColor} />;
      case 'PAYMENT_DUE':
      case 'PAYMENT_REMINDER':
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
        return <CreditCard size={iconSize} color={iconColor} />;
      case 'CLASS_BOOKING':
      case 'CLASS_REMINDER':
      case 'CLASS_CANCELLED':
      case 'BOOKING_REMINDER': // IMPROVEMENT: Booking reminder
        return <Calendar size={iconSize} color={iconColor} />;
      case 'AUTO_CANCEL_WARNING': // IMPROVEMENT: Auto-cancel warning
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'CHECKOUT_REMINDER': // IMPROVEMENT: Checkout reminder
        return <CheckCircle2 size={iconSize} color={iconColor} />;
      case 'WAITLIST_PROMOTE': // IMPROVEMENT: Waitlist promotion
      case 'WAITLIST_PROMOTED':
        return <PartyPopper size={iconSize} color={iconColor} />;
      case 'EQUIPMENT_AUTO_STOP_WARNING': // IMPROVEMENT: Equipment auto-stop warning
        return <Wrench size={iconSize} color={iconColor} />;
      case 'ACHIEVEMENT':
      case 'ACHIEVEMENT_UNLOCKED':
        return <Trophy size={iconSize} color={iconColor} />;
      case 'MAINTENANCE':
      case 'EQUIPMENT_MAINTENANCE_SCHEDULED':
      case 'EQUIPMENT_MAINTENANCE_COMPLETED':
        return <Wrench size={iconSize} color={iconColor} />;
      case 'PROMOTION':
        return <PartyPopper size={iconSize} color={iconColor} />;
      case 'SYSTEM':
      case 'SYSTEM_ANNOUNCEMENT':
      case 'GENERAL':
        return <Settings size={iconSize} color={iconColor} />;
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getNotificationGradient = (type: string): [string, string] => {
    const primaryOrange = theme.colors.primary;
    const primaryOrangeLight = theme.isDark ? '#ff9a5c' : '#ff8533';

    switch (type) {
      case 'WORKOUT_REMINDER':
        return [primaryOrange, primaryOrangeLight];
      case 'MEMBERSHIP_EXPIRY':
      case 'MEMBERSHIP_EXPIRING':
      case 'MEMBERSHIP_EXPIRED':
        return ['#FF9800', '#FFB74D'];
      case 'PAYMENT_DUE':
      case 'PAYMENT_REMINDER':
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
        return ['#2196F3', '#64B5F6'];
      case 'CLASS_BOOKING':
      case 'CLASS_REMINDER':
      case 'CLASS_CANCELLED':
        return ['#4CAF50', '#81C784'];
      case 'ACHIEVEMENT':
      case 'ACHIEVEMENT_UNLOCKED':
        return ['#FFC107', '#FFD54F'];
      case 'MAINTENANCE':
      case 'EQUIPMENT_MAINTENANCE_SCHEDULED':
      case 'EQUIPMENT_MAINTENANCE_COMPLETED':
        return ['#607D8B', '#90A4AE'];
      case 'PROMOTION':
        return [primaryOrange, '#FF8A65'];
      case 'SYSTEM':
      case 'SYSTEM_ANNOUNCEMENT':
      case 'GENERAL':
        return ['#9E9E9E', '#BDBDBD'];
      default:
        return [primaryOrange, primaryOrangeLight];
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

  const formatDate = (dateString: string | null | undefined) => {
    console.log('[NOTIFICATIONS] formatDate called with:', {
      dateString,
      type: typeof dateString,
      isNull: dateString === null,
      isUndefined: dateString === undefined,
    });

    if (!dateString) {
      console.log('[NOTIFICATIONS] dateString is empty, returning "Just now"');
      return t('notifications.justNow', { defaultValue: 'Just now' });
    }

    try {
      console.log('[NOTIFICATIONS] Parsing date string:', dateString);
      const date = new Date(dateString);
      console.log('[NOTIFICATIONS] Parsed date object:', {
        date,
        timestamp: date.getTime(),
        isoString: date.toISOString(),
        isValid: !isNaN(date.getTime()),
      });

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('[NOTIFICATIONS] Invalid date string:', {
          input: dateString,
          parsedDate: date,
          timestamp: date.getTime(),
        });
        return t('notifications.justNow', { defaultValue: 'Just now' });
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInMinutes = diffInMs / (1000 * 60);

      console.log('[NOTIFICATIONS] Date calculation:', {
        now: now.toISOString(),
        date: date.toISOString(),
        diffInMs,
        diffInHours: diffInHours.toFixed(2),
        diffInMinutes: diffInMinutes.toFixed(2),
        isFuture: diffInMs < 0,
      });

      // Handle future dates
      if (diffInMs < 0) {
        console.log(
          '[NOTIFICATIONS] Future date detected, returning "Just now"'
        );
        return t('notifications.justNow', { defaultValue: 'Just now' });
      }

      let result: string;
      if (diffInMinutes < 1) {
        result = t('notifications.justNow', { defaultValue: 'Just now' });
        console.log('[NOTIFICATIONS] Less than 1 minute, result:', result);
      } else if (diffInMinutes < 60) {
        const minutes = Math.floor(diffInMinutes);
        result = t('notifications.minutesAgo', {
          defaultValue: '{{count}}m ago',
          count: minutes,
        });
        console.log(
          '[NOTIFICATIONS] Minutes ago, result:',
          result,
          'minutes:',
          minutes
        );
      } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        result = t('notifications.hoursAgo', {
          defaultValue: '{{count}}h ago',
          count: hours,
        });
        console.log(
          '[NOTIFICATIONS] Hours ago, result:',
          result,
          'hours:',
          hours
        );
      } else if (diffInHours < 168) {
        const days = Math.floor(diffInHours / 24);
        result = t('notifications.daysAgo', {
          defaultValue: '{{count}}d ago',
          count: days,
        });
        console.log('[NOTIFICATIONS] Days ago, result:', result, 'days:', days);
      } else {
        // Format full date
        const options: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        const language = i18n.language || 'en';
        result = date.toLocaleDateString(language, options);
        console.log('[NOTIFICATIONS] Full date format, result:', result, {
          language,
          options,
        });
      }

      return result;
    } catch (error) {
      console.error('[NOTIFICATIONS] Error formatting date:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        dateString,
        dateStringType: typeof dateString,
      });
      return t('notifications.justNow', { defaultValue: 'Just now' });
    }
  };

  // Initialize animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(searchOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate filters when shown
  useEffect(() => {
    if (showFilters) {
      Animated.timing(filterOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(filterOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [showFilters]);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Sync unreadCount from context (real-time updates from socket)
  useEffect(() => {
    setUnreadCount(contextUnreadCount);
  }, [contextUnreadCount]);

  // Apply filters whenever notifications or filter criteria change
  useEffect(() => {
    console.log('[NOTIFICATIONS] Filter useEffect triggered:', {
      notificationsCount: notifications.length,
      searchQuery,
      selectedType,
      selectedStatus,
      firstNotificationId: notifications[0]?.id,
      lastNotificationId: notifications[notifications.length - 1]?.id,
    });

    // Use the latest notifications state to filter
    filterNotifications(
      searchQuery,
      selectedType,
      selectedStatus,
      notifications
    );

    // Note: filteredCount here may be stale due to async state update
    // The actual filteredNotifications will be updated by filterNotifications function
    console.log(
      '[NOTIFICATIONS] Filter useEffect completed - filterNotifications called'
    );
  }, [
    notifications,
    searchQuery,
    selectedType,
    selectedStatus,
    filterNotifications,
  ]);

  // Listen for socket events to update notifications list in real-time
  useEffect(() => {
    console.log(
      '[NOTIFICATIONS] Setting up AppEvents listeners for notification:new, notification:read, notification:count_updated'
    );

    // Log current AppEvents state for debugging
    console.log('[NOTIFICATIONS] Current AppEvents state:', {
      AppEventsType: typeof AppEvents,
      AppEventsOnType: typeof AppEvents.on,
      AppEventsEmitType: typeof AppEvents.emit,
    });

    const handleNotificationNew = (data: any) => {
      console.log(
        '[NOTIFY] [NOTIFICATION_CENTER] ⚡ notification:new event received:',
        JSON.stringify(data, null, 2)
      );

      if (data.notification_id || data.id) {
        const notificationId = data.notification_id || data.id;
        console.log(
          '[NOTIFICATIONS] Processing new notification from socket:',
          {
            notificationId,
            title: data.title,
            type: data.type,
            isQueued: notificationId.startsWith('queued_'),
            fullData: data,
          }
        );

        // Map socket event data to Notification interface
        const newNotification: Notification = mapNotificationFromAPI({
          id: notificationId,
          user_id: data.user_id || user?.id,
          type: data.type || 'GENERAL',
          title: data.title || 'Thông báo mới',
          message: data.message || '',
          is_read: false,
          priority: data.priority || 'NORMAL',
          created_at:
            data.created_at || data.createdAt || new Date().toISOString(),
          read_at: null,
          data: data.metadata || data.data || {},
        });

        console.log(
          '[NOTIFICATIONS] Mapped new notification:',
          newNotification
        );

        // Check if notification already exists before processing
        // Use functional update to avoid stale closure
        setNotifications((prev) => {
          console.log(
            '[NOTIFICATIONS] Current notifications count:',
            prev.length
          );

          if (prev.some((n) => n.id === newNotification.id)) {
            console.log(
              '[NOTIFICATIONS] ⚠️ Notification already exists, skipping:',
              newNotification.id
            );
            return prev;
          }

          console.log(
            '[NOTIFICATIONS] ✅ Adding new notification to notifications list. Previous count:',
            prev.length,
            'New notification ID:',
            newNotification.id,
            'Title:',
            newNotification.title
          );

          const updated = [newNotification, ...prev].slice(0, 100);
          console.log(
            '[NOTIFICATIONS] Updated notifications list count:',
            updated.length,
            'New notification will trigger filter useEffect'
          );
          return updated;
        });

        // Update unread count if notification is unread
        if (newNotification.status === 'UNREAD') {
          setUnreadCount((prevCount) => {
            const newCount = prevCount + 1;
            console.log(
              '[NOTIFICATIONS] Updated unread count:',
              prevCount,
              '->',
              newCount
            );
            return newCount;
          });
        }

        // Animate the new notification entry after state update
        // The filter useEffect will automatically update filteredNotifications
        // when notifications state changes, so we don't need to manually update it here
        setTimeout(() => {
          animateNotificationEntry(newNotification.id, 0);
        }, 100);
      } else {
        console.warn(
          '[NOTIFICATIONS] Received notification:new event but missing notification_id or id:',
          data
        );
      }
    };

    const handleNotificationRead = (data: any) => {
      console.log(
        '[NOTIFY] [NOTIFICATION_CENTER] notification:read event received:',
        data
      );

      if (data.all) {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            status: 'READ' as NotificationStatus,
            readAt: data.read_at || new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      } else if (
        data.bulk &&
        data.notification_ids &&
        Array.isArray(data.notification_ids)
      ) {
        setNotifications((prev) =>
          prev.map((n) =>
            data.notification_ids.includes(n.id)
              ? {
                  ...n,
                  status: 'READ' as NotificationStatus,
                  readAt: data.read_at || new Date().toISOString(),
                }
              : n
          )
        );
        setUnreadCount((prev) =>
          Math.max(
            0,
            prev - (data.updated_count || data.notification_ids.length)
          )
        );
      } else if (data.notification_id || data.id) {
        const notificationId = data.notification_id || data.id;
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  status: 'READ' as NotificationStatus,
                  readAt: data.read_at || new Date().toISOString(),
                }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleCountUpdated = () => {
      refreshCount();
    };

    console.log('[NOTIFICATIONS] 🔌 Registering AppEvents listeners...', {
      userId: user?.id,
      currentNotificationsCount: notifications.length,
      currentFilteredCount: filteredNotifications.length,
    });

    // Wrap handler to ensure it's always called
    const wrappedHandleNotificationNew = (data: any) => {
      console.log('[NOTIFICATIONS] Wrapped handler called with data:', {
        hasData: !!data,
        notificationId: data?.notification_id || data?.id,
        title: data?.title,
      });
      try {
        handleNotificationNew(data);
      } catch (error) {
        console.error('[NOTIFICATIONS] Error in handleNotificationNew:', error);
      }
    };

    const unsubscribe1 = AppEvents.on(
      'notification:new',
      wrappedHandleNotificationNew
    );
    console.log('[NOTIFICATIONS] ✅ Registered listener for notification:new', {
      handlerType: typeof wrappedHandleNotificationNew,
      unsubscribeType: typeof unsubscribe1,
    });

    const unsubscribe2 = AppEvents.on(
      'notification:read',
      handleNotificationRead
    );
    console.log('[NOTIFICATIONS] Registered listener for notification:read');

    const unsubscribe3 = AppEvents.on(
      'notification:count_updated',
      handleCountUpdated
    );
    console.log(
      '[NOTIFICATIONS] Registered listener for notification:count_updated'
    );

    console.log(
      '[NOTIFICATIONS] All AppEvents listeners registered successfully'
    );
    return () => {
      console.log('[NOTIFICATIONS] Cleaning up AppEvents listeners...');
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      console.log('[NOTIFICATIONS] AppEvents listeners cleaned up');
    };
    // Only re-register when user changes, not when notifications state changes
    // This prevents losing socket events during state updates
  }, [user?.id, refreshCount, animateNotificationEntry]);

  const renderNotificationItem = ({
    item: notification,
    index,
  }: {
    item: Notification;
    index: number;
  }) => {
    // Log notification structure for debugging
    if (index < 3) {
      console.log(`[NOTIFICATIONS] Rendering notification ${index}:`, {
        id: notification.id,
        title: notification.title,
        createdAt: notification.createdAt,
        created_at: (notification as any).created_at,
        date: (notification as any).date,
        timestamp: (notification as any).timestamp,
        allKeys: Object.keys(notification),
        notificationObject: notification,
      });
    }

    const anim = initializeNotificationAnimation(notification.id);
    const gradientColors = getNotificationGradient(notification.type);
    const isUnread = notification.status === 'UNREAD';
    const isSelected = selectedNotifications.includes(notification.id);

    return (
      <Animated.View
        style={[
          {
            opacity: anim.opacity,
            transform: [{ translateY: anim.translateY }, { scale: anim.scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            {
              backgroundColor: isUnread
                ? `${theme.colors.primary}08`
                : theme.colors.surface,
              borderColor: isUnread
                ? `${theme.colors.primary}25`
                : theme.colors.border,
              borderWidth: isUnread ? 1.5 : 1,
              shadowColor: isUnread ? theme.colors.primary : '#000',
              shadowOpacity: isUnread ? 0.15 : 0.08,
              shadowRadius: isUnread ? 18 : 16,
            },
            isSelected && {
              backgroundColor: `${theme.colors.primary}15`,
              borderColor: theme.colors.primary,
              borderWidth: 2.5,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.2,
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
          activeOpacity={0.75}
        >
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : 'transparent',
                  },
                ]}
              >
                {isSelected && <Check size={16} color={theme.colors.surface} />}
              </View>
            </View>
          )}

          {/* Icon Container */}
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={gradientColors}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {getNotificationIcon(notification.type)}
            </LinearGradient>
            {/* Priority badge on icon */}
            {notification.priority &&
              (notification.priority === 'URGENT' ||
                notification.priority === 'HIGH') && (
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: getPriorityColor(notification.priority),
                    },
                  ]}
                />
              )}
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            {/* Header: Title and Actions */}
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text
                  style={[
                    Typography.h6,
                    {
                      color: theme.colors.text,
                      fontWeight: isUnread ? '700' : '600',
                      marginBottom: 2,
                      lineHeight: 23,
                      flex: 1,
                      letterSpacing: isUnread ? -0.2 : -0.1,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {notification.title}
                </Text>
              </View>

              {/* Quick Actions - only show when not in selection mode */}
              {!isSelectionMode && (
                <View style={styles.quickActions}>
                  {isUnread && (
                    <TouchableOpacity
                      style={[
                        styles.quickActionButton,
                        {
                          backgroundColor: `${theme.colors.success}18`,
                          borderWidth: 1,
                          borderColor: `${theme.colors.success}30`,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CheckCircle2 size={17} color={theme.colors.success} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.quickActionButton,
                      {
                        backgroundColor: `${theme.colors.error}18`,
                        borderWidth: 1,
                        borderColor: `${theme.colors.error}30`,
                      },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(notification);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={17} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Message */}
            {notification.message && (
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: isUnread
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    lineHeight: 21,
                    marginBottom: 10,
                    paddingRight: 4,
                    opacity: isUnread ? 0.9 : 0.75,
                  },
                ]}
                numberOfLines={2}
              >
                {notification.message}
              </Text>
            )}

            {/* Footer: Time and Priority */}
            <View
              style={[
                styles.footerRow,
                {
                  borderTopColor: isUnread
                    ? `${theme.colors.primary}15`
                    : theme.colors.border,
                },
              ]}
            >
              <View style={styles.timeContainer}>
                <Clock
                  size={13}
                  color={
                    isUnread ? theme.colors.primary : theme.colors.textTertiary
                  }
                />
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: isUnread
                        ? theme.colors.primary
                        : theme.colors.textTertiary,
                      fontSize: 11,
                      fontWeight: isUnread ? '600' : '500',
                    },
                  ]}
                >
                  {formatDate(notification.createdAt)}
                </Text>
              </View>

              {/* Priority indicator */}
              {notification.priority && notification.priority !== 'NORMAL' && (
                <View
                  style={[
                    styles.priorityTag,
                    {
                      backgroundColor: `${getPriorityColor(
                        notification.priority
                      )}18`,
                      borderWidth: 1,
                      borderColor: `${getPriorityColor(
                        notification.priority
                      )}30`,
                    },
                  ]}
                >
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
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color: getPriorityColor(notification.priority),
                        fontSize: 10,
                        fontWeight: '700',
                        marginLeft: 5,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    {notification.priority}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            {t('notifications.loadingNotifications')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            opacity: headerOpacity,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[Typography.h2, { color: theme.colors.text }]}>
              {t('notifications.title')}
            </Text>
            {unreadCount > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.primary,
                    marginLeft: 10,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.captionMedium,
                    {
                      color: theme.colors.surface,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerActionButton,
              {
                backgroundColor: isSelectionMode
                  ? `${theme.colors.primary}15`
                  : 'transparent',
              },
            ]}
            onPress={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) {
                setSelectedNotifications([]);
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical
              size={20}
              color={
                isSelectionMode
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerActionButton,
              {
                backgroundColor: showFilters
                  ? `${theme.colors.primary}15`
                  : 'transparent',
              },
            ]}
            onPress={() => setShowFilters(!showFilters)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Filter
              size={20}
              color={
                showFilters ? theme.colors.primary : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => router.push('/settings/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {/* Mark All as Read Button */}
          {notifications.length > 0 && !isSelectionMode && (
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor:
                    unreadCount > 0
                      ? `${theme.colors.primary}15`
                      : 'transparent',
                  opacity: unreadCount === 0 ? 0.5 : 1,
                },
              ]}
              onPress={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CheckCircle2
                size={20}
                color={
                  unreadCount > 0
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </TouchableOpacity>
          )}
          {/* Delete All Read Button */}
          {notifications.length > 0 && !isSelectionMode && (
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor: `${theme.colors.error}10`,
                },
              ]}
              onPress={handleDeleteAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Search */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchOpacity,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor:
                searchQuery.length > 0
                  ? theme.colors.primary
                  : theme.colors.border,
              borderWidth: searchQuery.length > 0 ? 2 : 1,
            },
          ]}
        >
          <Search
            size={20}
            color={
              searchQuery.length > 0
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <TextInput
            style={[styles.searchText, { color: theme.colors.text }]}
            placeholder={t('notifications.searchPlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Filters */}
      {showFilters && (
        <Animated.View
          style={[
            styles.filters,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
              opacity: filterOpacity,
            },
          ]}
        >
          <View style={styles.filterHeader}>
            <Text
              style={[
                Typography.h6,
                { color: theme.colors.text, fontWeight: '600' },
              ]}
            >
              {t('notifications.filters') || 'Filters'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedType('ALL');
                setSelectedStatus('ALL');
                filterNotifications('', 'ALL', 'ALL', notifications);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  Typography.captionMedium,
                  { color: theme.colors.primary, fontWeight: '600' },
                ]}
              >
                {t('notifications.clearFilters') || 'Clear'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterGroup}>
            <Text
              style={[
                Typography.label,
                {
                  color: theme.colors.text,
                  marginBottom: 10,
                  fontWeight: '600',
                },
              ]}
            >
              {t('notifications.filterByType')}
            </Text>
            <Picker
              selectedValue={selectedType}
              onValueChange={handleTypeFilter}
              items={typeOptions}
            />
          </View>
          <View style={styles.filterGroup}>
            <Text
              style={[
                Typography.label,
                {
                  color: theme.colors.text,
                  marginBottom: 10,
                  fontWeight: '600',
                },
              ]}
            >
              {t('notifications.filterByStatus')}
            </Text>
            <Picker
              selectedValue={selectedStatus}
              onValueChange={handleStatusFilter}
              items={statusOptions}
            />
          </View>
        </Animated.View>
      )}

      {/* Bulk Actions */}
      {isSelectionMode && selectedNotifications.length > 0 && (
        <View
          style={[
            styles.bulkActions,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.bulkInfo}>
            <View
              style={[
                styles.bulkBadge,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  Typography.captionMedium,
                  {
                    color: theme.colors.surface,
                    fontWeight: '700',
                  },
                ]}
              >
                {selectedNotifications.length}
              </Text>
            </View>
            <Text
              style={[
                Typography.bodyMedium,
                {
                  color: theme.colors.text,
                  fontWeight: '600',
                  marginLeft: 10,
                },
              ]}
            >
              {t('notifications.selectedCount', {
                count: selectedNotifications.length,
              })}
            </Text>
          </View>
          <View style={styles.bulkButtons}>
            <TouchableOpacity
              style={[
                styles.bulkButton,
                {
                  backgroundColor: `${theme.colors.success}15`,
                  borderColor: `${theme.colors.success}30`,
                },
              ]}
              onPress={handleBulkMarkAsRead}
            >
              <CheckCircle2 size={18} color={theme.colors.success} />
              <Text
                style={[
                  Typography.buttonSmall,
                  {
                    color: theme.colors.success,
                    marginLeft: 6,
                  },
                ]}
              >
                {t('notifications.markAsRead')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.bulkButton,
                {
                  backgroundColor: `${theme.colors.error}15`,
                  borderColor: `${theme.colors.error}30`,
                },
              ]}
              onPress={handleBulkDelete}
            >
              <Trash2 size={18} color={theme.colors.error} />
              <Text
                style={[
                  Typography.buttonSmall,
                  {
                    color: theme.colors.error,
                    marginLeft: 6,
                  },
                ]}
              >
                {t('notifications.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notifications List */}
      <Animated.View style={[styles.listContainer, { opacity: listOpacity }]}>
        {filteredNotifications.length > 0 ? (
          <FlatList
            data={filteredNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Animated.View
              style={[
                styles.emptyIconContainer,
                {
                  backgroundColor: `${theme.colors.primary}10`,
                  opacity: listOpacity,
                },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, `${theme.colors.primary}DD`]}
                style={styles.emptyIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Bell size={48} color={theme.colors.surface} />
              </LinearGradient>
            </Animated.View>
            <Text
              style={[
                Typography.h4,
                {
                  color: theme.colors.text,
                  marginTop: 24,
                  marginBottom: 8,
                  fontWeight: '700',
                },
              ]}
            >
              {t('notifications.noNotifications')}
            </Text>
            <Text
              style={[
                Typography.bodyMedium,
                {
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: 32,
                  lineHeight: 22,
                },
              ]}
            >
              {notifications.length === 0
                ? t('notifications.noNotificationsDescription')
                : t('notifications.noMatchingNotifications')}
            </Text>
            {notifications.length === 0 && (
              <TouchableOpacity
                style={[
                  styles.emptyActionButton,
                  {
                    backgroundColor: theme.colors.primary,
                    marginTop: 24,
                  },
                ]}
                onPress={handleRefresh}
              >
                <Text
                  style={[
                    Typography.buttonMedium,
                    { color: theme.colors.surface },
                  ]}
                >
                  {t('notifications.refresh') || 'Refresh'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      marginTop: 16,
      ...Typography.bodyMedium,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    headerTitleContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      padding: 8,
      marginRight: 12,
      borderRadius: 12,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 6,
    },
    headerActionButton: {
      padding: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 40,
      minHeight: 40,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    searchInput: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    searchText: {
      flex: 1,
      ...Typography.bodyMedium,
      fontSize: 15,
    },
    filters: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
      borderBottomWidth: 1,
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    filterGroup: {
      marginBottom: 18,
    },
    bulkActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    bulkInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    bulkBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulkButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    bulkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    listContainer: {
      flex: 1,
    },
    listContent: {
      paddingTop: 20,
      paddingBottom: 24,
      paddingHorizontal: 18,
    },
    notificationCard: {
      flexDirection: 'row',
      paddingLeft: 18,
      paddingRight: 18,
      paddingTop: 18,
      paddingBottom: 18,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      elevation: 6,
      marginBottom: 14,
      marginHorizontal: 2,
      position: 'relative',
      overflow: 'visible',
      minHeight: 110,
    },
    unreadDot: {
      position: 'absolute',
      left: 6,
      top: 22,
      width: 10,
      height: 10,
      borderRadius: 5,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
    checkboxContainer: {
      position: 'absolute',
      left: 18,
      top: 18,
      zIndex: 10,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderWidth: 2.5,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    iconWrapper: {
      marginRight: 16,
      position: 'relative',
      alignSelf: 'flex-start',
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    priorityBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2.5,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
    },
    cardContent: {
      flex: 1,
      justifyContent: 'space-between',
      minWidth: 0,
      paddingTop: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 10,
    },
    titleContainer: {
      flex: 1,
      marginRight: 4,
    },
    quickActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
      marginTop: -2,
    },
    quickActionButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
      paddingTop: 12,
      borderTopWidth: 0.5,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 6,
    },
    priorityTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    priorityDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      overflow: 'hidden',
    },
    emptyIconGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyActionButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
