import WorkoutCard from '@/components/WorkoutCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  workoutPlanService,
  type WorkoutPlan,
  type WorkoutRecommendation,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Filter, Plus } from 'lucide-react-native';
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

interface WorkoutCategoryProps {
  title: string;
  active: boolean;
  onPress: () => void;
}

const WorkoutCategory: React.FC<WorkoutCategoryProps> = ({
  title,
  active,
  onPress,
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        { backgroundColor: active ? theme.colors.primary : theme.colors.gray },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.categoryText,
          {
            color: active
              ? theme.colors.textInverse
              : theme.colors.textSecondary,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default function WorkoutsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Helper function to get workout category translation
  const getWorkoutCategoryTranslation = (category: string) => {
    switch (category) {
      case 'All':
        return t('workouts.all');
      case 'Strength':
        return t('workouts.strength');
      case 'Cardio':
        return t('workouts.cardio');
      case 'HIIT':
        return t('workouts.hiit');
      case 'Yoga':
        return t('workouts.yoga');
      case 'Stretching':
        return t('workouts.stretching');
      default:
        return category;
    }
  };

  const [activeCategory, setActiveCategory] = React.useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    duration: 'all',
    equipment: 'all',
  });

  // State for API data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [recommendations, setRecommendations] = useState<
    WorkoutRecommendation[]
  >([]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading workouts data...');
      console.log('👤 User:', user);

      // Check if user is authenticated
      if (!user?.id) {
        console.log('❌ No user ID found');
        setError('Please login to view workouts');
        return;
      }

      console.log('📋 Fetching workout plans for user:', user.id);
      console.log('📋 Fetching workout recommendations...');

      // Load all data in parallel
      const [plansResponse, recommendationsResponse] = await Promise.all([
        workoutPlanService.getWorkoutPlans(user.id),
        workoutPlanService.getWorkoutRecommendations(),
      ]);

      console.log('📋 Workout plans response:', plansResponse);
      console.log('📋 Recommendations response:', recommendationsResponse);

      // Handle workout plans
      if (
        plansResponse.success &&
        plansResponse.data &&
        plansResponse.data.length > 0
      ) {
        console.log(
          '✅ Workout plans loaded:',
          plansResponse.data.length,
          'plans'
        );
        setWorkoutPlans(plansResponse.data);
      } else {
        console.log(
          '❌ No workout plans found:',
          plansResponse.error || 'Empty response'
        );
        console.log(
          '📋 This might be normal if no workout plans exist in the database'
        );
        // Set empty array to prevent crashes
        setWorkoutPlans([]);
      }

      // Handle recommendations
      if (recommendationsResponse.success && recommendationsResponse.data) {
        console.log(
          '✅ Recommendations loaded:',
          recommendationsResponse.data.length,
          'recommendations'
        );
        setRecommendations(recommendationsResponse.data);
      } else {
        console.log(
          '❌ Failed to load recommendations:',
          recommendationsResponse.error
        );
        // Set empty array for recommendations
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('❌ Error loading workouts data:', err);
      setError(err.message || 'Failed to load workouts data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filter workouts based on active category
  const filteredWorkouts = workoutPlans.filter((workout) => {
    // Category filter
    if (activeCategory !== 'All') {
      const goal = workout.goal.toLowerCase();
      if (
        activeCategory === 'Strength' &&
        (goal.includes('muscle') || goal.includes('strength'))
      )
        return true;
      if (
        activeCategory === 'Cardio' &&
        (goal.includes('cardio') || goal.includes('endurance'))
      )
        return true;
      if (activeCategory === 'HIIT' && goal.includes('hiit')) return true;
      if (activeCategory === 'Yoga' && goal.includes('yoga')) return true;
      if (activeCategory === 'Stretching' && goal.includes('flexibility'))
        return true;
      return false;
    }

    // Difficulty filter
    if (
      filters.difficulty !== 'all' &&
      workout.difficulty !== filters.difficulty
    ) {
      return false;
    }

    // Duration filter
    if (filters.duration !== 'all') {
      const duration = workout.duration_weeks;
      switch (filters.duration) {
        case 'short':
          if (duration > 2) return false;
          break;
        case 'medium':
          if (duration < 3 || duration > 6) return false;
          break;
        case 'long':
          if (duration < 7) return false;
          break;
      }
    }

    // Equipment filter
    if (filters.equipment !== 'all') {
      const hasEquipment = workout.exercises?.some((ex) =>
        ex.equipment?.toLowerCase().includes(filters.equipment.toLowerCase())
      );
      if (!hasEquipment) return false;
    }

    return true;
  });

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('common.loading')}...
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('workouts.title')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.gray }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {['All', 'Strength', 'Cardio', 'HIIT', 'Yoga', 'Stretching'].map(
          (category) => (
            <WorkoutCategory
              key={category}
              title={getWorkoutCategoryTranslation(category)}
              active={activeCategory === category}
              onPress={() => setActiveCategory(category)}
            />
          )
        )}
      </ScrollView>

      <ScrollView
        style={styles.content}
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('workouts.featured')}
          </Text>
          {workoutPlans.length > 0 ? (
            <View style={styles.featuredWorkout}>
              <Image
                source={{
                  uri: 'https://images.pexels.com/photos/2468339/pexels-photo-2468339.jpeg?auto=compress&cs=tinysrgb&w=800',
                }}
                style={styles.featuredImage}
              />
              <View style={styles.featuredOverlay} />
              <View style={styles.featuredContent}>
                <View>
                  <Text
                    style={[
                      styles.featuredTitle,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {workoutPlans[0].name}
                  </Text>
                  <Text
                    style={[
                      styles.featuredDescription,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {workoutPlans[0].description ||
                      `${workoutPlans[0].duration_weeks}-week program`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => router.push(`/workouts/${workoutPlans[0].id}`)}
                >
                  <Text
                    style={[
                      styles.startButtonText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {t('common.view')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('workouts.noWorkouts')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('workouts.all')}
          </Text>
          <View style={styles.workoutsContainer}>
            {filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  title={workout.name}
                  duration={`${workout.duration_weeks} weeks`}
                  exercises={workout.exercises?.length || 0}
                  image="https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800"
                  onPress={() => router.push(`/workouts/${workout.id}`)}
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
                  {t('workouts.noWorkouts')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.floatingButton,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
        onPress={() => router.push('/workouts/create')}
      >
        <Plus size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>

      {/* Filter Modal */}
      {showFilterModal && (
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
              {t('common.filter')}
            </Text>

            {/* Difficulty Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
                {t('workouts.difficulty')}
              </Text>
              <View style={styles.filterOptions}>
                {['all', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(
                  (difficulty) => (
                    <TouchableOpacity
                      key={difficulty}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor:
                            filters.difficulty === difficulty
                              ? theme.colors.primary
                              : theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, difficulty }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          {
                            color:
                              filters.difficulty === difficulty
                                ? theme.colors.textInverse
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {difficulty === 'all' ? 'All' : difficulty}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Duration Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
                {t('workouts.duration')}
              </Text>
              <View style={styles.filterOptions}>
                {['all', 'short', 'medium', 'long'].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor:
                          filters.duration === duration
                            ? theme.colors.primary
                            : theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, duration }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        {
                          color:
                            filters.duration === duration
                              ? theme.colors.textInverse
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {duration === 'all'
                        ? 'All'
                        : duration === 'short'
                        ? '1-2 weeks'
                        : duration === 'medium'
                        ? '3-6 weeks'
                        : '7+ weeks'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Equipment Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
                {t('workouts.equipment')}
              </Text>
              <View style={styles.filterOptions}>
                {['all', 'bodyweight', 'dumbbells', 'barbell', 'machine'].map(
                  (equipment) => (
                    <TouchableOpacity
                      key={equipment}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor:
                            filters.equipment === equipment
                              ? theme.colors.primary
                              : theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, equipment }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          {
                            color:
                              filters.equipment === equipment
                                ? theme.colors.textInverse
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {equipment === 'all'
                          ? 'All'
                          : equipment.charAt(0).toUpperCase() +
                            equipment.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => {
                  setFilters({
                    difficulty: 'all',
                    duration: 'all',
                    equipment: 'all',
                  });
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[styles.modalButtonText, { color: theme.colors.text }]}
                >
                  {t('common.reset')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('common.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
  },
  headerTitle: {
    ...Typography.h2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeCategoryButton: {},
  categoryText: {
    ...Typography.bodySmallMedium,
  },
  activeCategoryText: {},
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 16,
  },
  featuredWorkout: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  featuredImage: {
    width: '100%',
    height: 180,
    position: 'absolute',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  featuredContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  featuredTitle: {
    ...Typography.h4,
    marginBottom: 8,
  },
  featuredDescription: {
    ...Typography.bodySmall,
    opacity: 0.9,
    width: '80%',
  },
  startButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  startButtonText: {
    ...Typography.buttonMedium,
  },
  workoutsContainer: {
    marginBottom: 24,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    ...Typography.h4,
    textAlign: 'center',
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterOptionText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});
