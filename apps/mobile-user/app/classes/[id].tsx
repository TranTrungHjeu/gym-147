import BookingModal from '@/components/BookingModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  bookingService,
  favoriteService,
  scheduleService,
  type CreateBookingRequest,
  type Schedule,
} from '@/services';
import { paymentService } from '@/services/billing/payment.service';
import {
  Booking,
  ClassCategory,
  Difficulty,
  FavoriteType,
} from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  MapPin,
  Share2 as ShareIcon,
  Star,
  Timer,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import local images for categories
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

export default function ClassDetailScreen() {
  const { theme } = useTheme();
  const { user, member, loadMemberProfile } = useAuth(); // Get member.id from AuthContext
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State for data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [userBooking, setUserBooking] = useState<Booking | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [bankTransferId, setBankTransferId] = useState<string | null>(null);

  // UI state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [trainerAvatarError, setTrainerAvatarError] = useState(false);

  // Load member profile if not already loaded (when user logs in)
  useEffect(() => {
    if (user?.id && !member?.id) {
      loadMemberProfile();
    }
  }, [user?.id, member?.id]);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadScheduleData();
    }
  }, [id]);

  // Reset trainer avatar error when trainer changes
  useEffect(() => {
    setTrainerAvatarError(false);
  }, [schedule?.trainer?.id]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setError('Please login to view class details');
        return;
      }

      // Validate id exists
      if (!id) {
        setError('Schedule ID is required');
        setLoading(false);
        return;
      }

      // Load schedule details first
      const scheduleResponse = await scheduleService.getScheduleById(id);

      if (!scheduleResponse.success || !scheduleResponse.data) {
        setError(scheduleResponse.error || 'Không tìm thấy lớp học');
        setLoading(false);
        return;
      }

      setSchedule(scheduleResponse.data);

      // Load bookings and favorite status in parallel (after schedule is loaded)
      // Only check favorite if class_id is valid
      const classId =
        scheduleResponse.data?.gym_class?.id || scheduleResponse.data?.class_id;
      const favoriteCheckPromise =
        classId && classId.trim()
          ? favoriteService
              .checkFavorite(user.id, FavoriteType.CLASS, classId)
              .catch(() => ({
                success: false,
                error: 'Failed to check favorite',
              }))
          : Promise.resolve({ success: false, error: 'Invalid class ID' });

      // Use member.id from AuthContext (not user.id) for getMemberBookings
      const memberIdForBookings = member?.id || user.id;

      const [bookingsResponse, favoriteResponse] = await Promise.all([
        bookingService.getMemberBookings(memberIdForBookings),
        favoriteCheckPromise,
      ]);

      console.log('📅 Bookings response:', {
        success: bookingsResponse.success,
        bookingsCount: bookingsResponse.data?.length || 0,
        bookings: bookingsResponse.data?.map((b) => ({
          id: b.id,
          schedule_id: b.schedule_id,
          status: b.status,
          payment_status: b.payment_status,
        })),
        currentScheduleId: id,
      });

      // Check if user has booked this schedule
      if (bookingsResponse.success && bookingsResponse.data) {
        const foundBooking = bookingsResponse.data.find(
          (booking) => booking.schedule_id === id || booking.schedule?.id === id
        );

        console.log('🔍 Found booking check:', {
          foundBooking: !!foundBooking,
          bookingId: foundBooking?.id,
          bookingScheduleId: foundBooking?.schedule_id,
          scheduleIdInBooking: foundBooking?.schedule?.id,
          currentScheduleId: id,
          payment_status: foundBooking?.payment_status,
          status: foundBooking?.status,
        });
        if (foundBooking) {
          // Set foundBooking first (it already has payment_status)
          setUserBooking(foundBooking);
          setIsBooked(foundBooking.status === 'CONFIRMED');
          setIsWaitlisted(foundBooking.status === 'WAITLIST');

          // If payment_status is PENDING, try to fetch full booking details for payment_id
          if (
            foundBooking.payment_status === 'PENDING' ||
            foundBooking.payment_status?.toUpperCase() === 'PENDING'
          ) {
            // Try to fetch full booking details to get payment_id
            if (foundBooking.id) {
              try {
                const bookingDetailResponse =
                  await bookingService.getBookingById(foundBooking.id);

                // Only use fullBooking if it has valid data
                if (
                  bookingDetailResponse.success &&
                  bookingDetailResponse.data &&
                  bookingDetailResponse.data.id
                ) {
                  const fullBooking = bookingDetailResponse.data;

                  // Update userBooking with full details
                  setUserBooking(fullBooking);

                  // Try to get payment_id and bank transfer
                  try {
                    // First, try to get payment_id from booking object (if exists)
                    let bookingPaymentId = (fullBooking as any).payment_id;

                    // If booking doesn't have payment_id, query payment by reference_id
                    if (!bookingPaymentId && fullBooking.id) {
                      console.log(
                        '🔍 Booking has no payment_id, querying by reference_id:',
                        fullBooking.id
                      );
                      const payment =
                        await paymentService.getPaymentByReferenceId(
                          fullBooking.id,
                          'CLASS_BOOKING'
                        );
                      if (payment?.id) {
                        bookingPaymentId = payment.id;
                        console.log('✅ Found payment:', {
                          paymentId: payment.id,
                          status: payment.status,
                          referenceId: (payment as any).reference_id,
                        });
                      }
                    }

                    if (bookingPaymentId) {
                      setPaymentId(bookingPaymentId);

                      // Try to get bank transfer from payment
                      try {
                        const bankTransfer =
                          await paymentService.getBankTransfer(
                            bookingPaymentId
                          );
                        if (bankTransfer?.id) {
                          setBankTransferId(bankTransfer.id);
                          console.log('✅ Found bank transfer:', {
                            bankTransferId: bankTransfer.id,
                            paymentId: bookingPaymentId,
                          });
                        }
                      } catch (btErr: any) {
                        // Bank transfer might not exist yet, that's okay
                        console.log(
                          '⚠️ Bank transfer not found or error:',
                          btErr?.message || btErr
                        );
                      }
                    } else {
                      console.log(
                        '⚠️ No payment_id found for booking:',
                        fullBooking.id
                      );
                    }
                  } catch (paymentErr) {
                    // If fetching payment fails, continue with booking data
                    console.log('⚠️ Error fetching payment:', paymentErr);
                  }
                } else {
                  // Full booking fetch failed or invalid, keep using foundBooking
                  console.log(
                    '⚠️ Full booking fetch invalid, using foundBooking:',
                    {
                      foundBookingId: foundBooking.id,
                      foundBookingPaymentStatus: foundBooking.payment_status,
                    }
                  );
                }
              } catch (err) {
                // If fetching fails, keep using foundBooking
                console.log(
                  '⚠️ Error fetching booking details, keeping foundBooking:',
                  err
                );
              }
            }
          } else {
            // Clear payment info if not pending
            setPaymentId(null);
            setBankTransferId(null);
          }
        } else {
          setUserBooking(null);
          setIsBooked(false);
          setIsWaitlisted(false);
        }
      } else {
        setUserBooking(null);
        setIsBooked(false);
        setIsWaitlisted(false);
      }

      // Check favorite status (handle errors gracefully - not critical)
      if (favoriteResponse.success && 'data' in favoriteResponse) {
        setIsFavorite(favoriteResponse.data || false);
        // Get favorite ID if favorited
        if (favoriteResponse.data) {
          try {
            const favoritesResponse = await favoriteService.getMemberFavorites(
              user.id,
              FavoriteType.CLASS
            );
            if (favoritesResponse.success && favoritesResponse.data) {
              const classId = schedule?.gym_class?.id || schedule?.class_id;
              const favorite = favoritesResponse.data.find(
                (fav) => fav.favorite_id === classId
              );
              if (favorite) {
                setFavoriteId(favorite.id);
              }
            }
          } catch (error) {
            // Silent fail - favorite ID lookup is not critical
          }
        }
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
      if (!user?.id) {
        Alert.alert(t('common.error'), 'Bạn cần đăng nhập để đặt lịch', [
          { text: t('common.ok') },
        ]);
        return;
      }

      if (!schedule?.id) {
        Alert.alert(t('common.error'), 'Không tìm thấy thông tin lịch học', [
          { text: t('common.ok') },
        ]);
        return;
      }

      // Ensure member_id is available (member.id from member service, not user.id)
      // Get member_id from AuthContext - this is the centralized way
      const memberId = member?.id;

      if (!memberId) {
        Alert.alert(
          t('common.error'),
          'Vui lòng đăng ký thành viên trước khi đặt lịch. Đang tải thông tin thành viên...',
          [{ text: t('common.ok') }]
        );
        // Try to reload member profile from AuthContext
        await loadMemberProfile();
        setIsBookingLoading(false);
        return;
      }

      setIsBookingLoading(true);

      // Ensure schedule_id is included (from schedule, not just from bookingData)
      // Use member.id (member_id from member service) - stored in AuthContext
      const bookingDataWithMember: CreateBookingRequest = {
        schedule_id: schedule.id, // Use schedule.id from current schedule state
        member_id: memberId, // Use member.id from AuthContext (actual member_id, not user_id)
        ...(bookingData.special_needs && {
          special_needs: bookingData.special_needs,
        }),
        ...(bookingData.notes && { notes: bookingData.notes }),
      };

      // Validate required fields
      if (
        !bookingDataWithMember.schedule_id ||
        !bookingDataWithMember.member_id
      ) {
        Alert.alert(
          t('common.error'),
          `Missing required fields: schedule_id=${!!bookingDataWithMember.schedule_id}, member_id=${!!bookingDataWithMember.member_id}`
        );
        setIsBookingLoading(false);
        return;
      }

      const response = await bookingService.createBooking(
        bookingDataWithMember
      );

      // Handle case where booking already exists (e.g., PENDING payment)
      if (response.success || (response as any).existingBooking) {
        setShowBookingModal(false);

        // If existing booking with PENDING payment, reload booking data and navigate to payment
        if ((response as any).existingBooking && response.data) {
          // Set userBooking from response
          setUserBooking(response.data);
          setIsBooked(response.data.status === 'CONFIRMED');

          // Reload schedule data to update UI
          await loadScheduleData();

          Alert.alert(
            t('common.info'),
            'Bạn đã có booking đang chờ thanh toán cho lớp học này',
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  // Auto-navigate to payment if payment required
                  if (
                    response.paymentRequired &&
                    (response as any).paymentInitiation
                  ) {
                    const paymentInit = (response as any).paymentInitiation;
                    router.push({
                      pathname: '/classes/booking-payment',
                      params: {
                        bookingId: response.data.id,
                        paymentId: paymentInit.payment_id || response.data.id,
                        bankTransferId: paymentInit.bank_transfer_id || '',
                        scheduleId: id,
                        amount:
                          paymentInit.amount?.toString() ||
                          schedule?.price_override?.toString() ||
                          schedule?.gym_class?.price?.toString() ||
                          '0',
                        qrCodeDataURL: paymentInit.qr_code_data_url || '',
                      },
                    });
                  }
                },
              },
            ]
          );
          setIsBookingLoading(false);
          return;
        }

        // Check if payment is required
        if (response.paymentRequired && response.paymentInitiation) {
          // Navigate to bank transfer screen for payment
          const { gatewayData } = response.paymentInitiation;

          if (gatewayData?.bankTransferId && gatewayData?.qrCodeDataURL) {
            router.push({
              pathname: '/classes/booking-payment',
              params: {
                bookingId: response.data?.id,
                paymentId: response.payment?.id,
                bankTransferId: gatewayData.bankTransferId,
                amount:
                  gatewayData.bankInfo?.amount?.toString() ||
                  response.payment?.amount?.toString(),
                qrCodeDataURL: gatewayData.qrCodeDataURL,
                scheduleId: id,
              },
            });
            return;
          }
        }

        // If no payment required or free booking
        // Update local state
        setIsBooked(true);
        setIsWaitlisted(false);

        // Show success alert with better message
        Alert.alert(t('common.success'), t('classes.booking.bookingSuccess'), [
          {
            text: t('common.ok'),
            onPress: () => {
              // Optionally reload schedule data to get updated booking status
              if (id) {
                loadScheduleData();
              }
            },
          },
        ]);
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('classes.booking.bookingFailed'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error: any) {
      console.error('❌ Error creating booking:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('classes.booking.bookingFailed'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsBookingLoading(false);
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

  const handleToggleFavorite = async () => {
    if (!schedule || !user?.id || isLoadingFavorite) return;

    try {
      setIsLoadingFavorite(true);

      // Get class_id first
      const classId = schedule.gym_class?.id || schedule.class_id;
      if (!classId) {
        Alert.alert(t('common.error'), 'Không tìm thấy thông tin lớp học');
        setIsLoadingFavorite(false);
        return;
      }

      // Always check current favorite status from server first
      const checkResponse = await favoriteService.checkFavorite(
        user.id,
        FavoriteType.CLASS,
        classId
      );

      const isCurrentlyFavorite =
        checkResponse.success && checkResponse.data === true;

      if (isCurrentlyFavorite) {
        // Already favorited - remove it
        // Get favorite ID from favorites list if we don't have it
        let favoriteIdToRemove = favoriteId;

        if (!favoriteIdToRemove) {
          const favoritesResponse = await favoriteService.getMemberFavorites(
            user.id,
            FavoriteType.CLASS
          );
          if (
            favoritesResponse.success &&
            Array.isArray(favoritesResponse.data) &&
            favoritesResponse.data.length > 0
          ) {
            const favorite = favoritesResponse.data.find(
              (fav) => fav.favorite_id === classId
            );
            if (favorite?.id) {
              favoriteIdToRemove = favorite.id;
            }
          }
        }

        if (favoriteIdToRemove) {
          const response = await favoriteService.removeFavorite(
            user.id,
            favoriteIdToRemove
          );
          if (response.success) {
            setIsFavorite(false);
            setFavoriteId(null);
          } else {
            Alert.alert(
              t('common.error'),
              response.error || 'Failed to remove favorite'
            );
          }
        } else {
          // Can't find favorite ID, just update state
          setIsFavorite(false);
          setFavoriteId(null);
        }
      } else {
        // Not favorited - add it
        const response = await favoriteService.addFavorite(
          user.id,
          FavoriteType.CLASS,
          classId
        );
        if (response.success && response.data) {
          setIsFavorite(true);
          // Extract favorite ID from response
          // Backend returns: { success: true, data: { favorite: { id, ... } } }
          const favoriteData =
            (response.data as any)?.favorite || response.data;
          const newFavoriteId =
            favoriteData?.id ||
            (response.data as any)?.id ||
            (typeof response.data === 'string' ? response.data : null);
          if (newFavoriteId) {
            setFavoriteId(newFavoriteId);
          }
        } else {
          // If error is "already favorited", treat as toggle - remove instead
          if (
            response.error?.includes('Đã được thêm') ||
            response.error?.includes('already')
          ) {
            // Try to remove it
            const favoritesResponse = await favoriteService.getMemberFavorites(
              user.id,
              FavoriteType.CLASS
            );
            if (
              favoritesResponse.success &&
              Array.isArray(favoritesResponse.data)
            ) {
              const favorite = favoritesResponse.data.find(
                (fav) => fav.favorite_id === classId
              );
              if (favorite?.id) {
                const removeResponse = await favoriteService.removeFavorite(
                  user.id,
                  favorite.id
                );
                if (removeResponse.success) {
                  setIsFavorite(false);
                  setFavoriteId(null);
                }
              }
            }
          } else {
            Alert.alert(
              t('common.error'),
              response.error || 'Failed to add favorite'
            );
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error toggling favorite:', error);
      // If error is "already favorited", try to remove instead
      if (
        error.message?.includes('Đã được thêm') ||
        error.message?.includes('already')
      ) {
        const classId = schedule.gym_class?.id || schedule.class_id;
        if (classId) {
          try {
            const favoritesResponse = await favoriteService.getMemberFavorites(
              user.id,
              FavoriteType.CLASS
            );
            if (
              favoritesResponse.success &&
              Array.isArray(favoritesResponse.data)
            ) {
              const favorite = favoritesResponse.data.find(
                (fav) => fav.favorite_id === classId
              );
              if (favorite?.id) {
                const removeResponse = await favoriteService.removeFavorite(
                  user.id,
                  favorite.id
                );
                if (removeResponse.success) {
                  setIsFavorite(false);
                  setFavoriteId(null);
                }
              }
            }
          } catch (removeError) {
            console.error('❌ Error removing favorite:', removeError);
          }
        }
      } else {
        Alert.alert(
          t('common.error'),
          error.message || 'Failed to update favorite'
        );
      }
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleShare = async () => {
    if (!schedule) return;

    try {
      const className = schedule.gym_class?.name || 'Class';
      const trainerName = schedule.trainer?.full_name || '';
      const date = new Date(schedule.start_time).toLocaleDateString(
        i18n.language,
        {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }
      );
      const time = formatTime(schedule.start_time);

      const message = `${className}${
        trainerName ? ` with ${trainerName}` : ''
      }\n${date} at ${time}\n\nJoin me for this class!`;

      const result = await Share.share({
        message: message,
        title: className,
      });

      if (result.action === Share.sharedAction) {
        // Shared successfully
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error: any) {
      console.error('❌ Error sharing:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to share class');
    }
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

  const getDifficultyTranslation = (difficulty: Difficulty | string) => {
    switch (difficulty) {
      case Difficulty.BEGINNER:
        return t('classes.difficulty.beginner');
      case Difficulty.INTERMEDIATE:
        return t('classes.difficulty.intermediate');
      case Difficulty.ADVANCED:
        return t('classes.difficulty.advanced');
      case Difficulty.ALL_LEVELS:
        return t('classes.difficulty.all_levels');
      default:
        return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: Difficulty | string) => {
    switch (difficulty) {
      case Difficulty.BEGINNER:
        return theme.colors.success;
      case Difficulty.INTERMEDIATE:
        return theme.colors.warning;
      case Difficulty.ADVANCED:
        return theme.colors.error;
      case Difficulty.ALL_LEVELS:
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const isFullyBooked = schedule
    ? schedule.current_bookings >= schedule.max_capacity
    : false;
  const spotsAvailable = schedule
    ? schedule.max_capacity - schedule.current_bookings
    : 0;

  const themedStyles = styles(theme);

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[themedStyles.loadingText, { color: theme.colors.text }]}
          >
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
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.errorContainer}>
          <Text style={[themedStyles.errorText, { color: theme.colors.error }]}>
            {error || t('classes.classNotFound')}
          </Text>
          <TouchableOpacity
            style={[
              themedStyles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text
              style={[
                themedStyles.retryButtonText,
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
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('classes.classDetails')}
        </Text>
        <View style={themedStyles.headerActions}>
          <TouchableOpacity
            style={themedStyles.headerAction}
            onPress={handleToggleFavorite}
            disabled={isLoadingFavorite}
            activeOpacity={0.7}
          >
            {isLoadingFavorite ? (
              <ActivityIndicator
                size="small"
                color={isFavorite ? theme.colors.error : theme.colors.primary}
              />
            ) : (
              <Heart
                size={24}
                color={isFavorite ? theme.colors.error : theme.colors.text}
                fill={isFavorite ? theme.colors.error : 'none'}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={themedStyles.headerAction}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <ShareIcon size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={themedStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Class Image */}
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

        {/* Class Info */}
        <View style={themedStyles.classInfo}>
          <View style={themedStyles.classHeader}>
            <Text
              style={[themedStyles.className, { color: theme.colors.text }]}
            >
              {schedule.gym_class?.name}
            </Text>
            {/* Badges Row */}
            <View style={themedStyles.badgesRow}>
              <View
                style={[
                  themedStyles.categoryBadge,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <Text
                  style={[
                    themedStyles.categoryBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {getCategoryTranslation(schedule.gym_class?.category || '')}
                </Text>
              </View>
              {schedule.gym_class?.difficulty && (
                <View
                  style={[
                    themedStyles.difficultyBadge,
                    {
                      backgroundColor:
                        getDifficultyColor(schedule.gym_class.difficulty) +
                        '15',
                    },
                  ]}
                >
                  <Text
                    style={[
                      themedStyles.difficultyBadgeText,
                      {
                        color: getDifficultyColor(
                          schedule.gym_class.difficulty
                        ),
                      },
                    ]}
                  >
                    {getDifficultyTranslation(schedule.gym_class.difficulty)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Duration and Price Row */}
          <View style={themedStyles.metaRow}>
            {schedule.start_time && schedule.end_time && (
              <View style={themedStyles.metaItem}>
                <Timer size={16} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    themedStyles.metaText,
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
              </View>
            )}
            {(schedule.price_override || schedule.gym_class?.price) && (
              <View style={themedStyles.metaItem}>
                <DollarSign size={16} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    themedStyles.metaText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {formatPrice(
                    schedule.price_override || schedule.gym_class?.price
                  )}
                </Text>
              </View>
            )}
          </View>

          {schedule.gym_class?.description && (
            <Text
              style={[
                themedStyles.classDescription,
                { color: theme.colors.text },
              ]}
            >
              {schedule.gym_class.description}
            </Text>
          )}
        </View>

        {/* Schedule Details */}
        <View
          style={[
            themedStyles.section,
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
            {t('classes.scheduleDetails')}
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
                style={[themedStyles.detailText, { color: theme.colors.text }]}
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
                style={[themedStyles.detailText, { color: theme.colors.text }]}
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
              themedStyles.section,
              {
                backgroundColor: theme.colors.surface,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.secondary,
              },
            ]}
          >
            <Text
              style={[themedStyles.sectionTitle, { color: theme.colors.text }]}
            >
              {t('classes.trainer')}
            </Text>
            <View style={themedStyles.trainerContainer}>
              <View style={themedStyles.trainerAvatarContainer}>
                {schedule.trainer?.profile_photo && !trainerAvatarError ? (
                  <Image
                    source={{ uri: schedule.trainer?.profile_photo || '' }}
                    style={themedStyles.trainerAvatar}
                    resizeMode="cover"
                    onError={() => {
                      setTrainerAvatarError(true);
                    }}
                  />
                ) : (
                  <View
                    style={[
                      themedStyles.trainerAvatarPlaceholder,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]}
                  >
                    <Users size={32} color={theme.colors.primary} />
                  </View>
                )}
              </View>
              <View style={themedStyles.trainerDetails}>
                <Text
                  style={[
                    themedStyles.trainerName,
                    { color: theme.colors.text },
                  ]}
                >
                  {schedule.trainer.full_name}
                </Text>
                <Text
                  style={[
                    themedStyles.trainerExperience,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {schedule.trainer.experience_years}{' '}
                  {schedule.trainer.experience_years === 1
                    ? t('classes.yearExperience')
                    : t('classes.yearsExperience')}
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
                        themedStyles.ratingSubtext,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      ({schedule.trainer.total_classes} {t('classes.classes')})
                    </Text>
                  </View>
                )}
                {schedule.trainer.bio && (
                  <Text
                    style={[
                      themedStyles.trainerBio,
                      { color: theme.colors.text },
                    ]}
                  >
                    {schedule.trainer.bio}
                  </Text>
                )}
                {schedule.trainer.specializations &&
                  schedule.trainer.specializations.length > 0 && (
                    <View style={themedStyles.specializationsList}>
                      {schedule.trainer.specializations.map((spec, index) => (
                        <View
                          key={`specialization-${index}-${spec}`}
                          style={[
                            themedStyles.specializationChip,
                            { backgroundColor: theme.colors.background },
                          ]}
                        >
                          <Text
                            style={[
                              themedStyles.specializationText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {getCategoryTranslation(spec)}
                          </Text>
                        </View>
                      ))}
                    </View>
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
                themedStyles.section,
                {
                  backgroundColor: theme.colors.surface,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.info,
                },
              ]}
            >
              <Text
                style={[
                  themedStyles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                {t('classes.equipmentNeeded')}
              </Text>
              <View style={themedStyles.equipmentList}>
                {schedule.gym_class.equipment_needed.map((equipment, index) => (
                  <View
                    key={`equipment-${index}-${equipment}`}
                    style={[
                      themedStyles.equipmentItem,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        themedStyles.equipmentText,
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
            style={[
              themedStyles.section,
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
              {t('classes.specialNotes')}
            </Text>
            <Text
              style={[themedStyles.notesText, { color: theme.colors.text }]}
            >
              {schedule.special_notes}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          themedStyles.actions,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        {(() => {
          // Debug logging
          console.log('🔍 Button render check:', {
            hasUserBooking: !!userBooking,
            userBookingId: userBooking?.id,
            paymentStatus: userBooking?.payment_status,
            status: userBooking?.status,
            isBooked,
            isWaitlisted,
          });

          if (!userBooking) {
            return null; // Will show "Đặt lịch" button below
          }

          // User has a booking for this schedule
          // Priority 1: Check payment_status first
          const paymentStatus =
            userBooking.payment_status?.toString().trim().toUpperCase() || '';

          console.log('💳 Payment status normalized:', {
            original: userBooking.payment_status,
            normalized: paymentStatus,
            matchesPending: paymentStatus === 'PENDING',
          });

          if (paymentStatus === 'PENDING') {
            // Pending payment - show "Chờ thanh toán" with link to payment
            return (
              <TouchableOpacity
                style={[
                  themedStyles.bookButton,
                  {
                    backgroundColor: theme.colors.warning,
                    ...theme.shadows.md,
                  },
                ]}
                onPress={async () => {
                  // Navigate to payment page if booking ID is available
                  if (userBooking.id) {
                    // Ensure we have payment_id and bankTransferId
                    let finalPaymentId = paymentId;
                    let finalBankTransferId = bankTransferId;

                    // If payment_id is not loaded yet, try to fetch it
                    if (!finalPaymentId && userBooking.id) {
                      try {
                        // First try to get from booking details
                        const bookingDetailResponse =
                          await bookingService.getBookingById(userBooking.id);
                        if (
                          bookingDetailResponse.success &&
                          bookingDetailResponse.data
                        ) {
                          const bookingPaymentId = (
                            bookingDetailResponse.data as any
                          ).payment_id;
                          if (bookingPaymentId) {
                            finalPaymentId = bookingPaymentId;
                            setPaymentId(bookingPaymentId);
                          }
                        }

                        // If still no payment_id, query by reference_id
                        if (!finalPaymentId && userBooking.id) {
                          console.log(
                            '🔍 Querying payment by reference_id:',
                            userBooking.id
                          );
                          const payment =
                            await paymentService.getPaymentByReferenceId(
                              userBooking.id,
                              'CLASS_BOOKING'
                            );
                          if (payment?.id) {
                            finalPaymentId = payment.id;
                            setPaymentId(payment.id);
                            console.log('✅ Found payment via reference_id:', {
                              paymentId: payment.id,
                              referenceId: (payment as any).reference_id,
                            });
                          }
                        }

                        // If we have payment_id, try to get bank transfer
                        if (finalPaymentId) {
                          try {
                            const bankTransfer =
                              await paymentService.getBankTransfer(
                                finalPaymentId
                              );
                            if (bankTransfer?.id) {
                              finalBankTransferId = bankTransfer.id;
                              setBankTransferId(bankTransfer.id);
                              console.log('✅ Found bank transfer:', {
                                bankTransferId: bankTransfer.id,
                              });
                            }
                          } catch (btErr: any) {
                            // Bank transfer might not exist yet
                            console.log(
                              '⚠️ Bank transfer not found:',
                              btErr?.message || btErr
                            );
                          }
                        }
                      } catch (err) {
                        console.log('⚠️ Error fetching payment info:', err);
                      }
                    }

                    // Only navigate if we have a valid payment_id
                    if (finalPaymentId) {
                      router.push({
                        pathname: '/classes/booking-payment',
                        params: {
                          bookingId: userBooking.id,
                          paymentId: finalPaymentId,
                          bankTransferId: finalBankTransferId || '',
                          scheduleId: id,
                          amount:
                            schedule?.price_override?.toString() ||
                            schedule?.gym_class?.price?.toString() ||
                            '0',
                        },
                      });
                    } else {
                      Alert.alert(
                        t('common.error'),
                        'Không tìm thấy thông tin thanh toán. Vui lòng thử lại sau.'
                      );
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    themedStyles.bookButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('classes.booking.pendingPayment')}
                </Text>
              </TouchableOpacity>
            );
          }

          // Priority 2: Check if paid/completed and booked
          if (
            (paymentStatus === 'PAID' || paymentStatus === 'COMPLETED') &&
            isBooked
          ) {
            // Paid and confirmed - show "Đã thuộc lớp học"
            return (
              <View
                style={[
                  themedStyles.bookButton,
                  {
                    backgroundColor: theme.colors.success,
                    opacity: 0.8,
                    ...theme.shadows.md,
                  },
                ]}
              >
                <Text
                  style={[
                    themedStyles.bookButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('classes.booking.alreadyEnrolled')}
                </Text>
              </View>
            );
          }

          // Priority 3: Check if waitlisted
          if (isWaitlisted || userBooking.status === 'WAITLIST') {
            // Waitlisted
            return (
              <TouchableOpacity
                style={[
                  themedStyles.waitlistButton,
                  {
                    backgroundColor: theme.colors.warning,
                    ...theme.shadows.md,
                  },
                ]}
                onPress={handleCancelBooking}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    themedStyles.waitlistButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('classes.booking.removeFromWaitlist')}
                </Text>
              </TouchableOpacity>
            );
          }

          // Priority 4: Other booking statuses - show cancel button
          // This should rarely happen if payment_status is correctly set
          return (
            <TouchableOpacity
              style={[
                themedStyles.cancelButton,
                {
                  borderColor: theme.colors.error,
                  backgroundColor: theme.colors.background,
                },
              ]}
              onPress={handleCancelBooking}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  themedStyles.cancelButtonText,
                  { color: theme.colors.error },
                ]}
              >
                {t('classes.booking.cancelBooking')}
              </Text>
            </TouchableOpacity>
          );
        })()}

        {!userBooking ? (
          // No booking - show "Đặt lịch" button
          <TouchableOpacity
            style={[
              themedStyles.bookButton,
              {
                backgroundColor: isFullyBooked
                  ? theme.colors.disabled
                  : theme.colors.primary,
                ...theme.shadows.md,
              },
            ]}
            onPress={handleBookClass}
            disabled={isFullyBooked}
            activeOpacity={0.8}
          >
            <Text
              style={[
                themedStyles.bookButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {isFullyBooked
                ? t('classes.booking.fullyBooked')
                : t('classes.booking.book')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Booking Modal */}
      {schedule && (
        <BookingModal
          visible={showBookingModal}
          schedule={schedule}
          onClose={() => {
            if (!isBookingLoading) {
              setShowBookingModal(false);
            }
          }}
          onConfirm={handleBookingConfirm}
          loading={isBookingLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...Typography.bodyMedium,
      marginTop: theme.spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    errorText: {
      ...Typography.bodyMedium,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      ...theme.shadows.sm,
    },
    retryButtonText: {
      ...Typography.buttonMedium,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: theme.spacing.xs,
      marginLeft: -theme.spacing.xs,
    },
    headerTitle: {
      ...Typography.h5,
    },
    headerActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    headerAction: {
      padding: theme.spacing.xs,
    },
    content: {
      flex: 1,
    },
    classImage: {
      width: '100%',
      height: 280,
    },
    classInfo: {
      padding: theme.spacing.lg,
    },
    classHeader: {
      marginBottom: theme.spacing.md,
    },
    className: {
      ...Typography.h2,
      marginBottom: theme.spacing.sm,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    categoryBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.round,
    },
    categoryBadgeText: {
      ...Typography.labelSmall,
    },
    difficultyBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.round,
    },
    difficultyBadgeText: {
      ...Typography.labelSmall,
    },
    metaRow: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    metaText: {
      ...Typography.bodySmallMedium,
    },
    classDescription: {
      ...Typography.bodyRegular,
      marginTop: theme.spacing.md,
    },
    section: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.xl,
      ...theme.shadows.sm,
    },
    sectionTitle: {
      ...Typography.h5,
      marginBottom: theme.spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailText: {
      ...Typography.bodyMedium,
      flex: 1,
    },
    detailSubtext: {
      ...Typography.bodySmall,
      marginTop: 2,
    },
    trainerContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    trainerAvatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      overflow: 'hidden',
      ...theme.shadows.sm,
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
    },
    trainerAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    trainerAvatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trainerDetails: {
      flex: 1,
    },
    trainerName: {
      ...Typography.h6,
      marginBottom: theme.spacing.xs,
    },
    trainerExperience: {
      ...Typography.bodySmall,
      marginBottom: theme.spacing.xs,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    ratingText: {
      ...Typography.bodySmallMedium,
    },
    ratingSubtext: {
      ...Typography.bodySmall,
    },
    trainerBio: {
      ...Typography.bodySmall,
      marginTop: theme.spacing.sm,
      lineHeight: 20,
    },
    specializationsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    specializationChip: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
    },
    specializationText: {
      ...Typography.caption,
    },
    equipmentList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    equipmentItem: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.round,
      borderWidth: 1,
    },
    equipmentText: {
      ...Typography.bodySmall,
    },
    notesText: {
      ...Typography.bodyRegular,
      lineHeight: 24,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      borderTopWidth: 1,
    },
    bookButton: {
      flex: 1,
      paddingVertical: theme.spacing.md + 2,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
    },
    bookButtonText: {
      ...Typography.buttonLarge,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md + 2,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      alignItems: 'center',
    },
    cancelButtonText: {
      ...Typography.buttonLarge,
    },
    waitlistButton: {
      flex: 1,
      paddingVertical: theme.spacing.md + 2,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
    },
    waitlistButtonText: {
      ...Typography.buttonLarge,
    },
  });
