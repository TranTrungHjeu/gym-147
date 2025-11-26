import { ClassCardProps } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin, Star, Users } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
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
  userBooking,
  onNavigateToPayment,
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
    if (schedule.gym_class?.thumbnail) {
      return { uri: schedule.gym_class.thumbnail };
    }
    return classImages.CARDIO;
  };

  const isFullyBooked = schedule.current_bookings >= schedule.max_capacity;
  const hasWaitlist = schedule.waitlist_count > 0;
  const spotsAvailable = schedule.max_capacity - schedule.current_bookings;

  const isBooked = userBooking?.status === 'CONFIRMED';
  const isWaitlisted =
    userBooking?.is_waitlist || userBooking?.status === 'WAITLIST';

  const themedStyles = styles(theme);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
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
      {/* Image Container - Square, 200px height */}
      <View style={themedStyles.imageContainer}>
        <Image
          source={getClassImage()}
          style={themedStyles.classImage}
          resizeMode="cover"
        />
        {/* Status Badge - Top right */}
        <View
          style={[
            themedStyles.statusBadge,
            { backgroundColor: getStatusColor(schedule.status) + 'E6' },
          ]}
        >
          <View
            style={[
              themedStyles.statusIndicator,
              { backgroundColor: theme.colors.textInverse },
            ]}
          />
          <Text style={themedStyles.statusText}>
            {getStatusTranslation(schedule.status)}
          </Text>
        </View>
      </View>

      {/* Content Container - padding 16px */}
      <View style={themedStyles.content}>
        {/* Header Row: Class Name + Difficulty Badge */}
        <View style={themedStyles.classHeader}>
          <Text
            style={[themedStyles.className, { color: theme.colors.text }]}
            numberOfLines={1}
          >
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

        {/* Description - 2 lines */}
        <Text
          style={[
            themedStyles.classDescription,
            { color: theme.colors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {schedule.gym_class?.description}
        </Text>

        {/* Info Grid - 2 columns */}
        <View style={themedStyles.infoGrid}>
          {/* Trainer Info */}
          {schedule.trainer && (
            <View style={themedStyles.infoItem}>
              <View style={themedStyles.infoIconContainer}>
                <Users size={14} color={theme.colors.textSecondary} />
              </View>
              <View style={themedStyles.infoTextContainer}>
                <Text
                  style={[
                    themedStyles.infoLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('classes.trainer')}
                </Text>
                <Text
                  style={[themedStyles.infoValue, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {schedule.trainer.full_name}
                </Text>
                {schedule.trainer.rating_average && (
                  <View style={themedStyles.ratingRow}>
                    <Star
                      size={12}
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

          {/* Time Info */}
          <View style={themedStyles.infoItem}>
            <View style={themedStyles.infoIconContainer}>
              <Clock size={14} color={theme.colors.textSecondary} />
            </View>
            <View style={themedStyles.infoTextContainer}>
              <Text
                style={[
                  themedStyles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('classes.time')}
              </Text>
              <Text
                style={[themedStyles.infoValue, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
              </Text>
              <Text
                style={[
                  themedStyles.infoSubtext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {formatDate(schedule.start_time)}
              </Text>
            </View>
          </View>

          {/* Location Info */}
          {schedule.room && (
            <View style={themedStyles.infoItem}>
              <View style={themedStyles.infoIconContainer}>
                <MapPin size={14} color={theme.colors.textSecondary} />
              </View>
              <View style={themedStyles.infoTextContainer}>
                <Text
                  style={[
                    themedStyles.infoLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('classes.location')}
                </Text>
                <Text
                  style={[themedStyles.infoValue, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {schedule.room.name}
                </Text>
              </View>
            </View>
          )}

          {/* Capacity Info */}
          <View style={themedStyles.infoItem}>
            <View style={themedStyles.infoIconContainer}>
              <Users size={14} color={theme.colors.textSecondary} />
            </View>
            <View style={themedStyles.infoTextContainer}>
              <Text
                style={[
                  themedStyles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('classes.capacity')}
              </Text>
              <Text
                style={[themedStyles.infoValue, { color: theme.colors.text }]}
              >
                {schedule.current_bookings}/{schedule.max_capacity}
              </Text>
              {isFullyBooked && (
                <Text
                  style={[
                    themedStyles.infoSubtext,
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
                  style={[
                    themedStyles.infoSubtext,
                    { color: theme.colors.error },
                  ]}
                >
                  {t('classes.onlySpotsLeft', { count: spotsAvailable })}
                </Text>
              )}
            </View>
          </View>
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

        {/* Action Button - Full width, square */}
        {showBookingActions && schedule.status === 'SCHEDULED' && (
          <View style={themedStyles.actions}>
            {(() => {
              if (userBooking) {
                const paymentStatus =
                  userBooking.payment_status?.toUpperCase() || '';

                if (paymentStatus === 'PENDING') {
                  return (
                    <TouchableOpacity
                      style={[
                        themedStyles.actionButton,
                        { backgroundColor: theme.colors.warning },
                      ]}
                      onPress={onNavigateToPayment || onPress}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          themedStyles.actionButtonText,
                          { color: theme.colors.textInverse },
                        ]}
                      >
                        {t('classes.booking.pendingPayment')}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                if (
                  (paymentStatus === 'PAID' || paymentStatus === 'COMPLETED') &&
                  isBooked
                ) {
                  return (
                    <View
                      style={[
                        themedStyles.actionButton,
                        {
                          backgroundColor: theme.colors.success + '20',
                          borderWidth: 1,
                          borderColor: theme.colors.success,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          themedStyles.actionButtonText,
                          { color: theme.colors.success },
                        ]}
                      >
                        {t('classes.booking.alreadyEnrolled')}
                      </Text>
                    </View>
                  );
                }

                if (isWaitlisted || userBooking.status === 'WAITLIST') {
                  return (
                    <TouchableOpacity
                      style={[
                        themedStyles.actionButton,
                        {
                          backgroundColor: 'transparent',
                          borderWidth: 1,
                          borderColor: theme.colors.warning,
                        },
                      ]}
                      onPress={onCancel}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          themedStyles.actionButtonText,
                          { color: theme.colors.warning },
                        ]}
                      >
                        {t('classes.booking.removeFromWaitlist')}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    style={[
                      themedStyles.actionButton,
                      {
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: theme.colors.error,
                      },
                    ]}
                    onPress={onCancel}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        themedStyles.actionButtonText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {t('classes.booking.cancel')}
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (!isFullyBooked) {
                return (
                  <TouchableOpacity
                    style={[
                      themedStyles.actionButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={onBook}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        themedStyles.actionButtonText,
                        { color: theme.colors.textInverse },
                      ]}
                    >
                      {t('classes.booking.book')}
                    </Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  style={[
                    themedStyles.actionButton,
                    { backgroundColor: theme.colors.warning },
                  ]}
                  onPress={onBook}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      themedStyles.actionButtonText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {t('classes.joinWaitlist')}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.radius.lg, // 12px
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: 200,
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
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md, // 8px
      ...theme.shadows.sm,
    },
    statusIndicator: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.round,
    },
    statusText: {
      ...Typography.labelSmall,
      color: theme.colors.textInverse,
    },
    content: {
      padding: theme.spacing.lg, // 16px
      gap: theme.spacing.md, // 12px
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
      fontWeight: '700',
    },
    difficultyBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md, // 8px
    },
    difficultyText: {
      ...Typography.labelSmall,
      color: theme.colors.textInverse,
      fontWeight: '600',
    },
    classDescription: {
      ...Typography.bodySmall,
      lineHeight: 20,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    infoItem: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flex: 1,
      minWidth: '45%',
    },
    infoIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.border + '40',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTextContainer: {
      flex: 1,
      gap: 2,
    },
    infoLabel: {
      ...Typography.caption,
      fontSize: 11,
    },
    infoValue: {
      ...Typography.bodySmallMedium,
      fontSize: 13,
    },
    infoSubtext: {
      ...Typography.caption,
      fontSize: 11,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    ratingText: {
      ...Typography.caption,
      fontSize: 11,
    },
    priceContainer: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
    },
    priceText: {
      ...Typography.h6,
      fontWeight: '700',
    },
    actions: {
      marginTop: theme.spacing.xs,
    },
    actionButton: {
      width: '100%',
      paddingVertical: theme.spacing.md, // 14px
      paddingHorizontal: theme.spacing.lg, // 20px
      borderRadius: theme.radius.lg, // 12px
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.sm,
    },
    actionButtonText: {
      ...Typography.buttonMedium,
      fontWeight: '600',
    },
  });
