import ActivityCard from '@/components/ActivityCard';
import SessionDetailModal from '@/components/SessionDetailModal';
import WorkoutCard from '@/components/WorkoutCard';
import {
  analyticsService,
  memberService,
  workoutPlanService,
  type Member,
  type WorkoutPlan,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Bell, CreditCard, QrCode, Search, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // State for API data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [workoutsError, setWorkoutsError] = useState<string | null>(null);

  // Session detail modal states
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [loadingSessionDetails, setLoadingSessionDetails] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setWorkoutsError(null);

      // Load profile and dashboard data in parallel
      const [profileResponse, dashboardResponse] = await Promise.all([
        memberService.getMemberProfile(),
        analyticsService.getMemberDashboardData(),
      ]);

      // Handle profile data first to get member ID

      // Handle profile data
      if (profileResponse.success && profileResponse.data) {
        console.log(
          'Profile API response:',
          JSON.stringify(profileResponse.data, null, 2)
        );
        setUserProfile(profileResponse.data);
      } else {
        console.log('Profile API error:', profileResponse.error);

        // Try to use dashboard data as fallback for profile
        if (
          dashboardResponse.success &&
          dashboardResponse.data?.dashboard?.member
        ) {
          console.log('🔑 Using dashboard data as profile fallback');
          const memberData = dashboardResponse.data.dashboard.member;
          const healthData = dashboardResponse.data.dashboard.healthMetrics;

          // Create profile data from dashboard
          const profileData = {
            id: memberData.id,
            full_name: memberData.full_name,
            email: 'user@example.com', // Default email
            phone: '',
            date_of_birth: '',
            gender: 'other' as const,
            address: '',
            height: 0,
            weight: healthData?.weight || 0,
            body_fat_percentage: healthData?.bodyFat || 0,
            medical_conditions: [],
            allergies: [],
            fitness_goals: [],
            emergency_contact: {
              name: '',
              relationship: 'other',
              phone: '',
            },
            profile_photo: '',
            membership_type: 'basic',
            membership_start_date: '',
            membership_end_date: '',
            membership_status: 'active',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setUserProfile(profileData as any);
          console.log('🔑 Profile data created from dashboard:', profileData);
        } else {
          // If authentication error, check remember me before redirecting
          if (
            profileResponse.error?.includes('authentication') ||
            profileResponse.error?.includes('login')
          ) {
            console.log(
              '🔑 Authentication error, checking remember me preference...'
            );
            try {
              const authStorage = require('@/utils/auth/storage');
              const rememberMe = await authStorage.getRememberMe();

              if (!rememberMe) {
                console.log('🔑 Remember me = false, redirecting to login');
                router.replace('/(auth)/login');
                return;
              } else {
                console.log('🔑 Remember me = true, keeping session');
                // Don't redirect, just show error
                setError('Authentication error. Please try again.');
              }
            } catch (error) {
              console.log(
                '🔑 Failed to check remember me, redirecting to login'
              );
              router.replace('/(auth)/login');
              return;
            }
          }

          // Set error state if profile fetch fails
          setError(profileResponse.error || 'Failed to load user profile');
        }
      }

      // Handle dashboard data
      if (dashboardResponse.success && dashboardResponse.data) {
        console.log(
          'Dashboard API response:',
          JSON.stringify(dashboardResponse.data, null, 2)
        );
        const dashboardData = (dashboardResponse.data as any).dashboard;
        console.log('Dashboard data:', JSON.stringify(dashboardData, null, 2));
        console.log(
          'Recent activity:',
          JSON.stringify(dashboardData.recentActivity, null, 2)
        );

        // Transform session data to activity format
        const recentSessions =
          dashboardData.recentActivity?.recentSessions || [];
        const transformedActivities = recentSessions.map(
          (session: any, index: number) => ({
            id: session.id,
            title: `${t('session.gymSession')} - ${new Date(
              session.entry_time
            ).toLocaleDateString(i18n.language)}`,
            progress: Math.min((session.duration || 0) / 120, 1) * 100, // Normalize to 0-100, max 120 minutes
            metric: t('session.durationMetric'),
            metricValue: `${session.duration || 0} ${t('session.minutes')}`,
            progressColor:
              session.session_rating >= 4
                ? '#4CAF50'
                : session.session_rating >= 3
                ? '#FF9800'
                : '#F44336',
            sessionData: session,
          })
        );

        setActivities(transformedActivities);
      } else {
        console.log('Dashboard API error:', dashboardResponse.error);
      }

      // Load workouts after getting member data
      setWorkoutsLoading(true);
      // Get member ID from user profile or dashboard
      const memberId =
        userProfile?.id || dashboardResponse.data?.dashboard?.member?.id;
      if (memberId) {
        const workoutsResponse = await workoutPlanService.getWorkoutPlans(
          memberId,
          {
            active_only: true,
          }
        );

        // Handle workouts data
        if (workoutsResponse.success && workoutsResponse.data) {
          console.log(
            'Workouts API response:',
            JSON.stringify(workoutsResponse.data, null, 2)
          );
          setWorkouts(workoutsResponse.data.slice(0, 4)); // Show only first 4 workouts
          setWorkoutsError(null);
        } else {
          console.log('Workouts API error:', workoutsResponse.error);
          setWorkoutsError(
            workoutsResponse.error || 'Failed to load workout plans'
          );
          setWorkouts([]); // Clear workouts on error
        }
      } else {
        console.log('No member ID available for workouts');
        setWorkoutsError('Member ID not available');
        setWorkouts([]); // Clear workouts when no member ID
      }
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setWorkoutsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const retryLoadWorkouts = async () => {
    setWorkoutsLoading(true);
    setWorkoutsError(null);

    try {
      // Get member ID from current user profile or dashboard
      const memberId = userProfile?.id;
      if (memberId) {
        const workoutsResponse = await workoutPlanService.getWorkoutPlans(
          memberId,
          {
            active_only: true,
          }
        );

        if (workoutsResponse.success && workoutsResponse.data) {
          setWorkouts(workoutsResponse.data.slice(0, 4));
          setWorkoutsError(null);
        } else {
          setWorkoutsError(
            workoutsResponse.error || 'Failed to load workout plans'
          );
        }
      } else {
        setWorkoutsError('Member ID not available');
      }
    } catch (error: any) {
      setWorkoutsError(error.message || 'Failed to load workout plans');
    } finally {
      setWorkoutsLoading(false);
    }
  };

  const handleSessionPress = async (activity: any) => {
    if (activity.sessionData?.id) {
      setSelectedSession(activity.sessionData);
      setLoadingSessionDetails(true);
      setShowSessionModal(true);

      try {
        const response = await memberService.getSessionDetails(
          activity.sessionData.id
        );
        if (response.success) {
          // API returns { session: {...}, equipmentUsage: {...} }
          setSessionDetails(response.data);
        } else {
          console.log('Session details error:', response.error);
          setSessionDetails(activity.sessionData); // Fallback to basic data
        }
      } catch (error) {
        console.error('Error loading session details:', error);
        setSessionDetails(activity.sessionData); // Fallback to basic data
      } finally {
        setLoadingSessionDetails(false);
      }
    }
  };

  const handleCloseSessionModal = () => {
    setShowSessionModal(false);
    setSelectedSession(null);
    setSessionDetails(null);
  };

  const handleCheckIn = () => {
    setShowAccessModal(true);
  };

  const handleAccessMethod = (method: 'QR' | 'RFID' | 'FACE') => {
    setShowAccessModal(false);
    switch (method) {
      case 'QR':
        router.push('/access/qr-scanner');
        break;
      case 'RFID':
        router.push('/access/rfid-scanner');
        break;
      case 'FACE':
        router.push('/access/face-recognition');
        break;
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
            {t('common.loading')}
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.text }]}>
                {t('home.greeting', {
                  name: userProfile?.full_name?.split(' ')[0] || 'User',
                })}
              </Text>
              <Text
                style={[
                  styles.subGreeting,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('home.subGreeting')}
              </Text>
            </View>
            <View style={styles.headerRightContent}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: theme.colors.gray },
                ]}
              >
                <Bell size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileImageContainer}>
                {userProfile?.profile_photo ? (
                  <Image
                    source={{ uri: userProfile.profile_photo }}
                    style={styles.profileImage}
                    onError={() => {
                      console.log('🖼️ Profile image failed to load');
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.profileImagePlaceholder,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <User size={20} color={theme.colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Search size={20} color={theme.colors.textSecondary} />
            <Text
              style={[styles.searchText, { color: theme.colors.textSecondary }]}
            >
              {t('home.searchPlaceholder')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('home.dailyActivity')}
          </Text>
          <View style={styles.activityContainer}>
            {activities.length > 0 ? (
              activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  title={activity.title}
                  progress={activity.progress}
                  metric={activity.metric}
                  metricValue={activity.metricValue}
                  progressColor={activity.progressColor}
                  onPress={() => handleSessionPress(activity)}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  No activity data available
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('home.recommendedWorkouts')}
            </Text>
            <TouchableOpacity>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                {t('home.seeAll')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.workoutsContainer}>
            {workoutsLoading ? (
              <View style={styles.workoutsLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text
                  style={[
                    styles.workoutsLoadingText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('workouts.loadingWorkouts')}
                </Text>
              </View>
            ) : workouts.length > 0 ? (
              workouts
                .slice(0, 3)
                .map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    title={workout.name}
                    duration={`${workout.duration_weeks} ${t('common.weeks')}`}
                    exercises={workout.exercises?.length || 0}
                    image="https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800"
                    onPress={() => router.push(`/workouts/${workout.id}`)}
                  />
                ))
            ) : (
              <View style={styles.emptyState}>
                {workoutsError ? (
                  <>
                    <Text
                      style={[
                        styles.emptyStateText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {workoutsError}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.workoutsRetryButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      onPress={retryLoadWorkouts}
                    >
                      <Text
                        style={[
                          styles.workoutsRetryButtonText,
                          { color: 'white' },
                        ]}
                      >
                        Retry
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    No workout plans available
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Check-in Button */}
      <TouchableOpacity
        style={[
          styles.checkInButton,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
        onPress={handleCheckIn}
      >
        <Text
          style={[
            styles.checkInButtonText,
            { color: theme.colors.textInverse },
          ]}
        >
          Check In
        </Text>
      </TouchableOpacity>

      {/* Access Method Modal */}
      {showAccessModal && (
        <View
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Choose Access Method
            </Text>

            <TouchableOpacity
              style={[
                styles.accessMethodButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleAccessMethod('QR')}
            >
              <QrCode size={24} color={theme.colors.primary} />
              <Text
                style={[styles.accessMethodText, { color: theme.colors.text }]}
              >
                QR Code Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accessMethodButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleAccessMethod('RFID')}
            >
              <CreditCard size={24} color={theme.colors.primary} />
              <Text
                style={[styles.accessMethodText, { color: theme.colors.text }]}
              >
                RFID Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accessMethodButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleAccessMethod('FACE')}
            >
              <User size={24} color={theme.colors.primary} />
              <Text
                style={[styles.accessMethodText, { color: theme.colors.text }]}
              >
                Face Recognition
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: theme.colors.border },
              ]}
              onPress={() => setShowAccessModal(false)}
            >
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.text }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Session Detail Modal */}
      <SessionDetailModal
        visible={showSessionModal}
        session={sessionDetails}
        onClose={handleCloseSessionModal}
        loading={loadingSessionDetails}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    ...Typography.h3,
  },
  subGreeting: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  headerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: 40,
    height: 40,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchText: {
    ...Typography.bodyRegular,
    marginLeft: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 16,
  },
  seeAllText: {
    ...Typography.bodySmallMedium,
  },
  activityContainer: {
    marginBottom: 8,
  },
  workoutsContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    ...Typography.bodyRegular,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...Typography.bodyRegular,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    ...Typography.bodyMedium,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    ...Typography.bodyRegular,
    textAlign: 'center',
  },
  workoutsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  workoutsLoadingText: {
    ...Typography.bodyMedium,
    marginLeft: 8,
  },
  workoutsRetryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  workoutsRetryButtonText: {
    ...Typography.bodySmallMedium,
    fontWeight: '600',
  },
  checkInButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkInButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    marginHorizontal: 32,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    ...Typography.h4,
    textAlign: 'center',
    marginBottom: 24,
  },
  accessMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  accessMethodText: {
    ...Typography.bodyMedium,
    marginLeft: 12,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});
