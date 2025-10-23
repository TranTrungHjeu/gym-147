import BookingModal from '@/components/BookingModal';
import ClassCard from '@/components/ClassCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  bookingService,
  scheduleService,
  type Booking,
  type CreateBookingRequest,
  type Schedule,
  type ScheduleFilters,
} from '@/services';
import { ClassCategory } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Calendar, Filter, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

export default function ClassesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
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

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    ClassCategory | 'ALL'
  >('ALL');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );

  // Advanced filter states
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Debug: Log when selectedCategory changes
  useEffect(() => {
    console.log('📂 [4] selectedCategory STATE CHANGED:', selectedCategory);
  }, [selectedCategory]);

  // Load data on component mount (only when date changes, NOT category)
  useEffect(() => {
    console.log('🔄 [5] useEffect triggered - Loading data...', {
      selectedDate,
      hasUser: !!user?.id,
    });
    if (user?.id) {
      loadData();
    }
  }, [selectedDate, user?.id]); // Removed selectedCategory from dependencies

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📅 Loading classes data...');
      console.log('👤 User:', user);

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

      console.log('📂 Loading ALL schedules for date:', {
        date: selectedDate,
        note: 'Category filtering will be done client-side',
      });

      // Load schedules and bookings in parallel
      const [schedulesResponse, bookingsResponse] = await Promise.all([
        scheduleService.getSchedules(filters),
        bookingService.getMemberBookings(user.id),
      ]);

      console.log('📅 Schedules response:', schedulesResponse);
      console.log('📅 Bookings response:', bookingsResponse);

      // Handle schedules
      if (schedulesResponse.success && schedulesResponse.data) {
        console.log(
          '✅ Schedules loaded:',
          schedulesResponse.data.length,
          'schedules'
        );
        setSchedules(schedulesResponse.data);
      } else {
        console.log('❌ Failed to load schedules:', schedulesResponse.error);
        setSchedules([]);
      }

      // Handle bookings
      if (bookingsResponse.success && bookingsResponse.data) {
        console.log(
          '✅ Bookings loaded:',
          bookingsResponse.data.length,
          'bookings'
        );
        setMyBookings(bookingsResponse.data);
      } else {
        console.log('❌ Failed to load bookings:', bookingsResponse.error);
        setMyBookings([]);
      }
    } catch (err: any) {
      console.error('❌ Error loading classes data:', err);
      setError(err.message || 'Failed to load classes data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: ClassCategory | 'ALL') => {
    console.log('📂 [1] Category button clicked:', {
      category,
      currentCategory: selectedCategory,
      willChange: category !== selectedCategory,
    });

    console.log('📂 [2] Calling setSelectedCategory...');
    setSelectedCategory(category);
    console.log('📂 [3] setSelectedCategory called');
  };

  const handleDateSelect = (date: string) => {
    console.log('📅 Date selected:', date);
    setSelectedDate(date);
    // This will trigger useEffect to reload data with new date filter
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push(`/classes/${schedule.id}`);
  };

  const handleBookClass = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (bookingData: CreateBookingRequest) => {
    try {
      console.log('📅 Creating booking:', bookingData);

      const response = await bookingService.createBooking(bookingData);

      if (response.success) {
        console.log('✅ Booking created successfully');
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
      console.error('❌ Error creating booking:', error);
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
      selectedCategory,
      searchQuery,
      selectedDifficulty,
      selectedTimeOfDay,
      showAvailableOnly,
    });

    return (schedules || []).filter((schedule) => {
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

        console.log('🔍 Search check:', {
          query,
          className,
          trainerName,
          matchesSearch,
        });

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
      <View
        style={[
          themedStyles.header,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('classes.title')}
        </Text>
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
          <TouchableOpacity
            style={[
              themedStyles.categoryChip,
              selectedCategory === 'ALL' && {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => handleCategorySelect('ALL')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                themedStyles.categoryText,
                {
                  color:
                    selectedCategory === 'ALL'
                      ? theme.colors.textInverse
                      : theme.colors.text,
                },
              ]}
            >
              {t('classes.all')}
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  themedStyles.categoryChip,
                  isSelected && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => {
                  console.log('📂 Category chip pressed:', category);
                  handleCategorySelect(category);
                }}
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
                  {getCategoryTranslation(category)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Date Selector */}
      <View style={themedStyles.dateContainer}>
        <Text style={[themedStyles.dateLabel, { color: theme.colors.text }]}>
          {new Date(selectedDate).toLocaleDateString(
            t('common.locale') || 'en-US',
            {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }
          )}
        </Text>
        <TouchableOpacity
          style={[
            themedStyles.dateButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => {
            // TODO: Implement date picker
          }}
        >
          <Calendar size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClassCard
            schedule={item}
            onPress={() => handleSchedulePress(item)}
            onBook={() => handleBookClass(item)}
            showBookingActions={true}
          />
        )}
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
          <View style={themedStyles.emptyContainer}>
            <Text
              style={[
                themedStyles.emptyText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('classes.noClassesFound')}
            </Text>
            <Text
              style={[
                themedStyles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('common.tryAgain')}
            </Text>
          </View>
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
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
    },
    headerTitle: {
      ...Typography.h2,
    },
    headerButton: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(59, 130, 246, 0.1)',
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
      borderRadius: theme.radius.lg,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
    },
    searchInput: {
      ...Typography.bodyMedium,
      flex: 1,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
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
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.round,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.08)',
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryText: {
      ...Typography.bodyMedium,
    },
    dateContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dateLabel: {
      ...Typography.bodyLargeMedium,
    },
    dateButton: {
      padding: theme.spacing.sm + 2,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
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
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
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
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.round,
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
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    applyButtonText: {
      ...Typography.h5,
    },
  });
