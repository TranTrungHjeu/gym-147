import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/member/notification.service';
import type { Notification } from '@/types/notificationTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const loadNotification = async () => {
    if (!id) return;

    try {
      const notificationData = await notificationService.getNotificationById(
        id
      );
      setNotification(notificationData);

      // Mark as read if unread
      if (notificationData.status === 'UNREAD') {
        await notificationService.markAsRead(id);
      }
    } catch (error) {
      console.error('Error loading notification:', error);
      Alert.alert('Error', 'Failed to load notification');
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
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notification.id);
              router.back();
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WORKOUT_REMINDER':
        return '💪';
      case 'MEMBERSHIP_EXPIRY':
        return '⏰';
      case 'PAYMENT_DUE':
        return '💳';
      case 'CLASS_BOOKING':
        return '📅';
      case 'ACHIEVEMENT':
        return '🏆';
      case 'MAINTENANCE':
        return '🔧';
      case 'PROMOTION':
        return '🎉';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '🔔';
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
    return date.toLocaleString();
  };

  const getRelativeTime = (dateString: string) => {
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
      return date.toLocaleDateString();
    }
  };

  useEffect(() => {
    loadNotification();
  }, [id]);

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
            Loading notification...
          </Text>
        </View>
      </View>
    );
  }

  if (!notification) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            Notification not found
          </Text>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            This notification may have been deleted or doesn't exist.
          </Text>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.back()}
          >
            <Text
              style={[styles.backButtonText, { color: theme.colors.surface }]}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Notification
        </Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View
          style={[
            styles.notificationCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationIcon}>
              {getNotificationIcon(notification.type)}
            </Text>
            <View style={styles.notificationInfo}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {notification.title}
              </Text>
              <View style={styles.notificationMeta}>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: getPriorityColor(notification.priority),
                    },
                  ]}
                >
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.surface },
                    ]}
                  >
                    {notification.priority}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        notification.status === 'UNREAD'
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.surface },
                    ]}
                  >
                    {notification.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.notificationContent}>
            <Text style={[Typography.bodyLarge, { color: theme.colors.text }]}>
              {notification.message}
            </Text>
          </View>

          <View style={styles.notificationFooter}>
            <View style={styles.timeInfo}>
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {getRelativeTime(notification.createdAt)}
              </Text>
            </View>
            <View style={styles.dateInfo}>
              <Calendar size={16} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {formatDate(notification.createdAt)}
              </Text>
            </View>
          </View>

          {notification.metadata &&
            Object.keys(notification.metadata).length > 0 && (
              <View style={styles.metadataSection}>
                <Text style={[Typography.h4, { color: theme.colors.text }]}>
                  Additional Information
                </Text>
                <View style={styles.metadataContent}>
                  {Object.entries(notification.metadata).map(([key, value]) => (
                    <View key={key} style={styles.metadataItem}>
                      <Text
                        style={[
                          Typography.caption,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {key}:
                      </Text>
                      <Text
                        style={[
                          Typography.bodyLarge,
                          { color: theme.colors.text },
                        ]}
                      >
                        {String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
        </View>
      </ScrollView>
    </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  notificationCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  notificationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notificationContent: {
    marginBottom: 16,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  metadataContent: {
    marginTop: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
});
