import {
  BookingModalProps,
  ClassCategory,
  CreateBookingRequest,
} from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Calendar, Clock, MapPin, Star, Users, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function BookingModal({
  visible,
  schedule,
  onClose,
  onConfirm,
  loading = false,
  userBooking,
}: BookingModalProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [notes, setNotes] = useState('');

  const themedStyles = styles(theme);

  // Import local images for categories (same as class detail)
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

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24-hour format for Vietnam
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateScheduleDuration = (
    startTime: string,
    endTime: string
  ): number => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    return diffMinutes;
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes <= 0) return '';
    if (minutes < 60) {
      return `${minutes} ${t('classes.minutes') || 'phút'}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${t('classes.hours') || 'giờ'}`;
    }
    return `${hours} ${t('classes.hours') || 'giờ'} ${remainingMinutes} ${
      t('classes.minutes') || 'phút'
    }`;
  };

  const formatPrice = (price: number | string | null | undefined) => {
    if (!price) return '0 ₫';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const getCategoryTranslation = (category: ClassCategory | string) => {
    switch (category) {
      case ClassCategory.CARDIO:
        return t('classes.categories.cardio');
      case ClassCategory.STRENGTH:
        return t('classes.categories.strength');
      case ClassCategory.YOGA:
        return t('classes.categories.yoga');
      case ClassCategory.PILATES:
        return t('classes.categories.pilates');
      case ClassCategory.DANCE:
        return t('classes.categories.dance');
      case ClassCategory.MARTIAL_ARTS:
        return t('classes.categories.martialArts');
      case ClassCategory.AQUA:
        return t('classes.categories.aqua');
      case ClassCategory.FUNCTIONAL:
        return t('classes.categories.functional');
      case ClassCategory.RECOVERY:
        return t('classes.categories.recovery');
      case ClassCategory.SPECIALIZED:
        return t('classes.categories.specialized');
      default:
        return category;
    }
  };

  const handleConfirm = () => {
    if (!schedule || loading) return;

    // Prevent booking if user already has a pending payment booking
    if (userBooking?.payment_status === 'PENDING') {
      return;
    }

    // Prevent booking if user already enrolled
    if (
      userBooking &&
      (userBooking.payment_status === 'PAID' ||
        userBooking.payment_status === 'COMPLETED') &&
      userBooking.status === 'CONFIRMED'
    ) {
      return;
    }

    const bookingData: CreateBookingRequest = {
      schedule_id: schedule.id,
      special_needs: specialNeeds.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onConfirm(bookingData);
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing while loading
    setSpecialNeeds('');
    setNotes('');
    onClose();
  };

  const isFullyBooked = schedule.current_bookings >= schedule.max_capacity;
  const spotsAvailable = schedule.max_capacity - schedule.current_bookings;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            themedStyles.header,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <Text style={[themedStyles.title, { color: theme.colors.text }]}>
            {isFullyBooked
              ? t('classes.joinWaitlist')
              : t('classes.booking.confirmBooking')}
          </Text>
          <TouchableOpacity
            style={themedStyles.closeButton}
            onPress={handleClose}
            disabled={loading}
            activeOpacity={loading ? 1 : 0.7}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textSecondary}
              />
            ) : (
              <X size={24} color={theme.colors.text} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={themedStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Class Info */}
          <View style={themedStyles.classInfo}>
            <Image
              source={(() => {
                const category = schedule.gym_class?.category;
                // Use local image if category exists in classImages
                if (category && classImages[category]) {
                  return classImages[category];
                }
                // Use thumbnail URL if available
                if (schedule.gym_class?.thumbnail) {
                  return { uri: schedule.gym_class.thumbnail };
                }
                // Fallback to default category image or default placeholder
                return (
                  classImages.CARDIO || {
                    uri: 'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
                  }
                );
              })()}
              style={themedStyles.classImage}
              resizeMode="cover"
            />
            <View style={themedStyles.classDetails}>
              <Text
                style={[themedStyles.className, { color: theme.colors.text }]}
              >
                {schedule.gym_class?.name}
              </Text>
              <Text
                style={[
                  themedStyles.classCategory,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {getCategoryTranslation(schedule.gym_class?.category || '')}
              </Text>
              <Text
                style={[
                  themedStyles.classDuration,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {formatDuration(
                  calculateScheduleDuration(
                    schedule.start_time,
                    schedule.end_time
                  )
                )}
              </Text>
              {(schedule.price_override || schedule.gym_class?.price) && (
                <Text
                  style={[
                    themedStyles.classPrice,
                    { color: theme.colors.primary },
                  ]}
                >
                  {formatPrice(
                    schedule.price_override || schedule.gym_class?.price
                  )}
                </Text>
              )}
            </View>
          </View>

          {/* Schedule Details */}
          <View
            style={[
              themedStyles.scheduleDetails,
              {
                backgroundColor: theme.colors.surface,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[themedStyles.sectionTitle, { color: theme.colors.text }]}
            >
              {t('classes.classDetails')}
            </Text>

            <View style={themedStyles.detailRow}>
              <View
                style={[
                  themedStyles.iconContainer,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <Calendar size={18} color={theme.colors.primary} />
              </View>
              <Text
                style={[themedStyles.detailText, { color: theme.colors.text }]}
              >
                {formatDate(schedule.start_time)}
              </Text>
            </View>

            <View style={themedStyles.detailRow}>
              <View
                style={[
                  themedStyles.iconContainer,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <Clock size={18} color={theme.colors.primary} />
              </View>
              <Text
                style={[themedStyles.detailText, { color: theme.colors.text }]}
              >
                {formatTime(schedule.start_time)} -{' '}
                {formatTime(schedule.end_time)}
              </Text>
            </View>

            <View style={themedStyles.detailRow}>
              <View
                style={[
                  themedStyles.iconContainer,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <MapPin size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    themedStyles.detailText,
                    { color: theme.colors.text },
                  ]}
                >
                  {schedule.room?.name}
                </Text>
                {schedule.room?.area_sqm && (
                  <Text
                    style={[
                      themedStyles.detailSubtext,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {schedule.room.area_sqm} m²
                  </Text>
                )}
              </View>
            </View>

            <View style={themedStyles.detailRow}>
              <View
                style={[
                  themedStyles.iconContainer,
                  {
                    backgroundColor: isFullyBooked
                      ? theme.colors.error + '15'
                      : theme.colors.primary + '15',
                  },
                ]}
              >
                <Users
                  size={18}
                  color={
                    isFullyBooked ? theme.colors.error : theme.colors.primary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    themedStyles.detailText,
                    { color: theme.colors.text },
                  ]}
                >
                  {schedule.current_bookings}/{schedule.max_capacity}{' '}
                  {t('classes.booked')}
                </Text>
                {!isFullyBooked && spotsAvailable > 0 && (
                  <Text
                    style={[
                      themedStyles.detailSubtext,
                      {
                        color:
                          spotsAvailable <= 5
                            ? theme.colors.error
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {spotsAvailable} {t('classes.spotsAvailable')}
                  </Text>
                )}
                {isFullyBooked && schedule.waitlist_count > 0 && (
                  <Text
                    style={[
                      themedStyles.detailSubtext,
                      { color: theme.colors.warning },
                    ]}
                  >
                    {schedule.waitlist_count} {t('classes.onWaitlist')}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Trainer Info */}
          {schedule.trainer && (
            <View
              style={[
                themedStyles.trainerInfo,
                {
                  backgroundColor: theme.colors.surface,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.secondary,
                },
              ]}
            >
              <Text
                style={[
                  themedStyles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                {t('classes.trainer')}
              </Text>
              <View style={themedStyles.trainerDetails}>
                <View style={themedStyles.trainerContent}>
                  <Text
                    style={[
                      themedStyles.trainerName,
                      { color: theme.colors.text },
                    ]}
                  >
                    {schedule.trainer.full_name}
                  </Text>
                  {schedule.trainer.rating_average && (
                    <View style={themedStyles.ratingContainer}>
                      <Star
                        size={16}
                        color={theme.colors.warning}
                        fill={theme.colors.warning}
                      />
                      <Text
                        style={[
                          themedStyles.ratingText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {schedule.trainer.rating_average.toFixed(1)}
                      </Text>
                      <Text
                        style={[
                          themedStyles.ratingText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        ({schedule.trainer.total_classes} {t('classes.classes')}
                        )
                      </Text>
                    </View>
                  )}
                  {schedule.trainer.bio && (
                    <Text
                      style={[
                        themedStyles.trainerBio,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {schedule.trainer.bio}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Special Requirements */}
          <View
            style={[
              themedStyles.requirementsSection,
              {
                backgroundColor: theme.colors.surface,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.info,
              },
            ]}
          >
            <Text
              style={[themedStyles.sectionTitle, { color: theme.colors.text }]}
            >
              {t('classes.specialRequirements')}
            </Text>
            <TextInput
              style={[
                themedStyles.textInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={t('classes.specialNeedsPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={specialNeeds}
              onChangeText={setSpecialNeeds}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Additional Notes */}
          <View
            style={[
              themedStyles.notesSection,
              {
                backgroundColor: theme.colors.surface,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.warning,
              },
            ]}
          >
            <Text
              style={[themedStyles.sectionTitle, { color: theme.colors.text }]}
            >
              {t('classes.additionalNotes')}
            </Text>
            <TextInput
              style={[
                themedStyles.textInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={t('classes.additionalNotesPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Booking Terms */}
          <View style={themedStyles.termsSection}>
            <Text
              style={[
                themedStyles.termsText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('classes.bookingTerms')}
              {isFullyBooked && ` ${t('classes.waitlistNotice')}`}
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View
          style={[
            themedStyles.actions,
            { borderTopColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              themedStyles.cancelButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text
              style={[
                themedStyles.cancelButtonText,
                { color: theme.colors.text },
              ]}
            >
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              themedStyles.confirmButton,
              {
                backgroundColor:
                  loading ||
                  userBooking?.payment_status === 'PENDING' ||
                  (userBooking &&
                    (userBooking.payment_status === 'PAID' ||
                      userBooking.payment_status === 'COMPLETED') &&
                    userBooking.status === 'CONFIRMED')
                    ? theme.colors.disabled || theme.colors.primary + '80'
                    : theme.colors.primary,
              },
            ]}
            onPress={handleConfirm}
            disabled={
              loading ||
              userBooking?.payment_status === 'PENDING' ||
              (userBooking &&
                (userBooking.payment_status === 'PAID' ||
                  userBooking.payment_status === 'COMPLETED') &&
                userBooking.status === 'CONFIRMED')
            }
            activeOpacity={
              loading || userBooking?.payment_status === 'PENDING' ? 1 : 0.8
            }
          >
            {loading ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <ActivityIndicator
                  color={theme.colors.textInverse}
                  size="small"
                />
                <Text
                  style={[
                    themedStyles.confirmButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('common.processing')}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  themedStyles.confirmButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {isFullyBooked
                  ? t('classes.joinWaitlist')
                  : t('classes.booking.book')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      ...theme.shadows.sm,
    },
    title: {
      ...Typography.h5,
      fontWeight: '600',
    },
    closeButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.radius.round,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    classInfo: {
      flexDirection: 'row',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      ...theme.shadows.sm,
    },
    classImage: {
      width: 88,
      height: 88,
      borderRadius: theme.radius.md,
      marginRight: theme.spacing.md,
    },
    classDetails: {
      flex: 1,
      justifyContent: 'center',
    },
    className: {
      ...Typography.h6,
      marginBottom: theme.spacing.xs,
      fontWeight: '600',
    },
    classCategory: {
      ...Typography.bodySmall,
      marginBottom: theme.spacing.xs - 2,
      opacity: 0.8,
    },
    classDuration: {
      ...Typography.bodySmall,
      marginBottom: theme.spacing.xs - 2,
      opacity: 0.8,
    },
    classPrice: {
      ...Typography.bodyMedium,
      marginTop: theme.spacing.xs,
      fontWeight: '600',
    },
    scheduleDetails: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      ...theme.shadows.sm,
    },
    sectionTitle: {
      ...Typography.h6,
      marginBottom: theme.spacing.md,
      fontWeight: '600',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    detailText: {
      ...Typography.bodyMedium,
      flex: 1,
      lineHeight: 22,
    },
    detailSubtext: {
      ...Typography.bodySmall,
      marginTop: 4,
      lineHeight: 18,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trainerInfo: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      ...theme.shadows.sm,
    },
    trainerDetails: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    trainerContent: {
      flex: 1,
    },
    trainerName: {
      ...Typography.h6,
      marginBottom: theme.spacing.xs,
      fontWeight: '600',
    },
    trainerBio: {
      ...Typography.bodySmall,
      marginBottom: theme.spacing.sm,
      lineHeight: 20,
      opacity: 0.8,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    ratingText: {
      ...Typography.bodySmall,
      opacity: 0.9,
    },
    requirementsSection: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      ...theme.shadows.sm,
    },
    notesSection: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      ...theme.shadows.sm,
    },
    textInput: {
      borderWidth: 1.5,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      ...Typography.bodyMedium,
      minHeight: 90,
      lineHeight: 22,
      marginTop: theme.spacing.sm,
    },
    termsSection: {
      marginBottom: theme.spacing.xl,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface + '80',
      borderRadius: theme.radius.md,
    },
    termsText: {
      ...Typography.caption,
      lineHeight: 18,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      borderTopWidth: 1,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
      ...theme.shadows.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      ...Typography.buttonMedium,
      fontWeight: '600',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.md,
    },
    confirmButtonText: {
      ...Typography.buttonMedium,
      fontWeight: '600',
    },
  });
