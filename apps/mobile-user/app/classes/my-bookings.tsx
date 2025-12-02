import ClassCard from '@/components/ClassCard';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, type Booking } from '@/services';
import { useTheme } from '@/utils/theme';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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
  TouchableOpacity,
  View,
} from 'react-native';

type BookingTab = 'upcoming' | 'past' | 'cancelled';

export default function MyBookingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');

  // Load data on component mount
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[LOAD] Loading bookings...');
      console.log('[USER] User:', user);

      if (!user?.id) {
        setError('Please login to view bookings');
        return;
      }

      const response = await bookingService.getMemberBookings(user.id);

      if (response.success && response.data) {
        console.log('[SUCCESS] Bookings loaded:', response.data.length, 'bookings');
        setBookings(response.data);
      } else {
        console.log('[ERROR] Failed to load bookings:', response.error);
        setError(response.error || 'Failed to load bookings');
      }
    } catch (err: any) {
      console.error('[ERROR] Error loading bookings:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleCancelBooking = async (booking: Booking) => {
    Alert.alert(
      t('classes.booking.cancelBooking'),
      t('classes.booking.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await bookingService.cancelBooking(booking.id);
              if (response.success) {
                Alert.alert(
                  t('common.success'),
                  t('classes.booking.cancelSuccess')
                );
                await loadBookings(); // Refresh the list
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
            }
          },
        },
      ]
    );
  };

  const handleBookingPress = (booking: Booking) => {
    if (booking.schedule) {
      router.push(`/classes/${booking.schedule.id}`);
    }
  };

  const getFilteredBookings = () => {
    const now = new Date();

    switch (activeTab) {
      case 'upcoming':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          return booking.status === 'CONFIRMED' && startTime >= now;
        });
      case 'past':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          return (
            booking.status === 'COMPLETED' ||
            (booking.status === 'CONFIRMED' && startTime < now)
          );
        });
      case 'cancelled':
        return bookings.filter((booking) => booking.status === 'CANCELLED');
      default:
        return bookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  const getTabCount = (tab: BookingTab) => {
    switch (tab) {
      case 'upcoming':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          return booking.status === 'CONFIRMED' && startTime >= new Date();
        }).length;
      case 'past':
        return bookings.filter((booking) => {
          const startTime = new Date(booking.schedule?.start_time || '');
          return (
            booking.status === 'COMPLETED' ||
            (booking.status === 'CONFIRMED' && startTime < new Date())
          );
        }).length;
      case 'cancelled':
        return bookings.filter((booking) => booking.status === 'CANCELLED')
          .length;
      default:
        return 0;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading bookings...
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
            onPress={loadBookings}
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          My Bookings
        </Text>
        <View style={styles.headerSpacer} />
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
              Upcoming ({getTabCount('upcoming')})
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
              Past ({getTabCount('past')})
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
              Cancelled ({getTabCount('cancelled')})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClassCard
            schedule={item.schedule!}
            onPress={() => handleBookingPress(item)}
            onCancel={
              activeTab === 'upcoming' && item.status === 'CONFIRMED'
                ? () => handleCancelBooking(item)
                : undefined
            }
            showBookingActions={activeTab === 'upcoming'}
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
              No {activeTab} bookings found
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}
            >
              {activeTab === 'upcoming'
                ? 'Book some classes to see them here'
                : `You don't have any ${activeTab} bookings yet`}
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
                  Browse Classes
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
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
});
