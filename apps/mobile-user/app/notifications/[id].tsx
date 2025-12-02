import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/member/notification.service';
import type { Notification } from '@/types/notificationTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Dumbbell,
  PartyPopper,
  Settings,
  Trash2,
  Trophy,
  Wrench,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const metadataOpacity = useRef(new Animated.Value(0)).current;

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
          : (apiNotification.status as any) || 'UNREAD',
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

  const loadNotification = async () => {
    if (!id) return;

    try {
      const notificationData = await notificationService.getNotificationById(
        id
      );

      // Map API response to Notification interface
      const mappedNotification = mapNotificationFromAPI(notificationData);
      setNotification(mappedNotification);

      // Mark as read if unread
      if (mappedNotification.status === 'UNREAD') {
        await notificationService.markAsRead(id);
      }

      // Start animations
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(contentTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Animate metadata if exists
      if (
        mappedNotification.metadata &&
        Object.keys(mappedNotification.metadata).length > 0
      ) {
        Animated.delay(300).start(() => {
          Animated.timing(metadataOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        });
      }
    } catch (error) {
      console.error('Error loading notification:', error);
      Alert.alert(t('common.error'), t('notifications.failedToLoadDetail'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotification();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!notification) return;

    Alert.alert(
      t('notifications.confirmDelete'),
      t('notifications.confirmDeleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notification.id);
              router.back();
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert(
                t('common.error'),
                t('notifications.failedToDeleteDetail')
              );
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    const iconProps = { size: 32, color: '#FFFFFF' };
    switch (type) {
      case 'WORKOUT_REMINDER':
        return <Dumbbell {...iconProps} />;
      case 'MEMBERSHIP_EXPIRY':
        return <Clock {...iconProps} />;
      case 'PAYMENT_DUE':
        return <CreditCard {...iconProps} />;
      case 'CLASS_BOOKING':
        return <Calendar {...iconProps} />;
      case 'ACHIEVEMENT':
        return <Trophy {...iconProps} />;
      case 'MAINTENANCE':
        return <Wrench {...iconProps} />;
      case 'PROMOTION':
        return <PartyPopper {...iconProps} />;
      case 'SYSTEM':
        return <Settings {...iconProps} />;
      default:
        return <Settings {...iconProps} />;
    }
  };

  const getNotificationGradient = (type: string): [string, string] => {
    switch (type) {
      case 'WORKOUT_REMINDER':
        return ['#FF6B6B', '#FF8E8E'];
      case 'MEMBERSHIP_EXPIRY':
        return ['#FFA726', '#FFB74D'];
      case 'PAYMENT_DUE':
        return ['#42A5F5', '#64B5F6'];
      case 'CLASS_BOOKING':
        return ['#66BB6A', '#81C784'];
      case 'ACHIEVEMENT':
        return ['#FFD54F', '#FFE082'];
      case 'MAINTENANCE':
        return ['#78909C', '#90A4AE'];
      case 'PROMOTION':
        return ['#AB47BC', '#BA68C8'];
      case 'SYSTEM':
        return ['#26A69A', '#4DB6AC'];
      default:
        return ['#78909C', '#90A4AE'];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#EF5350';
      case 'HIGH':
        return '#FF9800';
      case 'MEDIUM':
        return '#42A5F5';
      case 'LOW':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language);
  };

  const getRelativeTime = (dateString: string) => {
    if (!dateString) {
      return t('notifications.justNow', { defaultValue: 'Vừa xong' });
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return t('notifications.justNow', { defaultValue: 'Vừa xong' });
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInMinutes = diffInMs / (1000 * 60);

      if (diffInMs < 0) {
        return t('notifications.justNow', { defaultValue: 'Vừa xong' });
      }

      if (diffInMinutes < 1) {
        return t('notifications.justNow', { defaultValue: 'Vừa xong' });
      } else if (diffInMinutes < 60) {
        const minutes = Math.floor(diffInMinutes);
        return t('notifications.minutesAgo', {
          defaultValue: '{{count}} phút trước',
          count: minutes,
        });
      } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return t('notifications.hoursAgo', {
          defaultValue: '{{count}} giờ trước',
          count: hours,
        });
      } else if (diffInHours < 168) {
        const days = Math.floor(diffInHours / 24);
        return t('notifications.daysAgo', {
          defaultValue: '{{count}} ngày trước',
          count: days,
        });
      } else {
        const options: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        return date.toLocaleDateString(i18n.language || 'vi', options);
      }
    } catch (error) {
      return t('notifications.justNow', { defaultValue: 'Vừa xong' });
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return t('notifications.priority.urgent', { defaultValue: 'Khẩn cấp' });
      case 'HIGH':
        return t('notifications.priority.high', { defaultValue: 'Cao' });
      case 'MEDIUM':
        return t('notifications.priority.medium', {
          defaultValue: 'Trung bình',
        });
      case 'LOW':
        return t('notifications.priority.low', { defaultValue: 'Thấp' });
      case 'NORMAL':
        return t('notifications.priority.normal', {
          defaultValue: 'Bình thường',
        });
      default:
        return priority;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'UNREAD':
        return t('notifications.unread', { defaultValue: 'Chưa đọc' });
      case 'READ':
        return t('notifications.read', { defaultValue: 'Đã đọc' });
      case 'ARCHIVED':
        return t('notifications.archived', { defaultValue: 'Đã lưu trữ' });
      default:
        return status;
    }
  };

  useEffect(() => {
    loadNotification();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
        edges={['top']}
      >
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              Typography.bodyLarge,
              {
                color: theme.colors.textSecondary,
                marginTop: theme.spacing.md,
              },
            ]}
          >
            {t('notifications.loadingDetail', {
              defaultValue: 'Đang tải thông báo...',
            })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
        edges={['top']}
      >
        <Animated.View
          style={[themedStyles.errorContainer, { opacity: headerOpacity }]}
        >
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            {t('notifications.notFound', {
              defaultValue: 'Không tìm thấy thông báo',
            })}
          </Text>
          <Text
            style={[
              Typography.bodyLarge,
              {
                color: theme.colors.textSecondary,
                marginTop: theme.spacing.md,
              },
            ]}
          >
            {t('notifications.notFoundMessage', {
              defaultValue:
                'Thông báo này có thể đã bị xóa hoặc không tồn tại.',
            })}
          </Text>
          <TouchableOpacity
            style={[
              themedStyles.backButton,
              {
                backgroundColor: theme.colors.primary,
                marginTop: theme.spacing.xl,
              },
            ]}
            onPress={() => router.back()}
          >
            <Text
              style={[
                themedStyles.backButtonText,
                { color: theme.colors.surface },
              ]}
            >
              {t('common.goBack', { defaultValue: 'Quay lại' })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const gradientColors = getNotificationGradient(notification.type);

  return (
    <SafeAreaView
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
      edges={['top']}
    >
      {/* Header */}
      <Animated.View
        style={[
          themedStyles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            opacity: headerOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={themedStyles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: theme.colors.text, flex: 1 }]}>
          {t('notifications.detail', { defaultValue: 'Chi tiết thông báo' })}
        </Text>
        <TouchableOpacity
          style={themedStyles.headerButton}
          onPress={handleDelete}
        >
          <Trash2 size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={themedStyles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Notification Card */}
        <Animated.View
          style={[
            themedStyles.notificationCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Icon Header */}
          <View style={themedStyles.iconHeader}>
            <LinearGradient
              colors={gradientColors}
              style={themedStyles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {getNotificationIcon(notification.type)}
            </LinearGradient>
          </View>

          {/* Title and Badges */}
          <Animated.View
            style={[
              themedStyles.contentSection,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <Text
              style={[
                Typography.h3,
                {
                  color: theme.colors.text,
                  marginBottom: theme.spacing.md,
                  lineHeight: 32,
                  fontWeight: '700',
                },
              ]}
            >
              {notification.title}
            </Text>

            <View style={themedStyles.badgesContainer}>
              <View
                style={[
                  themedStyles.priorityBadge,
                  {
                    backgroundColor: `${getPriorityColor(
                      notification.priority
                    )}20`,
                    borderColor: getPriorityColor(notification.priority),
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: getPriorityColor(notification.priority),
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getPriorityLabel(notification.priority)}
                </Text>
              </View>
              <View
                style={[
                  themedStyles.statusBadge,
                  {
                    backgroundColor:
                      notification.status === 'UNREAD'
                        ? `${theme.colors.primary}20`
                        : `${theme.colors.textSecondary}20`,
                    borderColor:
                      notification.status === 'UNREAD'
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.caption,
                    {
                      color:
                        notification.status === 'UNREAD'
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getStatusLabel(notification.status)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Message Content */}
          <Animated.View
            style={[
              themedStyles.contentSection,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <Text
              style={[
                Typography.bodyLarge,
                {
                  color: theme.colors.text,
                  lineHeight: 26,
                  opacity: 0.9,
                },
              ]}
            >
              {notification.message}
            </Text>
          </Animated.View>

          {/* Footer Info */}
          <View
            style={[
              themedStyles.footer,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <View style={themedStyles.timeInfo}>
              <Clock size={18} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.caption,
                  {
                    color: theme.colors.textSecondary,
                    marginLeft: theme.spacing.xs,
                  },
                ]}
              >
                {getRelativeTime(notification.createdAt)}
              </Text>
            </View>
            <View style={themedStyles.dateInfo}>
              <Calendar size={18} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.caption,
                  {
                    color: theme.colors.textSecondary,
                    marginLeft: theme.spacing.xs,
                  },
                ]}
              >
                {formatDate(notification.createdAt)}
              </Text>
            </View>
          </View>

          {/* Metadata Section */}
          {notification.metadata &&
            Object.keys(notification.metadata).length > 0 && (
              <Animated.View
                style={[
                  themedStyles.metadataSection,
                  {
                    borderTopColor: theme.colors.border,
                    opacity: metadataOpacity,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.h4,
                    {
                      color: theme.colors.text,
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                >
                  {t('notifications.additionalInfo', {
                    defaultValue: 'Thông tin bổ sung',
                  })}
                </Text>
                <View style={themedStyles.metadataContent}>
                  {Object.entries(notification.metadata).map(
                    ([key, value], index) => (
                      <View
                        key={key}
                        style={[
                          themedStyles.metadataItem,
                          {
                            borderBottomColor: theme.colors.border,
                            backgroundColor:
                              index % 2 === 0
                                ? 'transparent'
                                : `${theme.colors.primary}05`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.caption,
                            {
                              color: theme.colors.textSecondary,
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            },
                          ]}
                        >
                          {key}:
                        </Text>
                        <Text
                          style={[
                            Typography.bodyMedium,
                            {
                              color: theme.colors.text,
                              marginTop: theme.spacing.xs,
                            },
                          ]}
                        >
                          {String(value)}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </Animated.View>
            )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const themedStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  notificationCard: {
    margin: 16,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  contentSection: {
    marginBottom: 24,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    marginTop: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataSection: {
    marginTop: 28,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  metadataContent: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  metadataItem: {
    padding: 18,
    borderBottomWidth: 0.5,
  },
});
