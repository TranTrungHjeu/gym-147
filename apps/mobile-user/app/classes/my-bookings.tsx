import CancellationReasonModal from '@/components/CancellationReasonModal'; // IMPROVEMENT: Cancellation reason modal
import ClassCard from '@/components/ClassCard';
import ClassRatingModal from '@/components/ClassRatingModal';
import RefundInfoCard from '@/components/RefundInfoCard';
import { SuccessModal } from '@/components/SuccessModal';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, type Booking } from '@/services';
import { attendanceService } from '@/services/schedule/attendance.service';
import { paymentService } from '@/services/billing/payment.service';
import { Refund } from '@/types/billingTypes';
import { Attendance } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type BookingTab = 'upcoming' | 'past' | 'cancelled' | 'refund';

export default function MyBookingsScreen() {
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, i18n } = useTranslation();

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refundMap, setRefundMap] = useState<Record<string, Refund | null>>({});
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);

  // Attendance and rating state
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance | null>>({});
  const [loadingAttendance, setLoadingAttendance] = useState<Record<string, boolean>>({});

  // Class rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingModalData, setRatingModalData] = useState<{
    scheduleId?: string;
    className?: string;
    trainerName?: string;
    existingRating?: {
      class_rating?: number | null;
      trainer_rating?: number | null;
      feedback_notes?: string | null;
    };
  } | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');

  // Use refs to track loading state and last loaded member ID
  const isLoadingRef = useRef(false);
  const lastLoadedMemberIdRef = useRef<string | null>(null);
  const tRef = useRef(t);

  // Update tRef when t changes (t is the only unstable dependency)
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Memoize loadBookings to prevent infinite loops
  // Only include member?.id in dependencies, use ref for t to avoid recreating function
  const loadBookings = useCallback(
    async (force = false) => {
      // Prevent multiple simultaneous calls
      if (isLoadingRef.current) {
        console.log('[SKIP] Already loading bookings, skipping...');
        return;
      }

      // Use member.id directly (from closure) - backend API requires member_id
      if (!member?.id) {
        setError(
          tRef.current('classes.booking.loginRequired') ||
            'Vui lòng đăng nhập để xem lịch đặt'
        );
        return;
      }

      // Skip if we've already loaded for this member ID (unless forced)
      if (!force && lastLoadedMemberIdRef.current === member.id) {
        console.log(
          '[SKIP] Already loaded bookings for this member, skipping...'
        );
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        console.log('[LOAD] Loading bookings...');
        console.log('[MEMBER] Member ID:', member.id);

        // Request all bookings with high limit (backend default is 10)
        const response = await bookingService.getMemberBookings(member.id, {
          // Note: BookingFilters may not support limit/page, but backend accepts them as query params
          limit: 100, // Get up to 100 bookings
          page: 1,
        } as any);

        if (response.success && response.data) {
          console.log(
            '[SUCCESS] Bookings loaded:',
            response.data.length,
            'bookings'
          );
          setBookings(response.data);
          lastLoadedMemberIdRef.current = member.id; // Track that we've loaded for this member
        } else {
          console.log('[ERROR] Failed to load bookings:', response.error);
          setError(response.error || tRef.current('classes.booking.loadError'));
        }
      } catch (err: any) {
        console.error('[ERROR] Error loading bookings:', err);
        setError(err.message || tRef.current('classes.booking.loadError'));
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [member?.id]
  ); // Only depend on member?.id, use ref for t

  // Load data on component mount and when member.id changes
  useEffect(() => {
    // Only load if member.id exists, is different from last loaded, and we're not already loading
    if (
      member?.id &&
      lastLoadedMemberIdRef.current !== member.id &&
      !isLoadingRef.current
    ) {
      loadBookings(false); // Don't force on initial load
    }
  }, [member?.id, loadBookings]); // Include loadBookings but it's stable (only depends on member?.id)

  // Handle navigation params for refresh after payment
  useEffect(() => {
    if (params?.paymentVerified === 'true' || params?.refresh === 'true') {
      console.log('[REFRESH] Payment verified, refreshing bookings...');
      // Switch to upcoming tab to show the newly paid booking
      setActiveTab('upcoming');
      loadBookings(true); // Force refresh to get updated booking status
    }
  }, [params?.paymentVerified, params?.refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'refund') {
      await loadRefunds(true);
    } else {
      await loadBookings(true); // Force refresh
    }
    setRefreshing(false);
  };

  // Load refunds for member
  const loadRefunds = useCallback(
    async (force = false) => {
      if (!member?.id) {
        setError(
          tRef.current('classes.booking.loginRequired') ||
            'Vui lòng đăng nhập để xem hoàn tiền'
        );
        return;
      }

      try {
        setLoadingRefunds(true);
        setError(null);

        const response = await paymentService.getMemberRefunds(member.id, {
          limit: 100,
          page: 1,
        });

        console.log('[REFUND] Load refunds response:', {
          success: response.success,
          hasData: !!response.data,
          refundsCount: response.data?.refunds?.length || 0,
          refunds: response.data?.refunds,
        });

        if (response.success && response.data) {
          const refundsList = response.data.refunds || [];
          console.log('[REFUND] Setting refunds:', refundsList.length);
          setRefunds(refundsList);
        } else {
          console.log('[REFUND] Failed to load refunds:', response.message);
          setRefunds([]);
          setError(response.message || 'Không thể tải danh sách hoàn tiền');
        }
      } catch (error: any) {
        console.error('[ERROR] Failed to load refunds:', error);
        setError(error.message || 'Không thể tải danh sách hoàn tiền');
        setRefunds([]);
      } finally {
        setLoadingRefunds(false);
      }
    },
    [member?.id]
  );

  // Load refunds when switching to refund tab
  useEffect(() => {
    if (activeTab === 'refund' && member?.id) {
      loadRefunds(true);
    }
  }, [activeTab, member?.id, loadRefunds]);

  // IMPROVEMENT: State for cancellation reason modal
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [refundInfo, setRefundInfo] = useState<any>(null);

  const handleCancelBooking = async (booking: Booking) => {
    // IMPROVEMENT: Show cancellation reason modal instead of simple alert
    setBookingToCancel(booking);
    setShowCancellationModal(true);
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!bookingToCancel) return;

    setIsCancelling(true);
    try {
      const response = await bookingService.cancelBooking(bookingToCancel.id, {
        cancellation_reason: reason, // IMPROVEMENT: Send cancellation reason
      });
      if (response.success) {
        setShowCancellationModal(false);
        setBookingToCancel(null);
        
        // Show success modal with refund button if refund is available
        const hasRefund = response.refund && response.refund.refundId;
        const refundAmount = response.refund?.refundAmount || 0;
        
        setSuccessMessage(
          hasRefund
            ? t('classes.booking.cancelSuccessWithRefund', {
                amount: new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(refundAmount),
              }) || `Hủy lớp thành công! Bạn sẽ được hoàn ${new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(refundAmount)}`
            : t('classes.booking.cancelSuccess') || 'Hủy lớp thành công!'
        );
        setShowSuccessModal(true);
        setRefundInfo(hasRefund ? response.refund : null);
        
        await loadBookings(true); // Force refresh after cancellation
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('classes.booking.cancelFailed')
        );
      }
    } catch (error: any) {
      console.error('[ERROR] Error cancelling booking:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('classes.booking.cancelFailed')
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleBookingPress = (booking: Booking) => {
    if (booking.schedule) {
      router.push(`/classes/${booking.schedule.id}`);
    }
  };

  const handleNavigateToPayment = async (booking: Booking) => {
    if (!booking.id || !member?.id) {
      Alert.alert(
        t('common.error') || 'Error',
        t('classes.booking.paymentError') ||
          'Không thể thanh toán. Vui lòng thử lại.'
      );
      return;
    }

    try {
      // If booking is waitlist and payment_status is PENDING, initiate payment first
      if (booking.is_waitlist && booking.payment_status === 'PENDING') {
        const response = await bookingService.initiateWaitlistPayment(
          booking.id,
          member.id
        );

        if (!response.success || !response.data) {
          Alert.alert(
            t('common.error') || 'Error',
            response.error ||
              t('classes.booking.paymentInitiateFailed') ||
              'Không thể tạo thanh toán. Vui lòng thử lại.'
          );
          return;
        }

        const { payment, paymentInitiation } = response.data;

        if (
          paymentInitiation?.gatewayData?.bankTransferId &&
          paymentInitiation?.gatewayData?.qrCodeDataURL
        ) {
          router.push({
            pathname: '/classes/booking-payment',
            params: {
              bookingId: booking.id,
              paymentId: payment?.id,
              bankTransferId: paymentInitiation.gatewayData.bankTransferId,
              amount:
                paymentInitiation.gatewayData.bankInfo?.amount?.toString() ||
                payment?.amount?.toString(),
              qrCodeDataURL: paymentInitiation.gatewayData.qrCodeDataURL,
              scheduleId: booking.schedule?.id,
            },
          });
          return;
        }
      }

      // For non-waitlist or already initiated payments, navigate to payment screen
      // This will handle existing payment lookup
      if (booking.schedule) {
        router.push(`/classes/${booking.schedule.id}`);
      }
    } catch (error: any) {
      console.error('[ERROR] Error navigating to payment:', error);
      Alert.alert(
        t('common.error') || 'Error',
        error.message ||
          t('classes.booking.paymentError') ||
          'Không thể thanh toán. Vui lòng thử lại.'
      );
    }
  };

  const getFilteredBookings = () => {
    // Get current time in Vietnam timezone for accurate comparison
    const now = new Date();
    // Convert to Vietnam timezone string, then back to Date for comparison
    // This ensures we're comparing with the same timezone as the database (UTC)
    const vnTimeString = now.toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    // Parse as UTC to match database timezone
    const [datePart, timePart] = vnTimeString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    const nowVN = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds || '0')
    ));

    switch (activeTab) {
      case 'upcoming':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          const scheduleStatus = String(booking.schedule?.status || '');
          // Include if: confirmed AND (startTime >= now OR schedule is IN_PROGRESS)
          return (
            booking.status === 'CONFIRMED' &&
            (startTime >= nowVN || scheduleStatus === 'IN_PROGRESS')
          );
        });
      case 'past':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          const scheduleStatus = String(booking.schedule?.status || '');
          // Exclude IN_PROGRESS schedules from past tab
          return (
            booking.status === 'COMPLETED' ||
            (booking.status === 'CONFIRMED' &&
              startTime < nowVN &&
              scheduleStatus !== 'IN_PROGRESS')
          );
        });
      case 'cancelled':
        return bookings.filter((booking) => booking.status === 'CANCELLED');
      case 'refund':
        return []; // Refunds are handled separately
      default:
        return bookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  const getTabCount = (tab: BookingTab) => {
    // Get current time in Vietnam timezone for accurate comparison
    const now = new Date();
    const vnTimeString = now.toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const [datePart, timePart] = vnTimeString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    const nowVN = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds || '0')
    ));

    switch (tab) {
      case 'upcoming':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          const scheduleStatus = String(booking.schedule?.status || '');
          return (
            booking.status === 'CONFIRMED' &&
            (startTime >= nowVN || scheduleStatus === 'IN_PROGRESS')
          );
        }).length;
      case 'past':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          const scheduleStatus = String(booking.schedule?.status || '');
          return (
            booking.status === 'COMPLETED' ||
            (booking.status === 'CONFIRMED' &&
              startTime < nowVN &&
              scheduleStatus !== 'IN_PROGRESS')
          );
        }).length;
      case 'cancelled':
        return bookings.filter((booking) => booking.status === 'CANCELLED')
          .length;
      case 'refund':
        return refunds.length;
      default:
        return 0;
    }
  };

  // Show loading state (only for initial load, not for refund tab)
  if (loading && activeTab !== 'refund') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('classes.booking.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => loadBookings(true)}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('common.retry')}
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
          {t('classes.booking.myBookingsTitle')}
        </Text>
        {/* IMPROVEMENT: Add cancellation history button */}
        <TouchableOpacity
          onPress={() => router.push('/classes/cancellation-history')}
          style={{ padding: 8 }}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            {t('classes.booking.cancellationHistory')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View
        style={[
          styles.tabContainer,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'upcoming' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'upcoming' && { color: theme.colors.primary },
              ]}
            >
              {t('classes.booking.upcoming')} ({getTabCount('upcoming')})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'past' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('past')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'past' && { color: theme.colors.primary },
              ]}
            >
              {t('classes.booking.past')} ({getTabCount('past')})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'cancelled' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'cancelled' && { color: theme.colors.primary },
              ]}
            >
              {t('classes.booking.cancelled')} ({getTabCount('cancelled')})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'refund' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('refund')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'refund' && { color: theme.colors.primary },
              ]}
            >
              {t('classes.booking.refund') || 'Hoàn tiền'} (
              {getTabCount('refund')})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Refunds List - Show when refund tab is active */}
      {activeTab === 'refund' ? (
        <FlatList
          data={refunds.filter(
            (refund, index, self) =>
              // Remove duplicates by refund id
              index === self.findIndex((r) => r.id === refund.id)
          )}
          keyExtractor={(item) =>
            item.id || `refund-${item.payment?.id || Math.random()}`
          }
          renderItem={({ item: refund }) => {
            return (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                {/* Refund Info Card - Only show refund card, no class card */}
                <RefundInfoCard
                  refund={refund}
                  showTimelineButton={true}
                  onViewTimeline={async () => {
                    if (refund.id) {
                      try {
                        const timelineResponse =
                          await paymentService.getRefundTimeline(refund.id);
                        if (timelineResponse.success && timelineResponse.data) {
                          const timeline = timelineResponse.data.timeline || [];
                          const timelineText = timeline
                            .map((item: any) => {
                              const date = new Date(
                                item.timestamp
                              ).toLocaleString('vi-VN');
                              return `${date}: ${item.action} (${item.actor})`;
                            })
                            .join('\n');

                          Alert.alert(
                            t('classes.refund.viewTimeline'),
                            timelineText || t('classes.refund.noRefund'),
                            [{ text: t('common.ok') }]
                          );
                        }
                      } catch (error) {
                        console.error(
                          '[ERROR] Failed to load refund timeline:',
                          error
                        );
                      }
                    }
                  }}
                />
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {loadingRefunds
                  ? t('classes.booking.loading') || 'Đang tải...'
                  : t('classes.booking.noRefunds') || 'Chưa có hoàn tiền nào'}
              </Text>
              {!loadingRefunds && (
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('classes.booking.emptyRefundMessage') ||
                    'Bạn chưa có yêu cầu hoàn tiền nào'}
                </Text>
              )}
            </View>
          }
        />
      ) : (
        /* Bookings List */
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            // Load refund info for cancelled bookings
            const loadRefundForBooking = async (bookingId: string) => {
              if (refundMap[bookingId] !== undefined) return; // Already loaded or loading

              try {
                const response = await paymentService.getRefundByBookingId(
                  bookingId
                );
                setRefundMap((prev) => ({
                  ...prev,
                  [bookingId]:
                    response.success && response.data ? response.data : null,
                }));
              } catch (error) {
                console.error('[ERROR] Failed to load refund info:', error);
                setRefundMap((prev) => ({
                  ...prev,
                  [bookingId]: null,
                }));
              }
            };

            // Only load refund info for cancelled bookings
            // Refunds for cancelled bookings are shown in the cancelled tab
            // Refunds list tab shows all refunds separately, so we don't need to show refund here
            // to avoid duplicate display
            if (
              refundMap[item.id] === undefined &&
              item.status === 'CANCELLED'
            ) {
              loadRefundForBooking(item.id);
            }

            // Load attendance for past bookings to show rating
            const loadAttendanceForBooking = async (scheduleId: string, bookingId: string) => {
              if (!member?.id || attendanceMap[bookingId] !== undefined || loadingAttendance[bookingId]) {
                return;
              }

              setLoadingAttendance((prev) => ({ ...prev, [bookingId]: true }));
              try {
                const response = await attendanceService.getMemberAttendance(scheduleId, member.id);
                if (response.success && response.data) {
                  setAttendanceMap((prev) => ({
                    ...prev,
                    [bookingId]: response.data as Attendance,
                  }));
                } else {
                  setAttendanceMap((prev) => ({
                    ...prev,
                    [bookingId]: null,
                  }));
                }
              } catch (error) {
                console.error('[ERROR] Failed to load attendance:', error);
                setAttendanceMap((prev) => ({
                  ...prev,
                  [bookingId]: null,
                }));
              } finally {
                setLoadingAttendance((prev) => ({ ...prev, [bookingId]: false }));
              }
            };

            // Load attendance for past bookings that have been checked out
            if (
              activeTab === 'past' &&
              item.schedule_id &&
              item.status === 'CONFIRMED' &&
              attendanceMap[item.id] === undefined &&
              !loadingAttendance[item.id]
            ) {
              loadAttendanceForBooking(item.schedule_id, item.id);
            }

            const refund = refundMap[item.id];
            const attendance = attendanceMap[item.id];
            const hasCheckedOut = attendance?.checked_out_at !== null && attendance?.checked_out_at !== undefined;
            const hasRating = attendance && (attendance.class_rating || attendance.trainer_rating);

            // Only show refund for cancelled bookings to avoid duplicate with refund tab
            const showRefund =
              item.status === 'CANCELLED' &&
              refund !== undefined &&
              refund !== null;

            return (
              <View>
                {item.schedule && (
                  <ClassCard
                    schedule={item.schedule}
                    onPress={() => handleBookingPress(item)}
                    userBooking={item}
                    onCancel={
                      activeTab === 'upcoming' && item.status === 'CONFIRMED'
                        ? () => handleCancelBooking(item)
                        : undefined
                    }
                    showBookingActions={
                      activeTab === 'upcoming' ||
                      (activeTab === 'past' &&
                        String(item.schedule?.status) === 'IN_PROGRESS')
                    }
                    onNavigateToPayment={
                      item.payment_status === 'PENDING'
                        ? () => handleNavigateToPayment(item)
                        : undefined
                    }
                    onScanQR={
                      item.status === 'CONFIRMED' &&
                      (item.payment_status === 'PAID' ||
                        item.payment_status === 'COMPLETED')
                        ? () => {
                            console.log('[ONSCANQR] Navigating to QR scanner', {
                              bookingId: item.id,
                              scheduleId: item.schedule_id,
                              scheduleStatus: String(item.schedule?.status),
                            });
                            router.push('/access/qr-scanner');
                          }
                        : undefined
                    }
                  />
                )}
                {/* Show rating button for past bookings that have been checked out */}
                {activeTab === 'past' && hasCheckedOut && item.schedule && (
                  <View
                    style={{
                      paddingHorizontal: 16,
                      marginTop: 8,
                      marginBottom: 8,
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.ratingButton,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        setRatingModalData({
                          scheduleId: item.schedule_id,
                          className: item.schedule?.gym_class?.name || 'Lớp học',
                          trainerName: item.schedule?.trainer?.full_name || 'Huấn luyện viên',
                          existingRating: attendance
                            ? {
                                class_rating: attendance.class_rating || null,
                                trainer_rating: attendance.trainer_rating || null,
                                feedback_notes: attendance.feedback_notes || null,
                              }
                            : undefined,
                        });
                        setShowRatingModal(true);
                      }}
                    >
                      <View style={styles.ratingButtonContent}>
                        <Star
                          size={18}
                          color={hasRating ? theme.colors.warning : theme.colors.textSecondary}
                          fill={hasRating ? theme.colors.warning : 'transparent'}
                        />
                        <Text
                          style={[
                            styles.ratingButtonText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {hasRating
                            ? t('classes.rating.viewOrEdit', 'Xem/Chỉnh sửa đánh giá')
                            : t('classes.rating.rateClass', 'Đánh giá lớp học')}
                        </Text>
                      </View>
                      {hasRating && (
                        <View style={styles.ratingBadge}>
                          {attendance?.class_rating && (
                            <View style={styles.ratingItem}>
                              <Text
                                style={[
                                  styles.ratingLabel,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {t('classes.rating.class', 'Lớp')}:
                              </Text>
                              <View style={styles.ratingStars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={12}
                                    color={
                                      star <= (attendance.class_rating || 0)
                                        ? theme.colors.warning
                                        : theme.colors.border
                                    }
                                    fill={
                                      star <= (attendance.class_rating || 0)
                                        ? theme.colors.warning
                                        : 'transparent'
                                    }
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                          {attendance?.trainer_rating && (
                            <View style={styles.ratingItem}>
                              <Text
                                style={[
                                  styles.ratingLabel,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {t('classes.rating.trainer', 'HLV')}:
                              </Text>
                              <View style={styles.ratingStars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={12}
                                    color={
                                      star <= (attendance.trainer_rating || 0)
                                        ? theme.colors.warning
                                        : theme.colors.border
                                    }
                                    fill={
                                      star <= (attendance.trainer_rating || 0)
                                        ? theme.colors.warning
                                        : 'transparent'
                                    }
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {/* Show refund info for cancelled bookings */}
                {showRefund && (
                  <View
                    style={{
                      paddingHorizontal: 16,
                      marginTop: -8,
                      marginBottom: 8,
                    }}
                  >
                    <RefundInfoCard
                      refund={refund}
                      showTimelineButton={false}
                    />
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('classes.booking.noBookingsFound')}
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {activeTab === 'upcoming'
                  ? t('classes.booking.emptyUpcomingMessage')
                  : activeTab === 'past'
                  ? t('classes.booking.emptyPastMessage', {
                      tab: t('classes.booking.past').toLowerCase(),
                    })
                  : t('classes.booking.emptyCancelledMessage')}
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  style={[
                    styles.browseButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => router.push('/classes')}
                >
                  <Text
                    style={[
                      styles.browseButtonText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {t('classes.booking.browseClasses')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* IMPROVEMENT: Cancellation Reason Modal */}
      <CancellationReasonModal
        visible={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setBookingToCancel(null);
        }}
        onConfirm={handleConfirmCancellation}
        scheduleStartTime={bookingToCancel?.schedule?.start_time}
        loading={isCancelling}
      />

      {/* Success Modal with Refund Button */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage('');
          setRefundInfo(null);
        }}
        title={t('common.success') || 'Thành công'}
        message={successMessage}
        actionButton={
          refundInfo?.refundId
            ? {
                label: t('classes.refund.viewRefund', 'Xem hoàn tiền') || 'Xem hoàn tiền',
                onPress: () => {
                  setShowSuccessModal(false);
                  router.push({
                    pathname: '/subscription/refund-timeline',
                    params: { refundId: refundInfo.refundId },
                  });
                },
              }
            : undefined
        }
      />

      {/* Class Rating Modal */}
      <ClassRatingModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setRatingModalData(null);
        }}
        onSubmit={async (rating) => {
          if (!ratingModalData?.scheduleId || !member?.id) {
            return;
          }

          try {
            const result = await attendanceService.submitRating(
              ratingModalData.scheduleId,
              member.id,
              rating
            );

            if (result.success) {
              setShowRatingModal(false);
              setRatingModalData(null);
              
              // Reload bookings to update attendance data
              await loadBookings(true);
              
              Alert.alert(
                t('common.success'),
                t('classes.rating.submitSuccess', 'Cảm ơn bạn đã đánh giá!')
              );
            } else {
              Alert.alert(
                t('common.error'),
                result.error || t('classes.rating.submitError', 'Không thể gửi đánh giá')
              );
            }
          } catch (error: any) {
            console.error('[ERROR] Submit class rating error:', error);
            Alert.alert(
              t('common.error'),
              error.message || t('classes.rating.submitError', 'Không thể gửi đánh giá')
            );
          }
        }}
        className={ratingModalData?.className}
        trainerName={ratingModalData?.trainerName}
        existingRating={ratingModalData?.existingRating}
      />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratingButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  ratingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  ratingBadge: {
    marginTop: 12,
    gap: 8,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 12,
    minWidth: 40,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
});
