import BookingModal from '@/components/BookingModal';
import ClassCard from '@/components/ClassCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  bookingService,
  scheduleService,
  type Booking,
  type ClassCategory,
  type CreateBookingRequest,
  type Schedule,
  type ScheduleFilters,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { useRouter } from 'expo-router';
import { Calendar, Filter, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
  'CARDIO',
  'STRENGTH',
  'YOGA',
  'PILATES',
  'DANCE',
  'MARTIAL_ARTS',
  'AQUA',
  'FUNCTIONAL',
  'RECOVERY',
  'SPECIALIZED',
];

export default function ClassesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

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

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [selectedDate, selectedCategory]);

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

      // Create filters
      const filters: ScheduleFilters = {
        date_from: selectedDate,
        date_to: selectedDate,
        class_category:
          selectedCategory !== 'ALL' ? selectedCategory : undefined,
      };

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
    // TODO: Implement search functionality
  };

  const handleCategorySelect = (category: ClassCategory | 'ALL') => {
    setSelectedCategory(category);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
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
        Alert.alert('Success', 'Class booked successfully!');
        // Refresh data
        await loadData();
      } else {
        Alert.alert('Error', response.error || 'Failed to book class');
      }
    } catch (error: any) {
      console.error('❌ Error creating booking:', error);
      Alert.alert('Error', error.message || 'Failed to book class');
    }
  };

  const handleMyBookingsPress = () => {
    router.push('/classes/my-bookings');
  };

  const filteredSchedules = schedules.filter((schedule) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        schedule.gym_class?.name.toLowerCase().includes(query) ||
        schedule.gym_class?.description?.toLowerCase().includes(query) ||
        schedule.trainer?.full_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getUpcomingBookings = () => {
    const today = new Date().toISOString();
    return myBookings.filter(
      (booking) =>
        booking.status === 'CONFIRMED' &&
        new Date(booking.schedule?.start_time || '').toISOString() >= today
    );
  };

  const upcomingBookings = getUpcomingBookings();

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading classes...
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
            onPress={loadData}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              Retry
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Classes
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleMyBookingsPress}
        >
          <Text
            style={[styles.headerButtonText, { color: theme.colors.primary }]}
          >
            My Bookings ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search classes, trainers..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'ALL' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => handleCategorySelect('ALL')}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'ALL' && { color: theme.colors.textInverse },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => handleCategorySelect(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && {
                  color: theme.colors.textInverse,
                },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date Selector */}
      <View style={styles.dateContainer}>
        <Text style={[styles.dateLabel, { color: theme.colors.text }]}>
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => {
            // TODO: Implement date picker
          }}
        >
          <Calendar size={16} color={theme.colors.primary} />
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
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}
            >
              No classes found for this date
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}
            >
              Try selecting a different date or category
            </Text>
          </View>
        }
      />

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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateButton: {
    padding: 8,
    borderRadius: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
