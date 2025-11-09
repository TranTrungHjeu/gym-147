import { AIGenerationModal } from '@/components/AIGenerationModal';
import { UpgradeModal } from '@/components/UpgradeModal';
import WorkoutCard from '@/components/WorkoutCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  memberService,
  workoutPlanService,
  type WorkoutPlan,
} from '@/services';
import { MembershipType } from '@/types/memberTypes';
import { Difficulty } from '@/types/workoutTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Activity,
  Bot,
  Boxes,
  Filter,
  Lightbulb,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
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
    Array<{
      type: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      message: string;
      action: string;
      data?: any;
      reasoning?: string;
    }>
  >([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [membershipType, setMembershipType] = useState<MembershipType>(
    MembershipType.BASIC
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGenerationStatus, setAIGenerationStatus] = useState<
    'preparing' | 'analyzing' | 'generating' | 'completed'
  >('preparing');

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

      // Load all data in parallel
      const [plansResponse, profileResponse] = await Promise.all([
        workoutPlanService.getWorkoutPlans(user.id),
        memberService.getMemberProfile(),
      ]);

      // Handle workout plans
      if (
        plansResponse.success &&
        plansResponse.data &&
        plansResponse.data.length > 0
      ) {
        setWorkoutPlans(plansResponse.data);
      } else {
        // Set empty array to prevent crashes
        setWorkoutPlans([]);
      }

      // Load AI-powered recommendations - use member.id if available, fallback to user.id
      const memberId = profileResponse.data?.id || member?.id || user.id;
      await loadRecommendations(memberId);

      // Handle profile (for membership type)
      if (profileResponse.success && profileResponse.data) {
        console.log(
          '✅ Profile loaded, membership type:',
          profileResponse.data.membership_type
        );
        setMembershipType(
          profileResponse.data.membership_type || MembershipType.BASIC
        );
      } else {
        console.log('❌ Failed to load profile:', profileResponse.error);
        setMembershipType(MembershipType.BASIC);
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

  // Load workout recommendations
  const loadRecommendations = async (memberId: string) => {
    try {
      setLoadingRecommendations(true);
      const response = await workoutPlanService.getWorkoutRecommendations(
        memberId,
        true
      );

      if (response.success && response.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('❌ Error loading recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Handle AI Workout Generation
  const handleAIGeneration = async () => {
    // Check membership tier
    if (
      membershipType === MembershipType.BASIC ||
      membershipType === MembershipType.STUDENT
    ) {
      setShowUpgradeModal(true);
      return;
    }

    // Premium/VIP can proceed - show confirmation
    Alert.alert(t('workouts.generateAIPlan'), t('workouts.aiPlanDescription'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.ok'),
        onPress: async () => {
          try {
            setGeneratingAI(true);
            setAIGenerationStatus('preparing');

            if (!user?.id) return;

            // Step 1: Preparing - Get member profile
            const profileResponse = await memberService.getMemberProfile();
            if (!profileResponse.success || !profileResponse.data?.id) {
              Alert.alert(t('common.error'), 'Failed to get member profile');
              setGeneratingAI(false);
              return;
            }

            const memberId = profileResponse.data.id;

            // Step 2: Analyzing
            await new Promise((resolve) => setTimeout(resolve, 800));
            setAIGenerationStatus('analyzing');

            // Step 3: Generating
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setAIGenerationStatus('generating');

            const response = await workoutPlanService.generateAIWorkoutPlan(
              memberId,
              {
                goal: 'BUILD_MUSCLE',
                difficulty: Difficulty.INTERMEDIATE,
                duration_weeks: 4,
              }
            );

            if (response.success) {
              // Step 4: Completed
              setAIGenerationStatus('completed');
              await new Promise((resolve) => setTimeout(resolve, 1500));
              await loadData();
            } else {
              setGeneratingAI(false);
              Alert.alert(
                t('common.error'),
                response.error || 'Failed to generate AI workout plan'
              );
            }
          } catch (error: any) {
            setGeneratingAI(false);
            Alert.alert(t('common.error'), error.message);
          }
        },
      },
    ]);
  };

  // Handle modal completion
  const handleAIGenerationComplete = () => {
    setGeneratingAI(false);
    setAIGenerationStatus('preparing');
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
            onPress={() => router.push('/equipment')}
          >
            <Boxes size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.gray, marginLeft: 8 },
            ]}
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
        {/* AI Workout Generation CTA */}
        <TouchableOpacity
          style={[
            styles.aiCtaCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.primary + '30',
            },
          ]}
          onPress={handleAIGeneration}
          activeOpacity={0.8}
          disabled={generatingAI}
        >
          <View style={styles.aiCtaContent}>
            <View
              style={[
                styles.aiIconContainer,
                {
                  backgroundColor: theme.colors.primary + '15',
                },
              ]}
            >
              <Sparkles
                size={32}
                color={theme.colors.primary}
                strokeWidth={2}
              />
            </View>
            <View style={styles.aiCtaTextContainer}>
              <Text style={[styles.aiCtaTitle, { color: theme.colors.text }]}>
                {t('workouts.generateAIPlan')}
              </Text>
              <Text
                style={[
                  styles.aiCtaDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('workouts.aiPlanDescription')}
              </Text>
              {(membershipType === MembershipType.BASIC ||
                membershipType === MembershipType.STUDENT) && (
                <View style={styles.aiCtaBadge}>
                  <Zap size={14} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.aiCtaBadgeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {t('workouts.premiumFeature')}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.aiCtaButton,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <Bot
                size={20}
                color={theme.colors.textInverse}
                strokeWidth={2.5}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* AI Recommendations Section */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.recommendationsHeader}>
              <View style={styles.recommendationsHeaderLeft}>
                <Lightbulb size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text, marginLeft: 8 },
                  ]}
                >
                  {t('workouts.recommendationsTitle')}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.recommendationsDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('workouts.recommendationsDescription')}
            </Text>
            {loadingRecommendations ? (
              <View style={styles.recommendationsLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text
                  style={[
                    styles.recommendationsLoadingText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('workouts.loadingRecommendations')}
                </Text>
              </View>
            ) : (
              <View style={styles.recommendationsContainer}>
                {recommendations.map((rec, index) => {
                  const getPriorityColor = () => {
                    switch (rec.priority) {
                      case 'HIGH':
                        return theme.colors.error;
                      case 'MEDIUM':
                        return theme.colors.warning || '#FFA500';
                      case 'LOW':
                        return theme.colors.primary;
                      default:
                        return theme.colors.primary;
                    }
                  };

                  const getIcon = () => {
                    switch (rec.type) {
                      case 'ACTIVITY':
                        return Activity;
                      case 'VARIETY':
                        return Target;
                      case 'PLAN_UPDATE':
                        return TrendingUp;
                      case 'PROGRESS':
                        return TrendingUp;
                      default:
                        return Lightbulb;
                    }
                  };

                  const Icon = getIcon();
                  const priorityColor = getPriorityColor();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.recommendationCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderLeftColor: priorityColor,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        // Handle recommendation action
                        if (rec.action === 'CREATE_WORKOUT_PLAN') {
                          router.push('/workouts/create');
                        } else if (rec.action === 'UPDATE_WORKOUT_PLAN') {
                          if (rec.data?.planId) {
                            router.push(`/workouts/${rec.data.planId}`);
                          }
                        }
                      }}
                    >
                      <View style={styles.recommendationHeader}>
                        <View
                          style={[
                            styles.recommendationIconContainer,
                            { backgroundColor: priorityColor + '15' },
                          ]}
                        >
                          <Icon size={18} color={priorityColor} />
                        </View>
                        <View style={styles.recommendationContent}>
                          <Text
                            style={[
                              styles.recommendationTitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            {rec.title}
                          </Text>
                          <Text
                            style={[
                              styles.recommendationPriority,
                              { color: priorityColor },
                            ]}
                          >
                            {rec.priority === 'HIGH'
                              ? t('workouts.recommendationPriorityHigh')
                              : rec.priority === 'MEDIUM'
                              ? t('workouts.recommendationPriorityMedium')
                              : t('workouts.recommendationPriorityLow')}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.recommendationMessage,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {rec.message}
                      </Text>
                      {rec.reasoning && (
                        <Text
                          style={[
                            styles.recommendationReasoning,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {rec.reasoning}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

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

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="AI Workout Generation"
        currentTier={membershipType}
      />

      {/* AI Generation Modal */}
      <AIGenerationModal
        visible={generatingAI}
        status={aiGenerationStatus}
        onComplete={handleAIGenerationComplete}
      />

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
  aiCtaCard: {
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  aiCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCtaTextContainer: {
    flex: 1,
  },
  aiCtaTitle: {
    ...Typography.h5,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  aiCtaDescription: {
    ...Typography.bodySmall,
    lineHeight: 18,
    opacity: 0.8,
  },
  aiCtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  aiCtaBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  aiCtaButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationsDescription: {
    ...Typography.bodySmall,
    marginBottom: 16,
    opacity: 0.8,
  },
  recommendationsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  recommendationsLoadingText: {
    ...Typography.bodySmall,
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    marginTop: 4,
  },
  recommendationReasoning: {
    ...Typography.caption,
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
