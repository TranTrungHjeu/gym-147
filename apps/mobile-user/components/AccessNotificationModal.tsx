import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface AccessNotificationModalProps {
  visible: boolean;
  type: 'check-in' | 'check-out' | 'error';
  onClose: () => void;
  data?: {
    location?: string;
    time?: string;
    duration?: number;
    calories?: number;
  };
}

export default function AccessNotificationModal({
  visible,
  type,
  onClose,
  data,
}: AccessNotificationModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scaleValue = new Animated.Value(0);
  const fadeValue = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleValue.setValue(0);
      fadeValue.setValue(0);
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'check-in':
        return 'log-in-outline';
      case 'check-out':
        return 'log-out-outline';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'checkmark-circle-outline';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'check-in':
        return theme.colors.primary;
      case 'check-out':
        return '#10B981'; // Green
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'check-in':
        return t('access.checkInSuccess', 'Check In Successful');
      case 'check-out':
        return t('access.checkOutSuccess', 'Check Out Successful');
      case 'error':
        return t('common.error', 'Error');
      default:
        return '';
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'check-in':
        return t(
          'access.welcomeMessage',
          'Welcome to the gym. Have a great workout!'
        );
      case 'check-out':
        return t(
          'access.goodbyeMessage',
          'Thank you for your visit. See you next time!'
        );
      case 'error':
        return t(
          'access.errorMessage',
          'Unable to process your request. Please try again.'
        );
      default:
        return '';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ scale: scaleValue }],
              opacity: fadeValue,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${getColor()}15` },
            ]}
          >
            <Ionicons name={getIcon()} size={48} color={getColor()} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {getTitle()}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {getMessage()}
          </Text>

          {/* Details */}
          {data && (
            <View
              style={[
                styles.detailsContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {data.location && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.detailText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {data.location}
                  </Text>
                </View>
              )}

              {data.time && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.detailText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {data.time}
                  </Text>
                </View>
              )}

              {type === 'check-out' && data.duration !== undefined && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="timer-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.detailText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('session.duration', 'Duration')}:{' '}
                    {Math.floor(data.duration / 60)}h {data.duration % 60}m
                  </Text>
                </View>
              )}

              {type === 'check-out' && data.calories !== undefined && (
                <View style={styles.detailRow}>
                  <Ionicons name="flame-outline" size={16} color="#FF6B35" />
                  <Text
                    style={[
                      styles.detailText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('session.caloriesBurned', 'Calories Burned')}:{' '}
                    {data.calories} kcal
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Loading Indicator */}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {type === 'error'
                ? t('common.tryAgain', 'Please try again')
                : t('access.redirecting', 'Redirecting...')}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    ...Typography.h3,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 8,
  },
  loadingText: {
    ...Typography.bodySmall,
  },
});
