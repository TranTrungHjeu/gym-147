import AdvancedFiltersModal from '@/components/AdvancedFiltersModal';
import BookingModal from '@/components/BookingModal';
import ClassCard from '@/components/ClassCard';
import ClassRecommendationCard from '@/components/ClassRecommendationCard';
import { ClassCardSkeleton, EmptyState } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  bookingService,
  classService,
  memberService,
  scheduleService,
  trainerService,
  type Booking,
  type ClassRecommendation,
  type CreateBookingRequest,
  type Schedule,
  type ScheduleFilters,
  type Trainer,
} from '@/services';
import { ClassCategory, Difficulty, TrainerStatus } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { DatePicker } from '@/components/ui';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
  Brain,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AppEvents } from '@/utils/eventEmitter';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES: ClassCategory[] = [
  ClassCategory.CARDIO,
  ClassCategory.STRENGTH,
  ClassCategory.YOGA,
  ClassCategory.PILATES,
  ClassCategory.DANCE,
  ClassCategory.MARTIAL_ARTS,
  ClassCategory.AQUA,
  ClassCategory.FUNCTIONAL,
  ClassCategory.RECOVERY,
  ClassCategory.SPECIALIZED,
];

// Animated Category Chip Component
const CategoryChip: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
  themedStyles: any;
}> = ({ label, isSelected, onPress, theme, themedStyles }) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1 : 0.95,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          themedStyles.categoryChip,
          isSelected && {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            themedStyles.categoryText,
            {
              color: isSelected ? theme.colors.textInverse : theme.colors.text,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ClassesScreen() {
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Helper function to get category translation
  const getCategoryTranslation = (category: ClassCategory | 'ALL') => {
    if (category === 'ALL') return t('classes.all');
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

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [memberProfile, setMemberProfile] = useState<any>(null); // Full member profile with membership_type

  // Class recommendations state
  const [classRecommendations, setClassRecommendations] = useState<
    ClassRecommendation[]
  >([]);
  const [recommendationMethod, setRecommendationMethod] = useState<
    string | null
  >(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Embedding states
  const [hasEmbedding, setHasEmbedding] = useState(false);
  const [generatingEmbedding, setGeneratingEmbedding] = useState(false);
  const [reloadingRecommendations, setReloadingRecommendations] =
    useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    ClassCategory | 'ALL'
  >('ALL');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [showRecommendationsModal, setShowRecommendationsModal] =
    useState(false);
  const [showVectorRecommendationsModal, setShowVectorRecommendationsModal] =
    useState(false);

  // Filter modal states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<ScheduleFilters>({});

  // Track if initial load has completed
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingDateChange, setIsLoadingDateChange] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // Cache schedules by date to avoid reloading
  const [schedulesCache, setSchedulesCache] = useState<
    Record<string, Schedule[]>
  >({});

  // Request cancellation for date changes
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce timer for date changes
  const dateChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load member profile on mount
  useEffect(() => {
    if (user?.id && member?.id) {
      loadMemberProfile();
    }
  }, [user?.id, member?.id]);

  // Load data on component mount (only when date changes, NOT category)
  // Also reload when member is loaded (e.g., after registration)
  useEffect(() => {
    if (user?.id) {
      // Clear previous debounce timer
      if (dateChangeTimerRef.current) {
        clearTimeout(dateChangeTimerRef.current);
      }

      // Debounce date changes to avoid spam requests
      if (isInitialLoad) {
        // No debounce for initial load
        loadData(true, false);
        setIsInitialLoad(false);
      } else {
        // Debounce date changes by 300ms
        dateChangeTimerRef.current = setTimeout(() => {
          loadData(false, true); // Skip bookings on date change
        }, 300);
      }
    }

    // Cleanup
    return () => {
      if (dateChangeTimerRef.current) {
        clearTimeout(dateChangeTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedDate, user?.id, member?.id]); // Added member?.id to reload when member is loaded

  // Load class recommendations when member is available
  useEffect(() => {
    if (member?.id) {
      loadClassRecommendations(member.id);
    }
  }, [member?.id]);

  // Load trainers for advanced filters
  useEffect(() => {
    loadTrainers();
  }, []);

  // Listen for schedule:updated events from socket (emitted by cron job or manual updates)
  useEffect(() => {
    const handleScheduleUpdated = (data: any) => {
      try {
        console.log('[CLASSES] schedule:updated event received:', data);

        if (!data?.schedule_id && !data?.schedule?.id) {
          console.warn('[CLASSES] schedule:updated event missing schedule_id');
          return;
        }

        const updatedScheduleId = data.schedule_id || data.schedule?.id;
        const newStatus = data.status || data.schedule?.status;

        if (!newStatus) {
          console.warn('[CLASSES] schedule:updated event missing status');
          return;
        }

        // Update schedule in current schedules list
        setSchedules((prevSchedules) => {
          const updatedSchedules = prevSchedules.map((schedule) => {
            if (schedule.id === updatedScheduleId) {
              console.log(
                `[CLASSES] Updating schedule ${updatedScheduleId} status to ${newStatus}`
              );
              return {
                ...schedule,
                status: newStatus,
                // Update other fields if provided
                ...(data.schedule && {
                  current_bookings:
                    data.schedule.current_bookings ?? schedule.current_bookings,
                  max_capacity:
                    data.schedule.max_capacity ?? schedule.max_capacity,
                  waitlist_count:
                    data.schedule.waitlist_count ?? schedule.waitlist_count,
                }),
              };
            }
            return schedule;
          });
          return updatedSchedules;
        });

        // Also update in cache
        setSchedulesCache((prevCache) => {
          const updatedCache: Record<string, Schedule[]> = {};
          Object.keys(prevCache).forEach((dateKey) => {
            updatedCache[dateKey] = prevCache[dateKey].map((schedule) => {
              if (schedule.id === updatedScheduleId) {
                return {
                  ...schedule,
                  status: newStatus,
                  ...(data.schedule && {
                    current_bookings:
                      data.schedule.current_bookings ??
                      schedule.current_bookings,
                    max_capacity:
                      data.schedule.max_capacity ?? schedule.max_capacity,
                    waitlist_count:
                      data.schedule.waitlist_count ?? schedule.waitlist_count,
                  }),
                };
              }
              return schedule;
            });
          });
          return updatedCache;
        });

        console.log(
          `[CLASSES] ✅ Updated schedule ${updatedScheduleId} status to ${newStatus}`
        );
      } catch (error) {
        console.error(
          '[CLASSES] Error handling schedule:updated event:',
          error
        );
      }
    };

    // Subscribe to schedule:updated events
    const unsubscribe = AppEvents.on('schedule:updated', handleScheduleUpdated);
    console.log('[CLASSES] Subscribed to schedule:updated events');

    // Cleanup on unmount
    return () => {
      console.log('[CLASSES] Unsubscribing from schedule:updated events');
      unsubscribe();
    };
  }, []);

  const loadTrainers = async () => {
    try {
      const response = await trainerService.getTrainers({
        status: TrainerStatus.ACTIVE,
      });
      if (response.success && response.data) {
        setTrainers(response.data);
      }
    } catch (error) {
      // Silent fail - trainers are optional for filters
    }
  };

  // Preload schedules for nearby dates (tomorrow, day after)
  const preloadNearbyDates = useCallback(
    async (currentDate: string) => {
      const datesToPreload: string[] = [];
      const current = new Date(currentDate);

      // Preload tomorrow and day after tomorrow
      for (let i = 1; i <= 2; i++) {
        const nextDate = new Date(current);
        nextDate.setDate(current.getDate() + i);
        const dateStr = nextDate.toISOString().split('T')[0];

        // Only preload if not in cache
        if (!schedulesCache[dateStr]) {
          datesToPreload.push(dateStr);
        }
      }

      // Preload in background (don't block UI)
      if (datesToPreload.length > 0) {
        datesToPreload.forEach(async (dateStr) => {
          try {
            const filters: ScheduleFilters = {
              date_from: dateStr,
              date_to: dateStr,
            };
            const response = await scheduleService.getSchedules(filters);

            if (response.success && response.data) {
              const filteredSchedules = Array.isArray(response.data)
                ? response.data.filter((schedule: Schedule) => {
                    const scheduleDate = new Date(schedule.start_time);
                    const scheduleDateStr = scheduleDate
                      .toISOString()
                      .split('T')[0];
                    return scheduleDateStr === dateStr;
                  })
                : [];

              // Cache the preloaded schedules
              setSchedulesCache((prev) => ({
                ...prev,
                [dateStr]: filteredSchedules,
              }));
            }
          } catch (err) {
            // Silent fail for preload
            console.log('[PRELOAD] Failed to preload date:', dateStr);
          }
        });
      }
    },
    [schedulesCache]
  );

  const loadData = async (showFullLoading = true, skipBookings = false) => {
    try {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Check cache first for date changes
      if (!showFullLoading && schedulesCache[selectedDate]) {
        setSchedules(schedulesCache[selectedDate]);
        setIsLoadingDateChange(false);

        // Preload nearby dates in background
        preloadNearbyDates(selectedDate);
        return;
      }

      // Only show full loading spinner on initial load or manual refresh
      // When changing date, we'll show a subtle indicator instead
      if (showFullLoading) {
        setLoading(true);
      } else {
        // Show subtle loading indicator when changing date
        setIsLoadingDateChange(true);
      }
      setError(null);

      if (!user?.id) {
        setError(t('classes.pleaseLoginToViewClasses'));
        return;
      }

      // Create filters (only date, category will be filtered client-side)
      const filters: ScheduleFilters = {
        date_from: advancedFilters.date_from || selectedDate,
        date_to: advancedFilters.date_to || selectedDate,
        class_category: advancedFilters.class_category,
        trainer_id: advancedFilters.trainer_id,
        difficulty: advancedFilters.difficulty,
        available_only: advancedFilters.available_only,
        // Don't pass category to API - we'll filter client-side for better UX
      };

      // Load schedules (and bookings only on initial load or manual refresh)
      const loadPromises: Promise<any>[] = [
        scheduleService.getSchedules(filters),
      ];

      if (!skipBookings) {
        const memberIdForBookings = member?.id || user.id;
        loadPromises.push(
          bookingService.getMemberBookings(memberIdForBookings)
        );
      }

      const responses = await Promise.all(loadPromises);

      // Check if request was cancelled
      if (abortController.signal.aborted) {
        return;
      }

      const schedulesResponse = responses[0];
      const bookingsResponse = skipBookings ? null : responses[1];

      // Handle schedules
      if (schedulesResponse.success && schedulesResponse.data) {
        // Helper function to format date string in Vietnam timezone (YYYY-MM-DD)
        const formatDateVN = (date: Date | string): string => {
          const d = typeof date === 'string' ? new Date(date) : date;
          // Use toLocaleDateString with Vietnam timezone to get correct date
          const year = d.toLocaleDateString('en-US', {
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
          });
          const month = d.toLocaleDateString('en-US', {
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh',
          });
          const day = d.toLocaleDateString('en-US', {
            day: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh',
          });
          return `${year}-${month}-${day}`;
        };

        // Always filter by selected date on client-side to ensure accuracy
        const filteredSchedules = Array.isArray(schedulesResponse.data)
          ? schedulesResponse.data.filter((schedule: Schedule) => {
              const scheduleDateStr = formatDateVN(schedule.start_time);
              const selectedDateStr = formatDateVN(selectedDate);

              console.log('[DATE_FILTER] Comparing dates:', {
                scheduleId: schedule.id,
                scheduleStartTime: schedule.start_time,
                scheduleDateStr,
                selectedDate,
                selectedDateStr,
                match: scheduleDateStr === selectedDateStr,
              });

              return scheduleDateStr === selectedDateStr;
            })
          : [];

        setSchedules(filteredSchedules);

        // Cache the schedules for this date
        setSchedulesCache((prev) => ({
          ...prev,
          [selectedDate]: filteredSchedules,
        }));

        // Preload nearby dates in background after successful load
        if (!showFullLoading) {
          preloadNearbyDates(selectedDate);
        }
      } else {
        setSchedules([]);
        // Cache empty array too
        setSchedulesCache((prev) => ({
          ...prev,
          [selectedDate]: [],
        }));
      }

      // Handle bookings (only on initial load or manual refresh)
      if (!skipBookings && bookingsResponse) {
        if (bookingsResponse.success && bookingsResponse.data) {
          setMyBookings(bookingsResponse.data);
        } else {
          setMyBookings([]);
        }
      }
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error loading classes data:', err);
      setError(err.message || t('classes.errors.failedToLoadData'));
    } finally {
      if (
        abortControllerRef.current &&
        !abortControllerRef.current.signal.aborted
      ) {
        if (showFullLoading) {
          setLoading(false);
        } else {
          setIsLoadingDateChange(false);
        }
      }
      abortControllerRef.current = null;
    }
  };

  // Load full member profile
  const loadMemberProfile = async () => {
    try {
      if (!member?.id) return;

      const response = await memberService.getMemberProfile();
      if (response.success && response.data) {
        const profile = response.data;
        setMemberProfile(profile);
        // Check if member has embedding
        setHasEmbedding(
          !!profile.profile_embedding &&
            Array.isArray(profile.profile_embedding) &&
            profile.profile_embedding.length > 0
        );
      }
    } catch (err: any) {
      console.error('[ERROR] Error loading member profile:', err);
    }
  };

  // Generate member embedding
  const handleGenerateEmbedding = async () => {
    if (!member?.id) {
      Alert.alert(t('common.error'), t('classes.memberNotFound'));
      return;
    }

    setGeneratingEmbedding(true);
    try {
      const result = await memberService.generateMemberEmbedding(member.id);
      if (result.success) {
        setHasEmbedding(true);
        Alert.alert(t('common.success'), t('classes.embeddingCreated'));
        // Reload recommendations after embedding created
        setTimeout(() => {
          handleReloadRecommendations();
        }, 2000);
      } else {
        Alert.alert(
          t('common.error'),
          result.error || t('classes.embeddingError')
        );
      }
    } catch (err: any) {
      console.error('[ERROR] Error generating embedding:', err);
      Alert.alert(t('common.error'), t('classes.embeddingError'));
    } finally {
      setGeneratingEmbedding(false);
    }
  };

  // Reload recommendations with bypass cache
  const handleReloadRecommendations = async () => {
    if (!member?.id) return;

    setReloadingRecommendations(true);
    try {
      console.log('[RELOAD] Reloading recommendations with bypass cache...');
      const response = await classService.getClassRecommendations(
        member.id,
        true, // useAI
        true, // useVector
        true // skipCache - bypass cache
      );

      if (response.success && response.data?.recommendations) {
        const recommendations = response.data.recommendations;
        const method = response.data.method || 'unknown';
        setClassRecommendations(recommendations);
        setRecommendationMethod(method);
        console.log('[SUCCESS] Reloaded recommendations:', {
          count: recommendations.length,
          method: method,
        });
      } else {
        console.warn('[WARN] No recommendations found after reload');
        setClassRecommendations([]);
      }
    } catch (err: any) {
      console.error('[ERROR] Error reloading recommendations:', err);
    } finally {
      setReloadingRecommendations(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache on manual refresh
    setSchedulesCache({});
    await Promise.all([
      loadMemberProfile(),
      loadData(true, false), // Load bookings on refresh
      member?.id ? loadClassRecommendations(member.id) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  // Load class recommendations
  const loadClassRecommendations = async (memberId: string) => {
    try {
      console.log('[LOAD] [loadClassRecommendations] Starting...', {
        memberId,
      });
      setLoadingRecommendations(true);
      // Use vector-based recommendations (new feature) with AI fallback
      const response = await classService.getClassRecommendations(
        memberId,
        true,
        true
      );

      console.log('[DATA] [loadClassRecommendations] Response received:', {
        success: response.success,
        hasData: !!response.data,
        hasRecommendations: !!response.data?.recommendations,
        recommendationsCount: response.data?.recommendations?.length || 0,
        method: response.data?.method,
        error: response.error,
      });

      if (response.success && response.data?.recommendations) {
        const recommendations = response.data.recommendations;
        const method = response.data.method || 'unknown';
        setClassRecommendations(recommendations);
        setRecommendationMethod(method);
        console.log(
          '[SUCCESS] [loadClassRecommendations] Loaded recommendations:',
          {
            count: recommendations.length,
            method: method,
            firstRec: recommendations[0]
              ? {
                  type: recommendations[0].type,
                  title: recommendations[0].title,
                  priority: recommendations[0].priority,
                  data: recommendations[0].data,
                }
              : null,
          }
        );
      } else {
        console.warn(
          '[WARN] [loadClassRecommendations] No recommendations found:',
          {
            success: response.success,
            hasData: !!response.data,
            error: response.error,
          }
        );
        setClassRecommendations([]);
      }
    } catch (err: any) {
      console.error(
        '[ERROR] [loadClassRecommendations] Error loading class recommendations:',
        {
          message: err.message,
          stack: err.stack,
          memberId,
        }
      );
      setClassRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
      console.log(
        '[SUCCESS] [loadClassRecommendations] Finished, loadingRecommendations:',
        false
      );
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: ClassCategory | 'ALL') => {
    setSelectedCategory(category);
  };

  const handleDateChange = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    // This will trigger useEffect to reload data with new date filter
    // Don't show full loading spinner, just silently update
  };

  const navigateDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const dateString = currentDate.toISOString().split('T')[0];
    setSelectedDate(dateString);
    // useEffect will handle reloading data with new date
    // No need to manually call loadData here
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push(`/classes/${schedule.id}`);
  };

  const handleBookClass = (schedule: Schedule) => {
    // Check if user already has a booking for this schedule
    const existingBooking = myBookings.find(
      (booking) =>
        booking.schedule_id === schedule.id ||
        booking.schedule?.id === schedule.id
    );

    // If user has pending payment booking, navigate to payment screen
    if (existingBooking?.payment_status === 'PENDING') {
      router.push(`/classes/${schedule.id}`);
      return;
    }

    // If user already booked and paid, show message
    if (
      existingBooking &&
      (existingBooking.payment_status === 'PAID' ||
        existingBooking.payment_status === 'COMPLETED') &&
      existingBooking.status === 'CONFIRMED'
    ) {
      Alert.alert(t('common.info'), t('classes.booking.alreadyEnrolled'));
      return;
    }

    setSelectedSchedule(schedule);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (bookingData: CreateBookingRequest) => {
    try {
      // Ensure member_id is included from auth context
      if (!member?.id) {
        Alert.alert(
          t('common.error'),
          t('classes.errors.memberRegistrationRequired') ||
            'Vui lòng đăng ký hội viên trước khi đặt lịch'
        );
        return;
      }

      // Set loading state
      setIsBookingLoading(true);

      // Add member_id to booking data
      const bookingDataWithMember: CreateBookingRequest = {
        ...bookingData,
        member_id: member.id,
      };

      console.log('[BOOKING] Creating booking with data:', {
        schedule_id: bookingDataWithMember.schedule_id,
        member_id: bookingDataWithMember.member_id,
        hasSpecialNeeds: !!bookingDataWithMember.special_needs,
        hasNotes: !!bookingDataWithMember.notes,
      });

      const response = await bookingService.createBooking(
        bookingDataWithMember
      );

      if (response.success) {
        setShowBookingModal(false);
        setSelectedSchedule(null);

        // Check if this is a waitlist booking
        const isWaitlistBooking =
          (response as any).is_waitlist || response.data?.is_waitlist;
        const waitlistPosition =
          (response as any).waitlist_position ||
          response.data?.waitlist_position;

        if (isWaitlistBooking) {
          const message = waitlistPosition
            ? t('classes.booking.waitlistSuccessWithPosition', {
                position: waitlistPosition,
              }) ||
              `Lớp học đã đầy. Bạn đã được thêm vào danh sách chờ ở vị trí ${waitlistPosition}`
            : t('classes.booking.waitlistSuccess') ||
              'Lớp học đã đầy. Bạn đã được thêm vào danh sách chờ';
          Alert.alert(t('common.success'), message);
        } else {
          Alert.alert(t('common.success'), t('classes.booking.bookingSuccess'));
        }

        // Refresh data
        await loadData();
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('classes.booking.bookingFailed')
        );
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('classes.booking.bookingFailed')
      );
    } finally {
      setIsBookingLoading(false);
    }
  };

  const handleMyBookingsPress = () => {
    router.push('/classes/my-bookings');
  };

  const filteredSchedules = React.useMemo(() => {
    // Helper function to format date string in Vietnam timezone (YYYY-MM-DD)
    const formatDateVN = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      // Use toLocaleDateString with Vietnam timezone to get correct date
      const year = d.toLocaleDateString('en-US', {
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      const month = d.toLocaleDateString('en-US', {
        month: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      const day = d.toLocaleDateString('en-US', {
        day: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      return `${year}-${month}-${day}`;
    };

    console.log('[SEARCH] Filtering schedules:', {
      totalSchedules: schedules?.length || 0,
      selectedDate,
      selectedCategory,
      searchQuery,
      advancedFilters,
    });

    return (schedules || []).filter((schedule) => {
      // Date filter (client-side - ensure we only show schedules for selected date)
      // This is a safety check in case API doesn't filter correctly
      // Use Vietnam timezone for accurate date comparison
      const scheduleDateStr = formatDateVN(schedule.start_time);
      const selectedDateStr = formatDateVN(
        advancedFilters.date_from || selectedDate
      );

      console.log('[DATE_FILTER_MEMO] Comparing dates:', {
        scheduleId: schedule.id,
        scheduleStartTime: schedule.start_time,
        scheduleDateStr,
        selectedDate,
        selectedDateStr,
        match: scheduleDateStr === selectedDateStr,
      });

      if (scheduleDateStr !== selectedDateStr) {
        return false;
      }

      // Category filter (client-side)
      if (selectedCategory !== 'ALL') {
        if (schedule.gym_class?.category !== selectedCategory) {
          return false;
        }
      }

      // Advanced filter: Category
      if (advancedFilters.class_category) {
        if (schedule.gym_class?.category !== advancedFilters.class_category) {
          return false;
        }
      }

      // Search filter
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const className = schedule.gym_class?.name || '';
        const classDesc = schedule.gym_class?.description || '';
        const trainerName = schedule.trainer?.full_name || '';

        const matchesSearch =
          className.toLowerCase().includes(query) ||
          classDesc.toLowerCase().includes(query) ||
          trainerName.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // Advanced filter: Difficulty
      if (advancedFilters.difficulty) {
        if (schedule.gym_class?.difficulty !== advancedFilters.difficulty) {
          return false;
        }
      }

      // Advanced filter: Trainer
      if (advancedFilters.trainer_id) {
        if (schedule.trainer_id !== advancedFilters.trainer_id) {
          return false;
        }
      }

      // Advanced filter: Available only
      if (advancedFilters.available_only) {
        if (schedule.current_bookings >= schedule.max_capacity) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, selectedCategory, searchQuery, selectedDate, advancedFilters]);

  const getUpcomingBookings = () => {
    const now = new Date();
    return myBookings.filter((booking) => {
      const startTime = new Date(booking.schedule?.start_time || '');
      return booking.status === 'CONFIRMED' && startTime >= now;
    });
  };

  const upcomingBookings = getUpcomingBookings();

  const themedStyles = styles(theme);

  // Show loading state with skeleton
  if (loading && schedules.length === 0) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.header}>
          <Text
            style={[themedStyles.headerTitle, { color: theme.colors.text }]}
          >
            {t('classes.title')}
          </Text>
        </View>
        <ScrollView
          style={themedStyles.content}
          contentContainerStyle={themedStyles.listContent}
        >
          {[1, 2, 3].map((i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.errorContainer}>
          <Text style={[themedStyles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[
              themedStyles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => loadData(true)}
          >
            <Text
              style={[
                themedStyles.retryButtonText,
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
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* Compact Header */}
      <View style={themedStyles.header}>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('classes.title')}
        </Text>
        <View style={themedStyles.headerRight}>
          {/* AI Recommendations Button */}
          <TouchableOpacity
            style={themedStyles.headerIconButton}
            onPress={() => setShowRecommendationsModal(true)}
            activeOpacity={0.7}
          >
            <Brain size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={themedStyles.headerButton}
            onPress={handleMyBookingsPress}
            activeOpacity={0.7}
          >
            <Text
              style={[
                themedStyles.headerButtonText,
                { color: theme.colors.primary },
              ]}
            >
              {t('classes.myBookings')} ({upcomingBookings.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Filter Section - All in one */}
      <View style={themedStyles.filterSection}>
        {/* Search Bar */}
        <View style={themedStyles.searchRow}>
          <View
            style={[
              themedStyles.searchInputContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Search size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[themedStyles.searchInput, { color: theme.colors.text }]}
              placeholder={t('classes.searchPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          <TouchableOpacity
            style={[
              themedStyles.filterButton,
              {
                backgroundColor:
                  showFilterModal || selectedCategory !== 'ALL'
                    ? theme.colors.primary
                    : theme.colors.surface,
              },
            ]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Filter
              size={18}
              color={
                showFilterModal || selectedCategory !== 'ALL'
                  ? theme.colors.textInverse
                  : theme.colors.text
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Classes List with Recommendations and Suggestions as Header */}
      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            {/* Classes Count Header */}
            {filteredSchedules.length > 0 && (
              <View
                style={{
                  paddingHorizontal: theme.spacing.lg,
                  paddingBottom: theme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[
                    {
                      ...Typography.h6,
                      color: theme.colors.text,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {filteredSchedules.length}{' '}
                  {filteredSchedules.length === 1
                    ? t('classes.classFound') || 'lớp học'
                    : t('classes.classesFound') || 'lớp học'}
                </Text>
                {(searchQuery || selectedCategory !== 'ALL') && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                    }}
                    style={{
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                    }}
                  >
                    <Text
                      style={[
                        {
                          ...Typography.bodySmall,
                          color: theme.colors.primary,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {t('common.clear') || 'Xóa bộ lọc'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
        renderItem={({ item }) => {
          // Find user's booking for this schedule
          // Check both schedule_id directly and nested schedule.id
          const userBooking = myBookings.find((booking) => {
            const bookingScheduleId =
              booking.schedule_id || booking.schedule?.id;
            const matches = bookingScheduleId === item.id;

            return matches;
          });

          return (
            <ClassCard
              schedule={item}
              onPress={() => handleSchedulePress(item)}
              onBook={() => handleBookClass(item)}
              showBookingActions={true}
              userBooking={userBooking || null}
              onNavigateToPayment={() => {
                // Navigate to class detail screen
                router.push(`/classes/${item.id}`);
              }}
            />
          );
        }}
        contentContainerStyle={themedStyles.listContent}
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
          isLoadingDateChange ? (
            <View style={themedStyles.loadingEmptyState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[
                  themedStyles.loadingEmptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('classes.loadingClasses') || 'Đang tải lớp học...'}
              </Text>
            </View>
          ) : (
            <EmptyState
              title={t('classes.noClassesFound') || 'No classes found'}
              description={
                searchQuery || selectedCategory !== 'ALL'
                  ? t('classes.tryDifferentFilters') ||
                    'Try adjusting your filters or search'
                  : t('classes.noClassesForDate') ||
                    t('classes.noClassesForDate')
              }
              actionLabel={t('classes.viewAll') || 'View All Classes'}
              onAction={() => {
                router.push('/classes/all');
              }}
            />
          )
        }
      />

      {/* Filter Modal - Date and Category */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={themedStyles.filterModalOverlay}>
          <TouchableOpacity
            style={themedStyles.filterModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={[
              themedStyles.filterModalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                themedStyles.filterModalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={themedStyles.filterModalHeaderLeft}>
                <View
                  style={[
                    themedStyles.filterModalIconContainer,
                    { backgroundColor: theme.colors.primary + '15' },
                  ]}
                >
                  <Filter size={24} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    themedStyles.filterModalTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('classes.filters') || 'Bộ lọc'}
                </Text>
              </View>
              <TouchableOpacity
                style={themedStyles.filterModalCloseButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={themedStyles.filterModalBody}
              contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
              showsVerticalScrollIndicator={false}
            >
              {/* Date Selector Section */}
              <View
                style={[
                  themedStyles.filterModalSection,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    themedStyles.filterModalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('classes.selectDate') || 'Chọn ngày'}
                </Text>
                <View
                  style={[
                    themedStyles.filterDateContainer,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <TouchableOpacity
                    style={themedStyles.filterDateNavButton}
                    onPress={() => navigateDate(-1)}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={18} color={theme.colors.primary} />
                  </TouchableOpacity>

                  <View style={themedStyles.filterDateContent}>
                    <DatePicker
                      value={new Date(selectedDate)}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                      maximumDate={
                        new Date(
                          new Date().getTime() + 90 * 24 * 60 * 60 * 1000
                        ) // 90 days from now
                      }
                      mode="date"
                      placeholder={new Date(selectedDate).toLocaleDateString(
                        t('common.locale') || 'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                        }
                      )}
                    />
                  </View>

                  <TouchableOpacity
                    style={themedStyles.filterDateNavButton}
                    onPress={() => navigateDate(1)}
                    activeOpacity={0.7}
                  >
                    <ChevronRight size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category Filter Section */}
              <View
                style={[
                  themedStyles.filterModalSection,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    themedStyles.filterModalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('classes.selectCategory') || 'Chọn loại lớp'}
                </Text>
                <View style={themedStyles.filterCategoryGrid}>
                  <CategoryChip
                    label={t('classes.all')}
                    isSelected={selectedCategory === 'ALL'}
                    onPress={() => {
                      handleCategorySelect('ALL');
                    }}
                    theme={theme}
                    themedStyles={themedStyles}
                  />
                  {CATEGORIES.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <CategoryChip
                        key={category}
                        label={getCategoryTranslation(category)}
                        isSelected={isSelected}
                        onPress={() => {
                          handleCategorySelect(category);
                        }}
                        theme={theme}
                        themedStyles={themedStyles}
                      />
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View
              style={[
                themedStyles.filterModalFooter,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  themedStyles.filterModalResetButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => {
                  setSelectedCategory('ALL');
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    themedStyles.filterModalResetButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('common.reset') || 'Đặt lại'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  themedStyles.filterModalApplyButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    themedStyles.filterModalApplyButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('common.apply') || 'Áp dụng'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Vector Embedding Recommendations Modal */}
      <Modal
        visible={showVectorRecommendationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVectorRecommendationsModal(false)}
      >
        <View style={themedStyles.filterModalOverlay}>
          <TouchableOpacity
            style={themedStyles.filterModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowVectorRecommendationsModal(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={[
              themedStyles.filterModalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                themedStyles.filterModalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={themedStyles.filterModalHeaderLeft}>
                <View
                  style={[
                    themedStyles.filterModalIconContainer,
                    { backgroundColor: theme.colors.primary + '15' },
                  ]}
                >
                  <Brain size={24} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    themedStyles.filterModalTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('classes.vectorRecommendations') || 'Gợi ý theo AI Vector'}
                </Text>
              </View>
              <TouchableOpacity
                style={themedStyles.filterModalCloseButton}
                onPress={() => setShowVectorRecommendationsModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={themedStyles.filterModalBody}
              contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
              showsVerticalScrollIndicator={false}
            >
              {/* Description */}
              <Text
                style={[
                  themedStyles.filterModalSectionTitle,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.md,
                  },
                ]}
              >
                {t('classes.vectorRecommendationsDescription') ||
                  'Gợi ý lớp học dựa trên vector embedding, phân tích sâu về mục tiêu và sở thích của bạn'}
              </Text>

              {/* Loading State */}
              {loadingRecommendations ? (
                <View style={themedStyles.loadingEmptyState}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      themedStyles.loadingEmptyStateText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('classes.loadingVectorRecommendations') ||
                      'Đang tải gợi ý AI...'}
                  </Text>
                </View>
              ) : (
                (() => {
                  // Filter vector recommendations - check type, method, and data fields
                  const vectorRecommendations = classRecommendations.filter(
                    (rec) =>
                      rec.type === 'VECTOR_RECOMMENDATION' ||
                      rec.data?.similarity !== undefined ||
                      rec.data?.finalScore !== undefined ||
                      recommendationMethod === 'vector_embedding'
                  );

                  console.log('[VECTOR_MODAL] Filtered recommendations:', {
                    total: classRecommendations.length,
                    vector: vectorRecommendations.length,
                    method: recommendationMethod,
                    allTypes: classRecommendations.map((r) => r.type),
                    allData: classRecommendations.map((r) => ({
                      type: r.type,
                      hasSimilarity: !!r.data?.similarity,
                      hasFinalScore: !!r.data?.finalScore,
                      classId: r.data?.classId,
                    })),
                  });

                  // If method is vector_embedding, show all recommendations (they're all vector-based)
                  // Otherwise, only show filtered vector recommendations
                  const recommendationsToShow =
                    recommendationMethod === 'vector_embedding'
                      ? classRecommendations
                      : vectorRecommendations;

                  console.log('[VECTOR_MODAL] Rendering recommendations:', {
                    method: recommendationMethod,
                    recommendationsToShowCount: recommendationsToShow.length,
                    willRender: recommendationsToShow.length > 0,
                    firstRec: recommendationsToShow[0]
                      ? {
                          type: recommendationsToShow[0].type,
                          title: recommendationsToShow[0].title,
                          data: recommendationsToShow[0].data,
                        }
                      : null,
                  });

                  return recommendationsToShow.length > 0 ? (
                    <View style={{ gap: theme.spacing.md }}>
                      {recommendationsToShow.map((recommendation, index) => {
                        console.log(
                          `[VECTOR_MODAL] Rendering recommendation ${index}:`,
                          {
                            type: recommendation.type,
                            title: recommendation.title,
                            hasData: !!recommendation.data,
                          }
                        );
                        return (
                          <ClassRecommendationCard
                            key={`vector-${index}-${
                              recommendation.data?.classId ||
                              recommendation.type
                            }`}
                            recommendation={recommendation}
                            onPress={async () => {
                              console.log(
                                '[VECTOR_MODAL] Recommendation pressed:',
                                {
                                  action: recommendation.action,
                                  data: recommendation.data,
                                  type: recommendation.type,
                                }
                              );
                              setShowVectorRecommendationsModal(false);

                              try {
                                // Handle navigation based on recommendation action and data
                                // Priority: scheduleId > find schedule from classId > classId > category
                                if (recommendation.data?.scheduleId) {
                                  // Navigate to schedule detail page (for booking)
                                  console.log(
                                    '[VECTOR_MODAL] Navigating to schedule:',
                                    recommendation.data.scheduleId
                                  );
                                  router.push(
                                    `/classes/${recommendation.data.scheduleId}`
                                  );
                                } else if (recommendation.data?.classId) {
                                  // Find the earliest upcoming schedule for this class
                                  console.log(
                                    '[VECTOR_MODAL] Finding schedule for class:',
                                    recommendation.data.classId
                                  );
                                  try {
                                    const filters = {
                                      class_category:
                                        recommendation.data?.classCategory,
                                      date_from: new Date()
                                        .toISOString()
                                        .split('T')[0],
                                      available_only: true,
                                    };
                                    const response =
                                      await scheduleService.getSchedules(
                                        filters
                                      );

                                    if (response.success && response.data) {
                                      // Find schedule for this specific class
                                      const classSchedules = Array.isArray(
                                        response.data
                                      )
                                        ? response.data.filter(
                                            (s: Schedule) =>
                                              s.gym_class?.id ===
                                                recommendation.data.classId ||
                                              s.class_id ===
                                                recommendation.data.classId
                                          )
                                        : [];

                                      if (classSchedules.length > 0) {
                                        // Sort by start_time and get the earliest one
                                        const sortedSchedules =
                                          classSchedules.sort(
                                            (a: Schedule, b: Schedule) =>
                                              new Date(a.start_time).getTime() -
                                              new Date(b.start_time).getTime()
                                          );
                                        const earliestSchedule =
                                          sortedSchedules[0];
                                        console.log(
                                          '[VECTOR_MODAL] Found schedule, navigating:',
                                          earliestSchedule.id
                                        );
                                        router.push(
                                          `/classes/${earliestSchedule.id}`
                                        );
                                      } else {
                                        // No schedule found, navigate to classes list with category filter
                                        console.log(
                                          '[VECTOR_MODAL] No schedule found, navigating to category:',
                                          recommendation.data.classCategory
                                        );
                                        if (
                                          recommendation.data?.classCategory
                                        ) {
                                          router.push(
                                            `/classes?category=${recommendation.data.classCategory}`
                                          );
                                        } else {
                                          router.push('/classes');
                                        }
                                      }
                                    } else {
                                      // Fallback: navigate to classes list
                                      if (recommendation.data?.classCategory) {
                                        router.push(
                                          `/classes?category=${recommendation.data.classCategory}`
                                        );
                                      } else {
                                        router.push('/classes');
                                      }
                                    }
                                  } catch (error) {
                                    console.error(
                                      '[VECTOR_MODAL] Error finding schedule:',
                                      error
                                    );
                                    // Fallback: navigate to classes list with category
                                    if (recommendation.data?.classCategory) {
                                      router.push(
                                        `/classes?category=${recommendation.data.classCategory}`
                                      );
                                    } else {
                                      router.push('/classes');
                                    }
                                  }
                                } else if (recommendation.data?.classCategory) {
                                  // Navigate to classes list with category filter
                                  console.log(
                                    '[VECTOR_MODAL] Navigating to category:',
                                    recommendation.data.classCategory
                                  );
                                  router.push(
                                    `/classes?category=${recommendation.data.classCategory}`
                                  );
                                } else {
                                  console.warn(
                                    '[VECTOR_MODAL] No valid navigation data in recommendation:',
                                    recommendation
                                  );
                                  router.push('/classes');
                                }
                              } catch (error) {
                                console.error(
                                  '[VECTOR_MODAL] Navigation error:',
                                  error
                                );
                                router.push('/classes');
                              }
                            }}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <View style={themedStyles.loadingEmptyState}>
                      <Text
                        style={[
                          themedStyles.loadingEmptyStateText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('classes.noVectorRecommendations') ||
                          'Chưa có gợi ý vector embedding. Vui lòng cập nhật profile để nhận gợi ý.'}
                      </Text>
                      <Text
                        style={[
                          themedStyles.loadingEmptyStateText,
                          {
                            color: theme.colors.textSecondary,
                            marginTop: theme.spacing.sm,
                            fontSize: 12,
                          },
                        ]}
                      >
                        {`Tổng số recommendations: ${classRecommendations.length}`}
                      </Text>
                    </View>
                  );
                })()
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Recommendations Modal */}
      <Modal
        visible={showRecommendationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecommendationsModal(false)}
      >
        <View style={themedStyles.filterModalOverlay}>
          <TouchableOpacity
            style={themedStyles.filterModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRecommendationsModal(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={[
              themedStyles.filterModalContent,
              {
                backgroundColor: theme.colors.background,
                maxHeight: '92%',
                flex: 1,
              },
            ]}
          >
            {/* Modal Header - Enhanced Design */}
            <View
              style={[
                themedStyles.filterModalHeader,
                {
                  borderBottomColor: theme.colors.border,
                  paddingVertical: 16,
                },
              ]}
            >
              <View style={themedStyles.filterModalHeaderLeft}>
                <View
                  style={[
                    themedStyles.filterModalIconContainer,
                    {
                      backgroundColor: theme.colors.primary + '20',
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                    },
                  ]}
                >
                  <Brain size={24} color={theme.colors.primary} />
                </View>
                <View>
                  <Text
                    style={[
                      themedStyles.filterModalTitle,
                      {
                        color: theme.colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {t('classes.recommendations') || 'Gợi ý AI'}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {recommendationMethod === 'vector_embedding'
                      ? 'Vector Embedding'
                      : recommendationMethod === 'ai_based'
                      ? 'AI Analysis'
                      : 'Smart Recommendations'}
                  </Text>
                </View>
              </View>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                {/* Generate Embedding Button - only show when member doesn't have embedding */}
                {member?.id && !hasEmbedding && (
                  <TouchableOpacity
                    style={[
                      themedStyles.headerIconButton,
                      {
                        backgroundColor:
                          (theme.colors.warning || '#F59E0B') + '20',
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                      },
                    ]}
                    onPress={handleGenerateEmbedding}
                    activeOpacity={0.7}
                    disabled={generatingEmbedding}
                  >
                    {generatingEmbedding ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.warning || '#F59E0B'}
                      />
                    ) : (
                      <Sparkles
                        size={20}
                        color={theme.colors.warning || '#F59E0B'}
                      />
                    )}
                  </TouchableOpacity>
                )}
                {/* Reload Recommendations Button - bypass cache */}
                <TouchableOpacity
                  style={[
                    themedStyles.headerIconButton,
                    {
                      backgroundColor: theme.colors.primary + '20',
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                    },
                  ]}
                  onPress={handleReloadRecommendations}
                  activeOpacity={0.7}
                  disabled={reloadingRecommendations}
                >
                  {reloadingRecommendations ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  ) : (
                    <RefreshCw size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    themedStyles.filterModalCloseButton,
                    {
                      backgroundColor: theme.colors.surface,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                    },
                  ]}
                  onPress={() => setShowRecommendationsModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Bar */}
            {classRecommendations.length > 0 &&
              !loadingRecommendations &&
              !reloadingRecommendations && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: theme.colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: 20,
                        fontWeight: '700',
                      }}
                    >
                      {classRecommendations.length}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 11,
                      }}
                    >
                      Gợi ý
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        color: '#EF4444',
                        fontSize: 20,
                        fontWeight: '700',
                      }}
                    >
                      {
                        classRecommendations.filter(
                          (r) => r.priority === 'HIGH'
                        ).length
                      }
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 11,
                      }}
                    >
                      Ưu tiên cao
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        color: '#10B981',
                        fontSize: 20,
                        fontWeight: '700',
                      }}
                    >
                      {hasEmbedding ? '✓' : '—'}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 11,
                      }}
                    >
                      Vector AI
                    </Text>
                  </View>
                </View>
              )}

            {/* Modal Body */}
            <ScrollView
              style={[themedStyles.filterModalBody, { flex: 1 }]}
              contentContainerStyle={{
                paddingBottom: 120,
                paddingHorizontal: 16,
                paddingTop: 16,
              }}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Loading State */}
              {loadingRecommendations || reloadingRecommendations ? (
                <View
                  style={[
                    themedStyles.loadingEmptyState,
                    { paddingVertical: 60 },
                  ]}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: theme.colors.primary + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      themedStyles.loadingEmptyStateText,
                      {
                        color: theme.colors.text,
                        fontSize: 16,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {reloadingRecommendations
                      ? 'Đang tải gợi ý mới...'
                      : t('classes.loadingClasses') || 'Đang phân tích...'}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 13,
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    AI đang phân tích sở thích và lịch sử tập luyện của bạn
                  </Text>
                </View>
              ) : classRecommendations.length > 0 ? (
                <View style={{ gap: 0 }}>
                  {classRecommendations.map((recommendation, index) => (
                    <ClassRecommendationCard
                      key={index}
                      recommendation={recommendation}
                      onPress={() => {
                        setShowRecommendationsModal(false);
                        // Handle navigation based on recommendation action
                        if (recommendation.data?.scheduleId) {
                          router.push(
                            `/classes/${recommendation.data.scheduleId}`
                          );
                        } else if (recommendation.data?.classId) {
                          router.push(
                            `/classes/${recommendation.data.classId}`
                          );
                        }
                      }}
                    />
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    themedStyles.loadingEmptyState,
                    { paddingVertical: 60 },
                  ]}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: theme.colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Brain size={36} color={theme.colors.textSecondary} />
                  </View>
                  <Text
                    style={[
                      themedStyles.loadingEmptyStateText,
                      {
                        color: theme.colors.text,
                        fontSize: 16,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {t('classes.noRecommendations') || 'Chưa có gợi ý'}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 13,
                      marginTop: 8,
                      textAlign: 'center',
                      paddingHorizontal: 20,
                    }}
                  >
                    {!hasEmbedding
                      ? 'Nhấn nút ✨ để tạo Vector AI và nhận gợi ý phù hợp'
                      : 'Hãy tham gia thêm lớp học để AI có thể hiểu sở thích của bạn'}
                  </Text>
                  {!hasEmbedding && (
                    <TouchableOpacity
                      style={{
                        marginTop: 20,
                        backgroundColor: theme.colors.primary,
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onPress={handleGenerateEmbedding}
                      disabled={generatingEmbedding}
                    >
                      {generatingEmbedding ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Sparkles size={18} color="#FFFFFF" />
                      )}
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                        Tạo Vector AI
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        visible={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(filters) => {
          setAdvancedFilters(filters);
          setShowAdvancedFilters(false);
          // Reload data with new filters
          loadData(true);
        }}
        initialFilters={advancedFilters}
        trainers={trainers}
      />

      {/* Booking Modal */}
      {selectedSchedule && (
        <BookingModal
          visible={showBookingModal}
          schedule={selectedSchedule}
          onClose={() => {
            if (!isBookingLoading) {
              setShowBookingModal(false);
              setSelectedSchedule(null);
            }
          }}
          onConfirm={handleBookingConfirm}
          loading={isBookingLoading}
          userBooking={
            myBookings.find(
              (booking) =>
                booking.schedule_id === selectedSchedule.id ||
                booking.schedule?.id === selectedSchedule.id
            ) || null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
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
      paddingVertical: theme.spacing.sm + 2,
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
      paddingTop: theme.spacing.md + 4,
      paddingBottom: theme.spacing.sm + 2,
      backgroundColor: theme.colors.background,
    },
    headerTitle: {
      ...Typography.h2,
      fontWeight: '700',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    headerButton: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    headerButtonText: {
      ...Typography.bodySmall,
      fontWeight: '600',
      fontSize: 12,
    },
    filterSection: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      ...Typography.bodySmall,
      flex: 1,
      fontSize: 14,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs + 2,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    dateNavButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '15',
    },
    dateContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    dateText: {
      ...Typography.bodySmall,
      fontWeight: '600',
      fontSize: 13,
    },
    categoryContainer: {
      flexGrow: 0,
    },
    categoryContent: {
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    categoryChip: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryText: {
      ...Typography.bodySmall,
      fontWeight: '500',
      fontSize: 12,
    },
    recommendationsSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    recommendationsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    recommendationsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    recommendationsTitle: {
      ...Typography.h5,
      fontWeight: '700',
    },
    recommendationsDescription: {
      ...Typography.bodySmall,
      marginBottom: theme.spacing.md,
    },
    recommendationsLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    recommendationsLoadingText: {
      ...Typography.bodyMedium,
    },
    recommendationsContainer: {
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.md,
      width: '100%',
    },
    recommendationCard: {
      width: 280,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
      ...theme.shadows.sm,
    },
    recommendationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    recommendationIconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    recommendationContent: {
      flex: 1,
    },
    recommendationTitle: {
      ...Typography.h6,
      fontWeight: '600',
      marginBottom: 4,
    },
    recommendationPriority: {
      ...Typography.caption,
      fontWeight: '600',
      textTransform: 'uppercase',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    recommendationMessage: {
      ...Typography.bodySmall,
      lineHeight: 20,
      marginTop: theme.spacing.xs,
    },
    recommendationReasoning: {
      ...Typography.caption,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
      opacity: 0.7,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl + 8,
    },
    loadingEmptyState: {
      flex: 1,
      minHeight: 300,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    loadingEmptyStateText: {
      ...Typography.bodyLarge,
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyText: {
      ...Typography.h5,
      marginBottom: theme.spacing.xs,
    },
    emptySubtext: {
      ...Typography.bodyMedium,
      textAlign: 'center',
      opacity: 0.7,
    },
    filterModal: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    filterContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.lg, // 12px - square
      borderTopRightRadius: theme.radius.lg, // 12px - square
      maxHeight: '85%',
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterTitle: {
      ...Typography.h3,
    },
    resetFilterButton: {
      padding: theme.spacing.xs,
    },
    resetFilterText: {
      ...Typography.buttonMedium,
    },
    filterBody: {
      flex: 1,
    },
    filterSectionTitle: {
      ...Typography.h5,
      marginBottom: theme.spacing.md,
    },
    filterOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    filterOption: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg, // 12px - square
      borderWidth: 1,
    },
    filterOptionText: {
      ...Typography.bodyMedium,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleTitle: {
      ...Typography.h6,
      marginBottom: theme.spacing.xs,
    },
    toggleSubtitle: {
      ...Typography.bodySmall,
    },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: theme.radius.round,
      padding: 4,
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.round,
      ...theme.shadows.sm,
    },
    filterFooter: {
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    applyButton: {
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg, // 12px - square
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    applyButtonText: {
      ...Typography.h5,
    },
    filterModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    filterModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    filterModalContent: {
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      maxHeight: '85%',
      minHeight: 400,
      ...theme.shadows.lg,
    },
    filterModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
    },
    filterModalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    filterModalIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterModalTitle: {
      ...Typography.h5,
      fontWeight: '700',
    },
    filterModalCloseButton: {
      padding: theme.spacing.xs,
    },
    filterModalBody: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    filterModalSection: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
    },
    filterModalSectionTitle: {
      ...Typography.bodyLarge,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    filterDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterDateNavButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '15',
    },
    filterDateContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    filterCategoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    advancedFiltersLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
    },
    advancedFiltersLinkText: {
      ...Typography.bodyMedium,
      fontWeight: '600',
    },
    filterModalFooter: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
    },
    filterModalResetButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterModalResetButtonText: {
      ...Typography.buttonMedium,
      fontWeight: '600',
    },
    filterModalApplyButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterModalApplyButtonText: {
      ...Typography.buttonMedium,
      fontWeight: '600',
    },
  });
