import BookingModal from '@/components/BookingModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  bookingService,
  scheduleService,
  type CreateBookingRequest,
  type Schedule,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Share,
  Star,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClassDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State for data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);

  // UI state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadScheduleData();
    }
  }, [id]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📅 Loading schedule data for ID:', id);

      if (!user?.id) {
        setError('Please login to view class details');
        return;
      }

      // Load schedule details
      const scheduleResponse = await scheduleService.getScheduleById(id!);

      if (scheduleResponse.success && scheduleResponse.data) {
        console.log('✅ Schedule loaded:', scheduleResponse.data);
        setSchedule(scheduleResponse.data);

        // Check if user has booked this schedule
        const bookingsResponse = await bookingService.getMemberBookings(
          user.id
        );
        if (bookingsResponse.success && bookingsResponse.data) {
          const userBooking = bookingsResponse.data.find(
            (booking) => booking.schedule_id === id
          );
          if (userBooking) {
            setIsBooked(userBooking.status === 'CONFIRMED');
            setIsWaitlisted(userBooking.status === 'WAITLIST');
          }
        }
      } else {
        console.log('❌ Failed to load schedule:', scheduleResponse.error);
        setError(scheduleResponse.error || 'Failed to load class details');
      }
    } catch (err: any) {
      console.error('❌ Error loading schedule data:', err);
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookClass = () => {
    if (!schedule) return;
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (bookingData: CreateBookingRequest) => {
    try {
      console.log('📅 Creating booking:', bookingData);

      const response = await bookingService.createBooking(bookingData);

      if (response.success) {
        console.log('✅ Booking created successfully');
        setShowBookingModal(false);
        Alert.alert(t('common.success'), t('classes.booking.bookingSuccess'));
        // Update local state
        setIsBooked(true);
        setIsWaitlisted(false);
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('classes.booking.bookingFailed')
        );
      }
    } catch (error: any) {
      console.error('❌ Error creating booking:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('classes.booking.bookingFailed')
      );
    }
  };

  const handleCancelBooking = async () => {
    if (!schedule || !user?.id) return;

    try {
      // Find user's booking for this schedule
      const bookingsResponse = await bookingService.getMemberBookings(user.id);
      if (bookingsResponse.success && bookingsResponse.data) {
        const userBooking = bookingsResponse.data.find(
          (booking) => booking.schedule_id === schedule.id
        );

        if (userBooking) {
          const cancelResponse = await bookingService.cancelBooking(
            userBooking.id
          );
          if (cancelResponse.success) {
            Alert.alert(
              t('common.success'),
              t('classes.booking.bookingCancelled')
            );
            setIsBooked(false);
            setIsWaitlisted(false);
          } else {
            Alert.alert(
              'Error',
              cancelResponse.error || 'Failed to cancel booking'
            );
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error cancelling booking:', error);
      Alert.alert('Error', error.message || 'Failed to cancel booking');
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite functionality
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert(t('classes.share'), t('classes.shareComingSoon'));
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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

  const isFullyBooked = schedule
    ? schedule.current_bookings >= schedule.max_capacity
    : false;
  const spotsAvailable = schedule
    ? schedule.max_capacity - schedule.current_bookings
    : 0;

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('classes.loadingClasses')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !schedule) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || t('classes.classNotFound')}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.back()}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('common.goBack')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Class Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleToggleFavorite}
          >
            <Heart
              size={24}
              color={isFavorite ? theme.colors.error : theme.colors.text}
              fill={isFavorite ? theme.colors.error : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
            <Share size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class Image */}
        <Image
          source={{
            uri:
              schedule.gym_class?.thumbnail ||
              'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
          }}
          style={styles.classImage}
          resizeMode="cover"
        />

        {/* Class Info */}
        <View style={styles.classInfo}>
          <Text style={[styles.className, { color: theme.colors.text }]}>
            {schedule.gym_class?.name}
          </Text>
          <Text
            style={[
              styles.classCategory,
              { color: theme.colors.textSecondary },
            ]}
          >
            {schedule.gym_class?.category}
          </Text>
          <Text style={[styles.classDescription, { color: theme.colors.text }]}>
            {schedule.gym_class?.description}
          </Text>
        </View>

        {/* Schedule Details */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('classes.scheduleDetails')}
          </Text>

          <View style={styles.detailRow}>
            <Calendar size={20} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {formatDate(schedule.start_time)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={20} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {formatTime(schedule.start_time)} -{' '}
              {formatTime(schedule.end_time)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {schedule.room?.name}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Users size={20} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {schedule.current_bookings}/{schedule.max_capacity}{' '}
              {t('classes.booked')}
              {!isFullyBooked &&
                ` (${spotsAvailable} ${t('classes.spotsAvailable')})`}
            </Text>
          </View>
        </View>

        {/* Trainer Info */}
        {schedule.trainer && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Trainer
            </Text>
            <View style={styles.trainerInfo}>
              <View style={styles.trainerDetails}>
                <Text
                  style={[styles.trainerName, { color: theme.colors.text }]}
                >
                  {schedule.trainer.full_name}
                </Text>
                <Text
                  style={[
                    styles.trainerExperience,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {schedule.trainer.experience_years} years experience
                </Text>
                {schedule.trainer.rating_average && (
                  <View style={styles.ratingContainer}>
                    <Star
                      size={16}
                      color={theme.colors.warning}
                      fill={theme.colors.warning}
                    />
                    <Text
                      style={[
                        styles.ratingText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {schedule.trainer.rating_average.toFixed(1)} (
                      {schedule.trainer.total_classes} classes)
                    </Text>
                  </View>
                )}
                {schedule.trainer.bio && (
                  <Text
                    style={[styles.trainerBio, { color: theme.colors.text }]}
                  >
                    {schedule.trainer.bio}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Class Requirements */}
        {schedule.gym_class?.equipment_needed &&
          schedule.gym_class.equipment_needed.length > 0 && (
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('classes.equipmentNeeded')}
              </Text>
              <View style={styles.equipmentList}>
                {schedule.gym_class.equipment_needed.map((equipment, index) => (
                  <View
                    key={index}
                    style={[
                      styles.equipmentItem,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.equipmentText,
                        { color: theme.colors.text },
                      ]}
                    >
                      {equipment}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Special Notes */}
        {schedule.special_notes && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('classes.specialNotes')}
            </Text>
            <Text style={[styles.notesText, { color: theme.colors.text }]}>
              {schedule.special_notes}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
        {isBooked ? (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.error }]}
            onPress={handleCancelBooking}
          >
            <Text
              style={[styles.cancelButtonText, { color: theme.colors.error }]}
            >
              {t('classes.booking.cancelBooking')}
            </Text>
          </TouchableOpacity>
        ) : isWaitlisted ? (
          <TouchableOpacity
            style={[
              styles.waitlistButton,
              { backgroundColor: theme.colors.warning },
            ]}
            onPress={handleCancelBooking}
          >
            <Text
              style={[
                styles.waitlistButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('classes.booking.removeFromWaitlist')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.bookButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleBookClass}
            disabled={isFullyBooked}
          >
            <Text
              style={[
                styles.bookButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {isFullyBooked
                ? t('classes.booking.fullyBooked')
                : t('classes.booking.book')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Booking Modal */}
      {schedule && (
        <BookingModal
          visible={showBookingModal}
          schedule={schedule}
          onClose={() => setShowBookingModal(false)}
          onConfirm={handleBookingConfirm}
          loading={false}
        />
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerAction: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  classImage: {
    width: '100%',
    height: 200,
  },
  classInfo: {
    padding: 20,
  },
  className: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  classCategory: {
    fontSize: 16,
    marginBottom: 8,
  },
  classDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerExperience: {
    fontSize: 14,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  trainerBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  equipmentText: {
    fontSize: 14,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  bookButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waitlistButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  waitlistButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
