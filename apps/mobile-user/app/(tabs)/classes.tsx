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
  type Booking,
  type ClassRecommendation,
  type CreateBookingRequest,
  type Schedule,
  type ScheduleFilters,
} from '@/services';
import { ClassCategory } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
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
              color: isSelected
                ? theme.colors.textInverse
                : theme.colors.text,
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
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    ClassCategory | 'ALL'
  >('ALL');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );

  // Advanced filter states
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Track if initial load has completed
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingDateChange, setIsLoadingDateChange] = useState(false);

  // Load member profile on mount
  useEffect(() => {
    if (user?.id && member?.id) {
      loadMemberProfile();
    }
  }, [user?.id, member?.id]);

  // Load data on component mount (only when date changes, NOT category)
  useEffect(() => {
    if (user?.id) {
      // Show full loading only on initial load, not on date changes
      loadData(isInitialLoad);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [selectedDate, user?.id]); // Removed selectedCategory from dependencies

  // Load class recommendations when member is available
  useEffect(() => {
    if (member?.id) {
      loadClassRecommendations(member.id);
    }
  }, [member?.id]);

  const loadData = async (showFullLoading = true) => {
    try {
      // Only show full loading spinner on initial load or manual refresh
      // When changing date, we'll show a subtle indicator instead
      if (showFullLoading) {
        setLoading(true);
      } else {
        // Show subtle loading indicator when changing date
        setIsLoadingDateChange(true);
      }
      setError(null);

      // Reset schedules immediately when loading new date to prevent showing old data
      setSchedules([]);

      if (!user?.id) {
        setError('Please login to view classes');
        return;
      }

      // Create filters (only date, category will be filtered client-side)
      const filters: ScheduleFilters = {
        date_from: selectedDate,
        date_to: selectedDate,
        // Don't pass category to API - we'll filter client-side for better UX
      };

      // Load schedules and bookings in parallel
      const memberIdForBookings = member?.id || user.id;
      const [schedulesResponse, bookingsResponse] = await Promise.all([
        scheduleService.getSchedules(filters),
        bookingService.getMemberBookings(memberIdForBookings),
      ]);

      // Handle schedules
      if (schedulesResponse.success && schedulesResponse.data) {
        // Always filter by selected date on client-side to ensure accuracy
        const filteredSchedules = Array.isArray(schedulesResponse.data)
          ? schedulesResponse.data.filter((schedule: Schedule) => {
              const scheduleDate = new Date(schedule.start_time);
              const selectedDateObj = new Date(selectedDate);

              // Compare dates (ignore time)
              const scheduleDateStr = scheduleDate.toISOString().split('T')[0];
              const selectedDateStr = selectedDateObj
                .toISOString()
                .split('T')[0];

              return scheduleDateStr === selectedDateStr;
            })
          : [];

        setSchedules(filteredSchedules);
      } else {
        setSchedules([]);
      }

      // Handle bookings
      if (bookingsResponse.success && bookingsResponse.data) {
        setMyBookings(bookingsResponse.data);
      } else {
        setMyBookings([]);
      }
    } catch (err: any) {
      console.error('Error loading classes data:', err);
      setError(err.message || 'Failed to load classes data');
    } finally {
      if (showFullLoading) {
        setLoading(false);
      } else {
        setIsLoadingDateChange(false);
      }
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
      }
    } catch (err: any) {
      console.error('❌ Error loading member profile:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadMemberProfile(),
      loadData(true), // Show full loading on manual refresh
      member?.id ? loadClassRecommendations(member.id) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  // Load class recommendations
  const loadClassRecommendations = async (memberId: string) => {
    try {
      console.log('🔄 [loadClassRecommendations] Starting...', { memberId });
      setLoadingRecommendations(true);
      // Use vector-based recommendations (new feature) with AI fallback
      const response = await classService.getClassRecommendations(memberId, true, true);

      console.log('📦 [loadClassRecommendations] Response received:', {
        success: response.success,
        hasData: !!response.data,
        hasRecommendations: !!response.data?.recommendations,
        recommendationsCount: response.data?.recommendations?.length || 0,
        method: response.data?.method,
        error: response.error,
      });

      if (response.success && response.data?.recommendations) {
        const recommendations = response.data.recommendations;
        setClassRecommendations(recommendations);
        console.log('✅ [loadClassRecommendations] Loaded recommendations:', {
          count: recommendations.length,
          method: response.data.method || 'unknown',
          firstRec: recommendations[0] ? {
            type: recommendations[0].type,
            title: recommendations[0].title,
            priority: recommendations[0].priority,
          } : null,
        });
      } else {
        console.warn('⚠️ [loadClassRecommendations] No recommendations found:', {
          success: response.success,
          hasData: !!response.data,
          error: response.error,
        });
        setClassRecommendations([]);
      }
    } catch (err: any) {
      console.error('❌ [loadClassRecommendations] Error loading class recommendations:', {
        message: err.message,
        stack: err.stack,
        memberId,
      });
      setClassRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
      console.log('🏁 [loadClassRecommendations] Finished, loadingRecommendations:', false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: ClassCategory | 'ALL') => {
    setSelectedCategory(category);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, close picker after selection (event.type === 'set')
    // On iOS, keep picker open (event.type === 'set' but we keep it open)
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      // On Android, if user dismissed (event.type === 'dismissed'), don't update date
      if (event.type === 'dismissed') {
        return;
      }
    } else {
      // On iOS, keep picker open unless user explicitly closes it
      if (event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }
    }

    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setSelectedDate(dateString);
      // This will trigger useEffect to reload data with new date filter
      // Don't show full loading spinner, just silently update
    }
  };

  const handleDateButtonPress = () => {
    setShowDatePicker(true);
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
      const response = await bookingService.createBooking(bookingData);

      if (response.success) {
        setShowBookingModal(false);
        setSelectedSchedule(null);
        Alert.alert(t('common.success'), t('classes.booking.bookingSuccess'));
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
    }
  };

  const handleMyBookingsPress = () => {
    router.push('/classes/my-bookings');
  };

  const filteredSchedules = React.useMemo(() => {
    console.log('🔍 Filtering schedules:', {
      totalSchedules: schedules?.length || 0,
      selectedDate,
      selectedCategory,
      searchQuery,
      selectedDifficulty,
      selectedTimeOfDay,
      showAvailableOnly,
    });

    return (schedules || []).filter((schedule) => {
      // Date filter (client-side - ensure we only show schedules for selected date)
      // This is a safety check in case API doesn't filter correctly
      const scheduleDate = new Date(schedule.start_time);
      const selectedDateObj = new Date(selectedDate);
      const scheduleDateStr = scheduleDate.toISOString().split('T')[0];
      const selectedDateStr = selectedDateObj.toISOString().split('T')[0];

      if (scheduleDateStr !== selectedDateStr) {
        return false;
      }

      // Category filter (client-side)
      if (selectedCategory !== 'ALL') {
        if (schedule.gym_class?.category !== selectedCategory) {
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

      // Difficulty filter
      if (selectedDifficulty.length > 0) {
        if (
          !selectedDifficulty.includes(schedule.gym_class?.difficulty || '')
        ) {
          return false;
        }
      }

      // Time of day filter
      if (selectedTimeOfDay.length > 0) {
        const startTime = new Date(schedule.start_time);
        const hour = startTime.getHours();
        let timeOfDay = '';
        if (hour >= 6 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
        else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
        else timeOfDay = 'night';

        if (!selectedTimeOfDay.includes(timeOfDay)) {
          return false;
        }
      }

      // Available spots filter
      if (showAvailableOnly) {
        if (schedule.current_bookings >= schedule.max_capacity) {
          return false;
        }
      }

      return true;
    });
  }, [
    schedules,
    selectedCategory,
    searchQuery,
    selectedDifficulty,
    selectedTimeOfDay,
    showAvailableOnly,
  ]);

  const getUpcomingBookings = () => {
    const today = new Date().toISOString();
    return myBookings.filter(
      (booking) =>
        booking.status === 'CONFIRMED' &&
        new Date(booking.schedule?.start_time || '').toISOString() >= today
    );
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
          <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
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
            onPress={loadData}
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
      {/* Header */}
      <View style={themedStyles.header}>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('classes.title')}
        </Text>
        <View style={themedStyles.headerRight}>
          <TouchableOpacity
            style={themedStyles.headerButton}
            onPress={handleMyBookingsPress}
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

      {/* Search and Filters */}
      <View style={themedStyles.searchContainer}>
        <View
          style={[
            themedStyles.searchInputContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Search size={20} color={theme.colors.textSecondary} />
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
              backgroundColor: showFilters
                ? theme.colors.primary
                : theme.colors.surface,
            },
          ]}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Filter
            size={20}
            color={showFilters ? theme.colors.textInverse : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={themedStyles.categorySectionWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={themedStyles.categoryContainer}
          contentContainerStyle={themedStyles.categoryContent}
        >
          <CategoryChip
            label={t('classes.all')}
            isSelected={selectedCategory === 'ALL'}
            onPress={() => handleCategorySelect('ALL')}
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
                  console.log('📂 Category chip pressed:', category);
                  handleCategorySelect(category);
                }}
                theme={theme}
                themedStyles={themedStyles}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Date Selector - Enhanced with Navigation */}
      <View
        style={[
          themedStyles.dateContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <TouchableOpacity
          style={themedStyles.dateNavButton}
          onPress={() => navigateDate(-1)}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={themedStyles.dateContent}
          onPress={handleDateButtonPress}
          activeOpacity={0.8}
          disabled={isLoadingDateChange}
        >
          {isLoadingDateChange ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={{ marginRight: theme.spacing.sm }}
            />
          ) : (
            <View style={themedStyles.dateIconContainer}>
              <Calendar size={18} color={theme.colors.primary} />
            </View>
          )}
          <View style={themedStyles.dateTextContainer}>
            <Text
              style={[
                themedStyles.dateDayName,
                { color: theme.colors.textSecondary },
              ]}
            >
              {new Date(selectedDate).toLocaleDateString(
                t('common.locale') || 'en-US',
                { weekday: 'short' }
              )}
            </Text>
            <Text style={[themedStyles.dateMain, { color: theme.colors.text }]}>
              {new Date(selectedDate).toLocaleDateString(
                t('common.locale') || 'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                }
              )}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={themedStyles.dateNavButton}
          onPress={() => navigateDate(1)}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Date Picker */}
        {showDatePicker && (
          <>
            {Platform.OS === 'android' && (
              <DateTimePicker
                value={new Date(selectedDate)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={
                  new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
                }
              />
            )}
            {Platform.OS === 'ios' && (
              <View style={themedStyles.iosDatePickerContainer}>
                <View style={themedStyles.iosDatePickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={themedStyles.iosDatePickerButton}
                  >
                    <Text
                      style={[
                        themedStyles.iosDatePickerButtonText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {t('common.done')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={new Date(selectedDate)}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  maximumDate={
                    new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
                  }
                  style={themedStyles.iosDatePicker}
                />
              </View>
            )}
          </>
        )}
      </View>

      {/* Classes List with Recommendations and Suggestions as Header */}
      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            {/* Class Recommendations Section */}
            {classRecommendations.length > 0 || loadingRecommendations ? (
              <View style={themedStyles.recommendationsSection}>
                <View style={themedStyles.recommendationsHeader}>
                  <View style={themedStyles.recommendationsHeaderLeft}>
                    <Sparkles size={20} color={theme.colors.primary} />
                    <Text
                      style={[
                        themedStyles.recommendationsTitle,
                        { color: theme.colors.text, marginLeft: 8 },
                      ]}
                    >
                      {t('classes.recommendationsTitle')}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    themedStyles.recommendationsDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('classes.recommendationsDescription')}
                </Text>
                {loadingRecommendations ? (
                  <View style={themedStyles.recommendationsLoading}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text
                      style={[
                        themedStyles.recommendationsLoadingText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('classes.loadingRecommendations')}
                    </Text>
                  </View>
                ) : classRecommendations.length > 0 ? (
                  <View style={themedStyles.recommendationsContainer}>
                    {classRecommendations.map((rec, index) => (
                      <ClassRecommendationCard
                        key={index}
                        recommendation={rec}
                        onPress={() => {
                          if (rec.action === 'VIEW_CLASS' && rec.data?.classId) {
                            router.push(`/classes/${rec.data.classId}`);
                          } else if (rec.action === 'VIEW_SCHEDULE') {
                            if (rec.data?.scheduleId) {
                              router.push(
                                `/classes?scheduleId=${rec.data.scheduleId}`
                              );
                            } else if (rec.data?.classId) {
                              // If only classId, filter by class category or navigate to class
                              if (rec.data?.classCategory) {
                                setSelectedCategory(
                                  rec.data.classCategory as ClassCategory
                                );
                              } else {
                                router.push(`/classes/${rec.data.classId}`);
                              }
                            }
                          } else if (
                            rec.action === 'BOOK_CLASS' &&
                            rec.data?.scheduleId
                          ) {
                            router.push(
                              `/classes?scheduleId=${rec.data.scheduleId}&book=true`
                            );
                          } else if (
                            rec.action === 'BROWSE_CATEGORY' &&
                            rec.data?.classCategory
                          ) {
                            setSelectedCategory(
                              rec.data.classCategory as ClassCategory
                            );
                          }
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
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
          <EmptyState
            title={t('classes.noClassesFound') || 'No classes found'}
            description={
              searchQuery || selectedCategory !== 'ALL'
                ? t('classes.tryDifferentFilters') ||
                  'Try adjusting your filters or search'
                : t('classes.noClassesForDate') ||
                  'No classes scheduled for this date'
            }
            actionLabel={t('classes.viewAll') || 'View All Classes'}
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
          />
        }
      />

      {/* Filter Modal */}
      {showFilters && (
        <TouchableOpacity
          style={themedStyles.filterModal}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}
        >
          <TouchableOpacity
            style={themedStyles.filterContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={themedStyles.filterHeader}>
              <Text
                style={[themedStyles.filterTitle, { color: theme.colors.text }]}
              >
                {t('common.filter')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDifficulty([]);
                  setSelectedTimeOfDay([]);
                  setShowAvailableOnly(false);
                }}
                style={themedStyles.resetFilterButton}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    themedStyles.resetFilterText,
                    { color: theme.colors.error },
                  ]}
                >
                  {t('common.reset')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={themedStyles.filterBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Difficulty Filter */}
              <View style={themedStyles.filterSection}>
                <Text
                  style={[
                    themedStyles.filterSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('classes.difficulty.title')}
                </Text>
                <View style={themedStyles.filterOptions}>
                  {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].map(
                    (diff) => (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          themedStyles.filterOption,
                          {
                            backgroundColor: selectedDifficulty.includes(diff)
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: selectedDifficulty.includes(diff)
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedDifficulty((prev) =>
                            prev.includes(diff)
                              ? prev.filter((d) => d !== diff)
                              : [...prev, diff]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            themedStyles.filterOptionText,
                            {
                              color: selectedDifficulty.includes(diff)
                                ? theme.colors.textInverse
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {t(`classes.difficulty.${diff.toLowerCase()}`)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              {/* Time of Day Filter */}
              <View style={themedStyles.filterSection}>
                <Text
                  style={[
                    themedStyles.filterSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('classes.timeOfDay')}
                </Text>
                <View style={themedStyles.filterOptions}>
                  {['morning', 'afternoon', 'evening', 'night'].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        themedStyles.filterOption,
                        {
                          backgroundColor: selectedTimeOfDay.includes(time)
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: selectedTimeOfDay.includes(time)
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedTimeOfDay((prev) =>
                          prev.includes(time)
                            ? prev.filter((t) => t !== time)
                            : [...prev, time]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          themedStyles.filterOptionText,
                          {
                            color: selectedTimeOfDay.includes(time)
                              ? theme.colors.textInverse
                              : theme.colors.text,
                          },
                        ]}
                      >
                        {t(`classes.times.${time}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Available Only Toggle */}
              <View style={themedStyles.filterSection}>
                <TouchableOpacity
                  style={themedStyles.toggleRow}
                  onPress={() => setShowAvailableOnly(!showAvailableOnly)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        themedStyles.toggleTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {t('classes.availableOnly')}
                    </Text>
                    <Text
                      style={[
                        themedStyles.toggleSubtitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('classes.showOnlyAvailable')}
                    </Text>
                  </View>
                  <View
                    style={[
                      themedStyles.toggle,
                      {
                        backgroundColor: showAvailableOnly
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        themedStyles.toggleThumb,
                        {
                          backgroundColor: theme.colors.textInverse,
                          transform: [
                            { translateX: showAvailableOnly ? 20 : 0 },
                          ],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={themedStyles.filterFooter}>
              <TouchableOpacity
                style={[
                  themedStyles.applyButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    themedStyles.applyButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('common.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Booking Modal */}
      {selectedSchedule && (
        <BookingModal
          visible={showBookingModal}
          schedule={selectedSchedule}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedSchedule(null);
          }}
          onConfirm={handleBookingConfirm}
          loading={false}
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
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      width: '100%',
      alignSelf: 'stretch',
    },
    headerTitle: {
      ...Typography.h2,
      flex: 1,
      flexShrink: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minWidth: 0,
      flexShrink: 0,
      maxWidth: '100%',
    },
    headerButton: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.lg, // 12px - square
      backgroundColor: theme.colors.primary + '15',
    },
    headerButtonText: {
      ...Typography.bodySmallMedium,
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.lg, // 12px - square with slight rounding
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      ...Typography.bodyMedium,
      flex: 1,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg, // 12px - square
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categorySectionWrapper: {
      backgroundColor: theme.colors.background,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    categoryContainer: {
      flexGrow: 0,
    },
    categoryContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    categoryChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg, // 12px - square with slight rounding
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryText: {
      ...Typography.bodyMedium,
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.md,
      borderRadius: theme.radius.lg, // 12px - square
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    dateNavButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md, // 8px - square
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '15',
    },
    dateContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dateIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md, // 8px - square
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateTextContainer: {
      alignItems: 'center',
    },
    dateDayName: {
      ...Typography.labelSmall,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateMain: {
      ...Typography.h6,
      marginTop: 2,
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
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
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
    filterSection: {
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    iosDatePickerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      ...theme.shadows.lg,
    },
    iosDatePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iosDatePickerButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    iosDatePickerButtonText: {
      ...Typography.buttonMedium,
    },
    iosDatePicker: {
      height: 200,
    },
  });
