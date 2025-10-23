import { ClassCardProps } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin, Star, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Import local images
const classImages: Record<string, ImageSourcePropType> = {
  CARDIO: require('@/assets/images/gymclass/cadio.webp'),
  STRENGTH: require('@/assets/images/gymclass/strength.jpg'),
  YOGA: require('@/assets/images/gymclass/yoga.jpg'),
  PILATES: require('@/assets/images/gymclass/pilates.webp'),
  DANCE: require('@/assets/images/gymclass/dance.jpg'),
  MARTIAL_ARTS: require('@/assets/images/gymclass/martial_arts.jpg'),
  AQUA: require('@/assets/images/gymclass/aqua.jpg'),
  FUNCTIONAL: require('@/assets/images/gymclass/functional.jpg'),
  RECOVERY: require('@/assets/images/gymclass/recovery.jpg'),
  SPECIALIZED: require('@/assets/images/gymclass/specialized.jpg'),
};

export default function ClassCard({
  schedule,
  onPress,
  onBook,
  onCancel,
  showBookingActions = true,
}: ClassCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString(i18n.language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return theme.colors.success;
      case 'INTERMEDIATE':
        return theme.colors.warning;
      case 'ADVANCED':
        return theme.colors.error;
      case 'ALL_LEVELS':
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return theme.colors.primary;
      case 'IN_PROGRESS':
        return theme.colors.warning;
      case 'COMPLETED':
        return theme.colors.success;
      case 'CANCELLED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getDifficultyTranslation = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return t('classes.difficulty.beginner');
      case 'INTERMEDIATE':
        return t('classes.difficulty.intermediate');
      case 'ADVANCED':
        return t('classes.difficulty.advanced');
      case 'ALL_LEVELS':
        return t('classes.difficulty.all_levels');
      default:
        return difficulty;
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return t('classes.status.scheduled');
      case 'IN_PROGRESS':
        return t('classes.status.inProgress');
      case 'COMPLETED':
        return t('classes.status.completed');
      case 'CANCELLED':
        return t('classes.status.cancelled');
      default:
        return status;
    }
  };

  const getClassImage = () => {
    const category = schedule.gym_class?.category;
    if (category && classImages[category]) {
      return classImages[category];
    }
    // Fallback to URL if category not found or thumbnail exists
    if (schedule.gym_class?.thumbnail) {
      return { uri: schedule.gym_class.thumbnail };
    }
    // Default fallback
    return classImages.CARDIO;
  };

  const isFullyBooked = schedule.current_bookings >= schedule.max_capacity;
  const hasWaitlist = schedule.waitlist_count > 0;
  const spotsAvailable = schedule.max_capacity - schedule.current_bookings;

  const themedStyles = styles(theme);

  return (
    <TouchableOpacity
      style={[
        themedStyles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header with class image and status */}
      <View style={themedStyles.header}>
        <Image
          source={getClassImage()}
          style={themedStyles.classImage}
          resizeMode="cover"
        />
        <View style={themedStyles.statusBadge}>
          <View
            style={[
              themedStyles.statusIndicator,
              { backgroundColor: getStatusColor(schedule.status) },
            ]}
          />
          <Text style={[themedStyles.statusText, { color: theme.colors.text }]}>
            {getStatusTranslation(schedule.status)}
          </Text>
        </View>
      </View>

      {/* Class Info */}
      <View style={themedStyles.content}>
        <View style={themedStyles.classHeader}>
          <Text style={[themedStyles.className, { color: theme.colors.text }]}>
            {schedule.gym_class?.name}
          </Text>
          <View
            style={[
              themedStyles.difficultyBadge,
              {
                backgroundColor: getDifficultyColor(
                  schedule.gym_class?.difficulty || ''
                ),
              },
            ]}
          >
            <Text style={themedStyles.difficultyText}>
              {getDifficultyTranslation(schedule.gym_class?.difficulty || '')}
            </Text>
          </View>
        </View>

        <Text
          style={[
            themedStyles.classDescription,
            { color: theme.colors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {schedule.gym_class?.description}
        </Text>

        {/* Trainer Info */}
        {schedule.trainer && (
          <View style={themedStyles.trainerInfo}>
            <View style={themedStyles.trainerDetails}>
              <Text
                style={[themedStyles.trainerName, { color: theme.colors.text }]}
              >
                {schedule.trainer.full_name}
              </Text>
              {schedule.trainer.rating_average && (
                <View style={themedStyles.ratingContainer}>
                  <Star
                    size={14}
                    color={theme.colors.warning}
                    fill={theme.colors.warning}
                  />
                  <Text
                    style={[
                      themedStyles.ratingText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {schedule.trainer.rating_average.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Schedule Info */}
        <View style={themedStyles.scheduleInfo}>
          <View style={themedStyles.scheduleItem}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                themedStyles.scheduleText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {formatDate(schedule.start_time)}
            </Text>
          </View>
          <View style={themedStyles.scheduleItem}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                themedStyles.scheduleText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {formatTime(schedule.start_time)} -{' '}
              {formatTime(schedule.end_time)}
            </Text>
          </View>
          <View style={themedStyles.scheduleItem}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                themedStyles.scheduleText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {schedule.room?.name}
            </Text>
          </View>
        </View>

        {/* Capacity Info */}
        <View style={themedStyles.capacityInfo}>
          <View style={themedStyles.capacityItem}>
            <Users size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                themedStyles.capacityText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {schedule.current_bookings}/{schedule.max_capacity}{' '}
              {t('classes.booked')}
            </Text>
          </View>
          {isFullyBooked && (
            <Text
              style={[
                themedStyles.waitlistText,
                { color: theme.colors.warning },
              ]}
            >
              {hasWaitlist
                ? `${schedule.waitlist_count} ${t('classes.onWaitlist')}`
                : t('classes.booking.fullyBooked')}
            </Text>
          )}
          {!isFullyBooked && spotsAvailable <= 5 && (
            <Text
              style={[themedStyles.spotsText, { color: theme.colors.error }]}
            >
              {t('classes.onlySpotsLeft', { count: spotsAvailable })}
            </Text>
          )}
        </View>

        {/* Price */}
        {schedule.price_override && (
          <View style={themedStyles.priceContainer}>
            <Text
              style={[themedStyles.priceText, { color: theme.colors.primary }]}
            >
              ${schedule.price_override}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {showBookingActions && (
        <View style={themedStyles.actions}>
          {schedule.status === 'SCHEDULED' && !isFullyBooked && (
            <TouchableOpacity
              style={[
                themedStyles.bookButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={onBook}
            >
              <Text
                style={[
                  themedStyles.bookButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {t('classes.booking.book')}
              </Text>
            </TouchableOpacity>
          )}
          {schedule.status === 'SCHEDULED' && isFullyBooked && !hasWaitlist && (
            <TouchableOpacity
              style={[
                themedStyles.waitlistButton,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={onBook}
            >
              <Text
                style={[
                  themedStyles.waitlistButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {t('classes.joinWaitlist')}
              </Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity
              style={[
                themedStyles.cancelButton,
                { borderColor: theme.colors.error },
              ]}
              onPress={onCancel}
            >
              <Text
                style={[
                  themedStyles.cancelButtonText,
                  { color: theme.colors.error },
                ]}
              >
                {t('classes.booking.cancel')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    header: {
      position: 'relative',
      height: 180,
    },
    classImage: {
      width: '100%',
      height: '100%',
    },
    statusBadge: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.round,
      ...theme.shadows.sm,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: theme.radius.round,
    },
    statusText: {
      ...Typography.labelSmall,
      color: '#fff',
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    classHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    className: {
      ...Typography.h5,
      flex: 1,
    },
    difficultyBadge: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.md,
      ...theme.shadows.sm,
    },
    difficultyText: {
      ...Typography.labelSmall,
      color: '#fff',
    },
    classDescription: {
      ...Typography.bodySmall,
      lineHeight: 20,
      opacity: 0.8,
    },
    trainerInfo: {
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.03)',
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    trainerDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    trainerName: {
      ...Typography.bodyMedium,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)',
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      gap: theme.spacing.xs,
    },
    ratingText: {
      ...Typography.labelSmall,
    },
    scheduleInfo: {
      gap: theme.spacing.xs + 2,
    },
    scheduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    scheduleText: {
      ...Typography.bodySmall,
    },
    capacityInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.03)',
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    capacityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs + 2,
    },
    capacityText: {
      ...Typography.bodySmallMedium,
    },
    waitlistText: {
      ...Typography.labelSmall,
    },
    spotsText: {
      ...Typography.labelSmall,
    },
    priceContainer: {
      alignItems: 'flex-end',
      backgroundColor: theme.colors.primary + '15',
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    priceText: {
      ...Typography.h6,
    },
    actions: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      paddingTop: 0,
      gap: theme.spacing.sm,
    },
    bookButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    bookButtonText: {
      ...Typography.buttonMedium,
    },
    waitlistButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    waitlistButtonText: {
      ...Typography.buttonMedium,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 2,
      alignItems: 'center',
    },
    cancelButtonText: {
      ...Typography.buttonMedium,
    },
  });
