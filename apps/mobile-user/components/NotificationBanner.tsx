import { Typography } from '@/utils/typography';
import {
  Bell,
  X,
  Calendar,
  CreditCard,
  Trophy,
  Clock,
  Users,
  AlertCircle,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/utils/theme';
import { AppEvents } from '@/utils/eventEmitter';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationBannerData {
  notification_id?: string;
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  data?: any;
  created_at?: string;
}

export const NotificationBanner: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [notification, setNotification] =
    useState<NotificationBannerData | null>(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null);

  // Get icon based on notification type
  const getNotificationIcon = (type?: string) => {
    if (!type) return <Bell size={20} color={theme.colors.primary} />;

    switch (type.toUpperCase()) {
      case 'SCHEDULE_UPDATE':
      case 'CLASS_BOOKING':
      case 'CLASS_CANCELLED':
      case 'CLASS_REMINDER':
        return <Calendar size={20} color={theme.colors.primary} />;
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_RENEWED':
      case 'SUBSCRIPTION_EXPIRED':
        return <CreditCard size={20} color={theme.colors.primary} />;
      case 'ACHIEVEMENT_UNLOCKED':
      case 'REWARD_REDEEMED':
        return <Trophy size={20} color={theme.colors.primary} />;
      case 'QUEUE_YOUR_TURN':
      case 'EQUIPMENT_AVAILABLE':
        return <Clock size={20} color={theme.colors.primary} />;
      case 'MEMBER_CHECKED_IN':
        return <Users size={20} color={theme.colors.primary} />;
      case 'SYSTEM_ANNOUNCEMENT':
      case 'GENERAL':
        return <AlertCircle size={20} color={theme.colors.primary} />;
      default:
        return <Bell size={20} color={theme.colors.primary} />;
    }
  };

  // Show banner with animation
  const showBanner = (data: NotificationBannerData) => {
    // Clear any existing timer
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }

    setNotification(data);
    setVisible(true);

    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 5 seconds
    autoHideTimer.current = setTimeout(() => {
      hideBanner();
    }, 5000);
  };

  // Hide banner with animation
  const hideBanner = () => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setNotification(null);
    });
  };

  // Handle banner press - navigate to notification detail or list
  const handlePress = () => {
    if (!notification) return;

    hideBanner();

    // Navigate based on notification type
    const notificationId = notification.notification_id || notification.id;
    if (notificationId) {
      // Navigate to notification detail if we have the ID
      router.push(`/notifications?highlight=${notificationId}`);
    } else {
      // Otherwise just go to notifications list
      router.push('/notifications');
    }
  };

  // Listen for notification:new events
  useEffect(() => {
    // Only listen if user is logged in
    if (!user?.id) {
      return;
    }

    const handleNotificationNew = (data: NotificationBannerData) => {
      console.log(
        '[NOTIFICATION_BANNER] Received notification:new event:',
        data
      );

      // Only show banner if we have title or message
      if (data.title || data.message) {
        showBanner(data);
      }
    };

    // Register listener
    const unsubscribe = AppEvents.on('notification:new', handleNotificationNew);
    console.log(
      '[NOTIFICATION_BANNER] Registered listener for notification:new'
    );

    // Cleanup
    return () => {
      unsubscribe();
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
      console.log(
        '[NOTIFICATION_BANNER] Unregistered listener for notification:new'
      );
    };
  }, [user?.id]);

  // Don't show if user is not logged in
  if (!user?.id || !visible || !notification) {
    return null;
  }

  const styles = createStyles(theme);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
            shadowColor: theme.colors.text,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.primary + '15' },
            ]}
          >
            {getNotificationIcon(notification.type)}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            {notification.title && (
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
            )}
            {notification.message && (
              <Text
                style={[styles.message, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {notification.message}
              </Text>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideBanner}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      pointerEvents: 'box-none',
    },
    banner: {
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...Typography.bodyMedium,
      fontWeight: '600',
      fontSize: 14,
    },
    message: {
      ...Typography.bodySmall,
      fontSize: 12,
      lineHeight: 16,
    },
    closeButton: {
      padding: 4,
    },
  });
