import { ClassCardProps, ScheduleStatus } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Star,
  Users,
} from 'lucide-react-native';
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
  onScanQR,
  attendance,
}: ClassCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const formatTime = (dateTime: string | null | undefined): string => {
    if (!dateTime) return '';
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return '';
      const formatted = date.toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      return formatted || '';
    } catch (error) {
      return '';
    }
  };

  const formatDate = (dateTime: string | null | undefined): string => {
    if (!dateTime) return '';
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return '';
      const formatted = date.toLocaleDateString(i18n.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      return formatted || '';
    } catch (error) {
      return '';
    }
  };

  const getDifficultyColor = (difficulty: string | null | undefined) => {
    if (!difficulty) return theme.colors.textSecondary;
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

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return theme.colors.textSecondary;
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

  const getDifficultyTranslation = (difficulty: string): string => {
    let result: string = '';
    switch (difficulty) {
      case 'BEGINNER':
        result = t('classes.difficulty.beginner') || '';
        break;
      case 'INTERMEDIATE':
        result = t('classes.difficulty.intermediate') || '';
        break;
      case 'ADVANCED':
        result = t('classes.difficulty.advanced') || '';
        break;
      case 'ALL_LEVELS':
        result = t('classes.difficulty.all_levels') || '';
        break;
      default:
        result = difficulty || t('classes.difficulty.all_levels') || '';
    }
    return result || '';
  };

  const getStatusTranslation = (status: string): string => {
    let result: string = '';
    switch (status) {
      case 'SCHEDULED':
        result = t('classes.status.scheduled') || '';
        break;
      case 'IN_PROGRESS':
        result = t('classes.status.inProgress') || '';
        break;
      case 'COMPLETED':
        result = t('classes.status.completed') || '';
        break;
      case 'CANCELLED':
        result = t('classes.status.cancelled') || '';
        break;
      default:
        result = status || t('classes.status.scheduled') || '';
    }
    return result || '';
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

  const isFullyBooked =
    (schedule.current_bookings ?? 0) >= (schedule.max_capacity ?? 0);
  const hasWaitlist = (schedule.waitlist_count ?? 0) > 0;
  const spotsAvailable =
    (schedule.max_capacity ?? 0) - (schedule.current_bookings ?? 0);

  const isBooked = userBooking?.status === 'CONFIRMED';
  const isWaitlisted =
    userBooking?.is_waitlist === true ||
    userBooking?.is_waitlist ||
    userBooking?.status === 'WAITLIST';

  // Check booking deadline: Cannot book within 1.5 hours (90 minutes) before class starts
  const now = new Date();
  const startTime = schedule.start_time ? new Date(schedule.start_time) : null;
  const deadlineMinutes = 90; // 1.5 hours = 90 minutes
  const deadlineMs = deadlineMinutes * 60 * 1000;
  
  let isBookingDeadlinePassed = false;
  let timeUntilDeadline: number | null = null;
  let remainingMinutes: number | null = null;
  
  if (startTime) {
    const timeUntilStart = startTime.getTime() - now.getTime();
    timeUntilDeadline = timeUntilStart - deadlineMs;
    remainingMinutes = timeUntilDeadline > 0 ? Math.ceil(timeUntilDeadline / (60 * 1000)) : null;
    
    // Deadline passed if class starts within 90 minutes (and hasn't started yet)
    isBookingDeadlinePassed = timeUntilStart > 0 && timeUntilStart < deadlineMs;
  }

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
              {
                backgroundColor:
                  (getStatusColor(schedule.status) ||
                    theme.colors.textSecondary) + 'E6',
              },
            ]}
          >
            <View
              style={[
                themedStyles.statusIndicator,
                { backgroundColor: theme.colors.textInverse },
              ]}
            />
            <Text style={themedStyles.statusText}>
              {String(getStatusTranslation(schedule.status || '') || '')}
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
              {String(schedule.gym_class?.name || '')}
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
                {String(
                  getDifficultyTranslation(
                    schedule.gym_class?.difficulty || ''
                  ) || ''
                )}
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
            {String(schedule.gym_class?.description || '')}
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
                    {t('classes.trainer') || 'Huấn luyện viên'}
                  </Text>
                  <Text
                    style={[
                      themedStyles.infoValue,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {String(schedule.trainer?.full_name || '')}
                  </Text>
                  {schedule.trainer?.rating_average != null &&
                    schedule.trainer.rating_average > 0 && (
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
                          {String(schedule.trainer.rating_average.toFixed(1))}
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
                  {t('classes.time') || 'Thời gian'}
                </Text>
                <Text
                  style={[themedStyles.infoValue, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {(() => {
                    const startTime = formatTime(schedule.start_time);
                    const endTime = formatTime(schedule.end_time);
                    if (startTime && endTime) {
                      return `${startTime} - ${endTime}`;
                    } else if (startTime) {
                      return startTime;
                    } else if (endTime) {
                      return endTime;
                    }
                    return '';
                  })()}
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
                    {t('classes.location') || 'Địa điểm'}
                  </Text>
                  <Text
                    style={[
                      themedStyles.infoValue,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {String(schedule.room?.name || '')}
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
                  {t('classes.capacity') || 'Sức chứa'}
                </Text>
                <Text
                  style={[themedStyles.infoValue, { color: theme.colors.text }]}
                >
                  {String(schedule.current_bookings ?? 0)}/
                  {String(schedule.max_capacity ?? 0)}
                </Text>
                {isFullyBooked && (
                  <Text
                    style={[
                      themedStyles.infoSubtext,
                      { color: theme.colors.warning },
                    ]}
                  >
                    {hasWaitlist
                      ? `${String(schedule.waitlist_count ?? 0)} ${String(
                          t('classes.onWaitlist') || 'đang chờ'
                        )}`
                      : String(t('classes.booking.fullyBooked') || 'Đã đầy')}
                  </Text>
                )}
                {!isFullyBooked && spotsAvailable <= 5 && (
                  <Text
                    style={[
                      themedStyles.infoSubtext,
                      { color: theme.colors.error },
                    ]}
                  >
                    {(() => {
                      const translated = t('classes.onlySpotsLeft', {
                        count: Math.max(0, spotsAvailable ?? 0),
                      });
                      return String(
                        translated && typeof translated === 'string'
                          ? translated
                          : `${Math.max(0, spotsAvailable ?? 0)} chỗ còn lại`
                      );
                    })()}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Price */}
          {schedule.price_override && (
            <View style={themedStyles.priceContainer}>
              <Text
                style={[
                  themedStyles.priceText,
                  { color: theme.colors.primary },
                ]}
              >
                {String(t('common.currencySymbol') || '₫')}
                {String(schedule.price_override ?? 0)}
              </Text>
            </View>
          )}

          {/* Action Button - Full width, square */}
          {(() => {
            const shouldShow =
              showBookingActions &&
              (schedule.status === 'SCHEDULED' ||
                String(schedule.status) === 'IN_PROGRESS');
            console.log('[ACTION_BUTTON_DEBUG]', {
              showBookingActions,
              scheduleStatus: schedule.status,
              scheduleStatusString: String(schedule.status),
              shouldShow,
              hasUserBooking: !!userBooking,
            });
            return shouldShow;
          })() && (
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
                          {t('classes.booking.pendingPayment') ||
                            'Chờ thanh toán'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  // If booking is cancelled, allow re-booking
                  if (userBooking.status === 'CANCELLED') {
                    // Check if booking deadline has passed
                    if (isBookingDeadlinePassed) {
                      return (
                        <View
                          style={[
                            themedStyles.actionButton,
                            {
                              backgroundColor: theme.colors.textSecondary + '20',
                              borderWidth: 1,
                              borderColor: theme.colors.textSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              themedStyles.actionButtonText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {t('classes.booking.deadlinePassed') ||
                              'Hết thời gian đăng ký'}
                          </Text>
                        </View>
                      );
                    }
                    
                    // Show book button if class is not fully booked
                    if (!isFullyBooked && onBook) {
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
                            {t('classes.booking.book') || 'Đặt lịch ngay'}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    // If class is fully booked, show waitlist button
                    if (onBook) {
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
                            {t('classes.joinWaitlist') ||
                              'Tham gia danh sách chờ'}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    // Fallback: show cancelled status if no onBook handler
                    return (
                      <View
                        style={[
                          themedStyles.actionButton,
                          {
                            backgroundColor: theme.colors.error + '20',
                            borderWidth: 1,
                            borderColor: theme.colors.error,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            themedStyles.actionButtonText,
                            { color: theme.colors.error },
                          ]}
                        >
                          {t('classes.status.cancelled') || 'Đã hủy'}
                        </Text>
                      </View>
                    );
                  }

                  if (
                    (paymentStatus === 'PAID' ||
                      paymentStatus === 'COMPLETED') &&
                    isBooked
                  ) {
                    console.log('[PAID_BOOKING_DEBUG]', {
                      paymentStatus,
                      isBooked,
                      scheduleStatus: schedule.status,
                      hasOnScanQR: !!onScanQR,
                    });
                    // Check if schedule is upcoming or ongoing (within check-in time window)
                    const now = new Date();
                    const startTime = schedule.start_time
                      ? new Date(schedule.start_time)
                      : null;
                    const endTime = schedule.end_time
                      ? new Date(schedule.end_time)
                      : null;
                    const tenMinBefore = startTime
                      ? new Date(startTime.getTime() - 10 * 60 * 1000)
                      : null;
                    const tenMinAfter = endTime
                      ? new Date(endTime.getTime() + 10 * 60 * 1000)
                      : null;

                    // Check-in allowed: 10 minutes before start time until end time
                    // Note: We show the button even if check_in_enabled is false,
                    // as trainer might enable it later. The backend will validate.
                    const canCheckIn =
                      startTime &&
                      endTime &&
                      tenMinBefore &&
                      now >= tenMinBefore &&
                      now <= endTime;

                    // Check-out allowed: from end time until 10 minutes after end time
                    const canCheckOut =
                      endTime &&
                      tenMinAfter &&
                      now >= endTime &&
                      now <= tenMinAfter;

                    // Show QR button if schedule is upcoming/ongoing and onScanQR is provided
                    // Show for any confirmed booking that's within check-in/check-out window
                    // Also show if schedule is within 1 hour before start (more lenient)
                    // OR if schedule status is IN_PROGRESS (class is currently happening)
                    const oneHourBefore = startTime
                      ? new Date(startTime.getTime() - 60 * 60 * 1000)
                      : null;
                    const isScheduleOngoing =
                      String(schedule.status) === 'IN_PROGRESS';
                    const isUpcomingOrOngoing =
                      isScheduleOngoing ||
                      (startTime &&
                        ((oneHourBefore && now >= oneHourBefore) ||
                          canCheckIn ||
                          canCheckOut));

                    const showQRButton = isUpcomingOrOngoing && onScanQR;

                    // Debug logging
                    if (
                      isBooked &&
                      (paymentStatus === 'PAID' ||
                        paymentStatus === 'COMPLETED')
                    ) {
                      console.log('[QR_BUTTON_DEBUG]', {
                        scheduleStatus: schedule.status,
                        isScheduleOngoing,
                        canCheckIn,
                        canCheckOut,
                        isUpcomingOrOngoing,
                        hasOnScanQR: !!onScanQR,
                        showQRButton,
                        check_in_enabled: schedule.check_in_enabled,
                        now: now.toISOString(),
                        startTime: startTime?.toISOString(),
                        endTime: endTime?.toISOString(),
                        oneHourBefore: oneHourBefore?.toISOString(),
                        bookingStatus: userBooking?.status,
                        paymentStatus,
                      });
                    }

                    // Show cancel button if onCancel is provided, otherwise show enrolled status
                    if (onCancel) {
                      return (
                        <View style={themedStyles.actions}>
                          {showQRButton && (
                            <TouchableOpacity
                              style={[
                                themedStyles.actionButton,
                                {
                                  backgroundColor: theme.colors.primary,
                                  marginBottom: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                },
                              ]}
                              onPress={onScanQR}
                              activeOpacity={0.8}
                            >
                              <QrCode
                                size={16}
                                color={theme.colors.textInverse}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={[
                                  themedStyles.actionButtonText,
                                  { color: theme.colors.textInverse },
                                ]}
                              >
                                {canCheckIn
                                  ? t('attendance.scanQRCheckIn') ||
                                    'Quét QR điểm danh'
                                  : t('attendance.scanQRCheckOut') ||
                                    'Quét QR check-out'}
                              </Text>
                            </TouchableOpacity>
                          )}
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
                              {t('classes.booking.cancelBooking') ||
                                'Hủy đặt lịch'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    // Show QR button if available, otherwise show enrolled status
                    if (showQRButton) {
                      return (
                        <TouchableOpacity
                          style={[
                            themedStyles.actionButton,
                            {
                              backgroundColor: theme.colors.primary,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                            },
                          ]}
                          onPress={onScanQR}
                          activeOpacity={0.8}
                        >
                          <QrCode
                            size={16}
                            color={theme.colors.textInverse}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              themedStyles.actionButtonText,
                              { color: theme.colors.textInverse },
                            ]}
                          >
                            {canCheckIn
                              ? t('attendance.scanQRCheckIn') ||
                                'Quét QR điểm danh'
                              : t('attendance.scanQRCheckOut') ||
                                'Quét QR check-out'}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

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
                          {t('classes.booking.alreadyEnrolled') ||
                            'Đã thuộc lớp học'}
                        </Text>
                      </View>
                    );
                  }

                  if (
                    isWaitlisted ||
                    userBooking.is_waitlist ||
                    userBooking.status === 'WAITLIST'
                  ) {
                    const waitlistPos = userBooking.waitlist_position;
                    let waitlistText = '';
                    if (waitlistPos) {
                      const translated = t(
                        'classes.booking.onWaitlistWithPosition',
                        { position: waitlistPos }
                      );
                      waitlistText =
                        translated && typeof translated === 'string'
                          ? translated
                          : `Đang ở danh sách chờ (Vị trí ${waitlistPos})`;
                    } else {
                      const translated = t('classes.booking.onWaitlist');
                      waitlistText =
                        translated && typeof translated === 'string'
                          ? translated
                          : 'Đang ở danh sách chờ';
                    }
                    return (
                      <TouchableOpacity
                        style={[
                          themedStyles.actionButton,
                          {
                            backgroundColor: theme.colors.warning + '20',
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
                          {waitlistText}
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
                        {t('classes.booking.cancel') || 'Hủy'}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                // Check if booking deadline has passed
                if (isBookingDeadlinePassed) {
                  return (
                    <View
                      style={[
                        themedStyles.actionButton,
                        {
                          backgroundColor: theme.colors.textSecondary + '20',
                          borderWidth: 1,
                          borderColor: theme.colors.textSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          themedStyles.actionButtonText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {remainingMinutes !== null && remainingMinutes > 0
                          ? t('classes.booking.deadlineSoon', {
                              minutes: remainingMinutes,
                            }) ||
                            `Còn ${remainingMinutes} phút để đăng ký`
                          : t('classes.booking.deadlinePassed') ||
                            'Hết thời gian đăng ký'}
                      </Text>
                    </View>
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
                        {t('classes.booking.book') || 'Đặt lịch ngay'}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                // If fully booked, check deadline before showing waitlist button
                if (isBookingDeadlinePassed) {
                  return (
                    <View
                      style={[
                        themedStyles.actionButton,
                        {
                          backgroundColor: theme.colors.textSecondary + '20',
                          borderWidth: 1,
                          borderColor: theme.colors.textSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          themedStyles.actionButtonText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('classes.booking.deadlinePassed') ||
                          'Hết thời gian đăng ký'}
                      </Text>
                    </View>
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
                      {t('classes.joinWaitlist') || 'Tham gia danh sách chờ'}
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
