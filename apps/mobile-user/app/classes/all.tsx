import ClassCard from '@/components/ClassCard';
import { ClassCardSkeleton, EmptyState } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  bookingService,
  scheduleService,
  memberService,
  type Booking,
  type Schedule,
  type ScheduleFilters,
} from '@/services';
import { ClassCategory } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Filter, Search, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

export default function AllClassesScreen() {
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

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    ClassCategory | 'ALL'
  >('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load member bookings
  useEffect(() => {
    if (member?.id || user?.id) {
      loadBookings();
    }
  }, [member?.id, user?.id]);

  // Load data on component mount
  useEffect(() => {
    if (user?.id) {
      loadData(true);
    }
  }, [user?.id]);

  const loadBookings = async () => {
    try {
      const memberIdForBookings = member?.id || user?.id;
      if (!memberIdForBookings) return;

      const response = await bookingService.getMemberBookings(
        memberIdForBookings
      );
      if (response.success && response.data) {
        setMyBookings(response.data);
      }
    } catch (err: any) {
      console.error('Error loading bookings:', err);
    }
  };

  const loadData = async (reset = false) => {
    try {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (reset) {
        setPage(1);
        setHasMore(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      if (!user?.id) {
        setError(t('classes.pleaseLoginToViewClasses'));
        return;
      }

      // Create filters - get ALL schedules (no date, no status, no location filter)
      const filters: ScheduleFilters = {
        status: 'all', // Get all statuses (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, etc.)
        class_category:
          selectedCategory !== 'ALL' ? selectedCategory : undefined,
        // Don't filter by date - show all classes from all times
        // Don't filter by room_id - show all classes from all locations
        // Don't filter by trainer_id - show all trainers
      };

      console.log('[ALL_CLASSES] Loading schedules with filters:', {
        status: filters.status,
        category: filters.class_category,
        page: currentPage,
        limit: 10,
        note: 'No date/location filters - showing ALL classes',
      });

      // Load schedules with pagination
      const currentPage = reset ? 1 : page;
      const response = await scheduleService.getSchedules({
        ...filters,
        page: currentPage,
        limit: 10,
      });

      // Check if request was cancelled
      if (abortController.signal.aborted) {
        return;
      }

      if (response.success && response.data) {
        // Log full response structure for debugging
        console.log('[ALL_CLASSES] Full API response:', {
          success: response.success,
          hasData: !!response.data,
          dataType: Array.isArray(response.data)
            ? 'array'
            : typeof response.data,
          dataKeys: Array.isArray(response.data)
            ? 'array'
            : Object.keys(response.data || {}),
          pagination:
            response.data?.pagination || response.data?.data?.pagination,
          filters: response.data?.filters || response.data?.data?.filters,
        });

        // Handle different response structures
        let newSchedules: Schedule[] = [];
        if (Array.isArray(response.data)) {
          newSchedules = response.data;
        } else if (response.data.schedules) {
          newSchedules = response.data.schedules;
        } else if (response.data.data?.schedules) {
          newSchedules = response.data.data.schedules;
        }

        console.log('[ALL_CLASSES] Extracted schedules:', {
          count: newSchedules.length,
          firstSchedule: newSchedules[0]
            ? {
                id: newSchedules[0].id,
                status: newSchedules[0].status,
                start_time: newSchedules[0].start_time,
                class_name: newSchedules[0].gym_class?.name,
              }
            : null,
          lastSchedule: newSchedules[newSchedules.length - 1]
            ? {
                id: newSchedules[newSchedules.length - 1].id,
                status: newSchedules[newSchedules.length - 1].status,
                start_time: newSchedules[newSchedules.length - 1].start_time,
                class_name:
                  newSchedules[newSchedules.length - 1].gym_class?.name,
              }
            : null,
        });

        if (reset) {
          // Remove duplicates when resetting
          const uniqueSchedules = newSchedules.filter(
            (schedule, index, self) =>
              index === self.findIndex((s) => s.id === schedule.id)
          );
          setSchedules(uniqueSchedules);
          setPage(2); // Next page will be 2
          console.log('[ALL_CLASSES] Loaded initial schedules:', {
            total: uniqueSchedules.length,
            statuses: uniqueSchedules.map((s) => s.status),
            dateRange:
              uniqueSchedules.length > 0
                ? {
                    earliest:
                      uniqueSchedules[uniqueSchedules.length - 1]?.start_time,
                    latest: uniqueSchedules[0]?.start_time,
                  }
                : null,
          });
        } else {
          // Remove duplicates when appending - filter out schedules that already exist
          setSchedules((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newUniqueSchedules = newSchedules.filter(
              (schedule) => !existingIds.has(schedule.id)
            );
            const updated = [...prev, ...newUniqueSchedules];
            console.log('[ALL_CLASSES] Loaded more schedules:', {
              new: newUniqueSchedules.length,
              total: updated.length,
            });
            return updated;
          });
          setPage((prev) => prev + 1);
        }

        // Check if there are more pages
        const pagination =
          response.data.pagination || response.data.data?.pagination;
        if (pagination) {
          setHasMore(pagination.page < pagination.pages);
          console.log('[ALL_CLASSES] Pagination info:', {
            currentPage: pagination.page,
            totalPages: pagination.pages,
            total: pagination.total,
            hasMore: pagination.page < pagination.pages,
          });
        } else {
          // Fallback: check if we got a full page
          setHasMore(newSchedules.length >= 10);
        }
      } else {
        if (reset) {
          setSchedules([]);
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
        setLoading(false);
        setLoadingMore(false);
      }
      abortControllerRef.current = null;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBookings(), loadData(true)]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadData(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: ClassCategory | 'ALL') => {
    setSelectedCategory(category);
    // Reload data when category changes
    loadData(true);
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push(`/classes/${schedule.id}`);
  };

  const handleBookClass = (schedule: Schedule) => {
    const existingBooking = myBookings.find(
      (booking) =>
        booking.schedule_id === schedule.id ||
        booking.schedule?.id === schedule.id
    );

    if (existingBooking?.payment_status === 'PENDING') {
      router.push(`/classes/${schedule.id}`);
      return;
    }

    if (
      existingBooking &&
      (existingBooking.payment_status === 'PAID' ||
        existingBooking.payment_status === 'COMPLETED') &&
      existingBooking.status === 'CONFIRMED'
    ) {
      // Already booked
      return;
    }

    router.push(`/classes/${schedule.id}`);
  };

  const filteredSchedules = React.useMemo(() => {
    // First, remove duplicates by ID
    const uniqueSchedules = (schedules || []).filter(
      (schedule, index, self) =>
        index === self.findIndex((s) => s.id === schedule.id)
    );

    // Then apply filters
    return uniqueSchedules.filter((schedule) => {
      // Category filter (already filtered by API, but double-check)
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

      return true;
    });
  }, [schedules, selectedCategory, searchQuery]);

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
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={[themedStyles.headerTitle, { color: theme.colors.text }]}
          >
            {t('classes.viewAll') || 'Tất cả lớp học'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={themedStyles.content}>
          {[1, 2, 3].map((i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && schedules.length === 0) {
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
      {/* Header */}
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('classes.viewAll') || 'Tất cả lớp học'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={themedStyles.filterButton}
            onPress={() => setShowFilterModal(!showFilterModal)}
          >
            <Filter
              size={20}
              color={
                showFilterModal || selectedCategory !== 'ALL'
                  ? theme.colors.primary
                  : theme.colors.text
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={themedStyles.searchContainer}>
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {showFilterModal && (
        <View style={themedStyles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
                  onPress={() => handleCategorySelect(category)}
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
      )}

      {/* Classes List */}
      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const userBooking = myBookings.find((booking) => {
            const bookingScheduleId =
              booking.schedule_id || booking.schedule?.id;
            return bookingScheduleId === item.id;
          });

          return (
            <ClassCard
              schedule={item}
              onPress={() => handleSchedulePress(item)}
              onBook={() => handleBookClass(item)}
              showBookingActions={true}
              userBooking={userBooking || null}
              onNavigateToPayment={() => {
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={themedStyles.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={t('classes.noClassesFound') || 'No classes found'}
            description={
              searchQuery || selectedCategory !== 'ALL'
                ? t('classes.tryDifferentFilters') ||
                  'Try adjusting your filters or search'
                : t('classes.noClassesForDate') || 'No classes available'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      padding: theme.spacing.xs,
    },
    headerTitle: {
      ...Typography.h2,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },
    filterButton: {
      padding: theme.spacing.xs,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      ...Typography.bodySmall,
      flex: 1,
      fontSize: 14,
    },
    categoryContainer: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    categoryContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    categoryChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.xs,
    },
    categoryText: {
      ...Typography.bodySmall,
      fontWeight: '500',
      fontSize: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    loadingMore: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
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
  });
