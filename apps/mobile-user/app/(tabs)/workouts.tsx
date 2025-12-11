import { AIGenerationModal } from '@/components/AIGenerationModal';
import { AIWorkoutPromptModal } from '@/components/AIWorkoutPromptModal';
import { MaxPlansLimitModal } from '@/components/MaxPlansLimitModal';
import { UpgradeModal } from '@/components/UpgradeModal';
import { EmptyState, WorkoutCardSkeleton } from '@/components/ui';
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
import { FontFamily, Typography } from '@/utils/typography';
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
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const categoryStyles = getCategoryStyles(theme);
  const scaleAnim = useRef(new Animated.Value(active ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: active ? 1 : 0.95,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [active]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          categoryStyles.categoryButton,
          active && categoryStyles.activeCategoryButton,
          {
            backgroundColor: active ? theme.colors.primaryLight : 'transparent',
            borderColor: active ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            categoryStyles.categoryText,
            {
              color: active ? theme.colors.primary : theme.colors.textSecondary,
              fontWeight: active ? '600' : '400',
            },
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getCategoryStyles = (theme: any) =>
  StyleSheet.create({
    categoryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      marginRight: theme.spacing.xs,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    activeCategoryButton: {
      borderWidth: 1,
    },
    categoryText: {
      ...Typography.bodySmall,
    },
  });

export default function WorkoutsScreen() {
  const { theme } = useTheme();
  const { user, member } = useAuth();
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

  // Helper function to translate recommendation title
  const translateRecommendationTitle = (title: string): string => {
    const titleMap: Record<string, string> = {
      'Start Your Fitness Journey': t(
        'workouts.recommendationTitles.startYourFitnessJourney'
      ),
      'Get Back on Track': t('workouts.recommendationTitles.getBackOnTrack'),
      'Weight Gain Detected': t(
        'workouts.recommendationTitles.weightGainDetected'
      ),
      'Weight Loss Progress': t(
        'workouts.recommendationTitles.weightLossProgress'
      ),
      'Try New Equipment': t('workouts.recommendationTitles.tryNewEquipment'),
      'Increase Activity': t('workouts.recommendationTitles.increaseActivity'),
      'Create Workout Plan': t(
        'workouts.recommendationTitles.createWorkoutPlan'
      ),
    };
    return titleMap[title] || title;
  };

  // Helper function to translate recommendation message
  const translateRecommendationMessage = (
    message: string,
    rec?: any
  ): string => {
    // Check for specific patterns and translate
    if (message.includes("You haven't been active recently")) {
      return t('workouts.recommendationMessages.startYourFitnessJourney');
    }
    if (
      message.includes("It's been") &&
      message.includes('days since your last workout')
    ) {
      const daysMatch = message.match(/(\d+)\s*days/);
      const days = daysMatch ? daysMatch[1] : '0';
      return t('workouts.recommendationMessages.getBackOnTrack', { days });
    }
    if (message.includes("You've been using the same equipment")) {
      return t('workouts.recommendationMessages.tryNewEquipment');
    }
    if (message.includes("You've been active but don't have a workout plan")) {
      return t('workouts.recommendationMessages.increaseActivity');
    }
    if (message.includes("You've gained weight")) {
      return t('workouts.recommendationMessages.weightGainDetected');
    }
    if (message.includes('Great progress on weight loss')) {
      return t('workouts.recommendationMessages.weightLossProgress');
    }

    // Try to match by title if available
    if (rec?.title) {
      const titleMap: Record<string, string> = {
        'Start Your Fitness Journey': t(
          'workouts.recommendationMessages.startYourFitnessJourney'
        ),
        'Get Back on Track': rec.message?.match(/(\d+)/)?.[1]
          ? t('workouts.recommendationMessages.getBackOnTrack', {
              days: rec.message.match(/(\d+)/)?.[1] || '0',
            })
          : t('workouts.recommendationMessages.getBackOnTrack', { days: '0' }),
        'Weight Gain Detected': t(
          'workouts.recommendationMessages.weightGainDetected'
        ),
        'Weight Loss Progress': t(
          'workouts.recommendationMessages.weightLossProgress'
        ),
        'Try New Equipment': t(
          'workouts.recommendationMessages.tryNewEquipment'
        ),
        'Increase Activity': t(
          'workouts.recommendationMessages.increaseActivity'
        ),
      };
      if (titleMap[rec.title]) {
        return titleMap[rec.title];
      }
    }

    return message;
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
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] =
    useState<boolean>(false);
  const [togglingAI, setTogglingAI] = useState(false);
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [membershipType, setMembershipType] = useState<MembershipType>(
    MembershipType.BASIC
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showMaxPlansModal, setShowMaxPlansModal] = useState(false);
  const [maxPlansData, setMaxPlansData] = useState<{
    currentCount?: number;
    maxAllowed?: number;
    membershipType?: string;
  }>({});
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGenerationStatus, setAIGenerationStatus] = useState<
    'preparing' | 'analyzing' | 'generating' | 'completed'
  >('preparing');

  // Load data on component mount and when user/member changes
  // This ensures data reloads after registration when member is loaded
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, member?.id]); // Reload when user or member changes

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[LOAD] Loading workouts data...');
      console.log('[USER] User:', user);

      // Check if user is authenticated
      if (!user?.id) {
        console.log('[ERROR] No user ID found');
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

      // Handle profile (for membership type and AI settings)
      if (profileResponse.success && profileResponse.data) {
        console.log(
          '[SUCCESS] Profile loaded, membership type:',
          profileResponse.data.membership_type
        );
        const membership =
          profileResponse.data.membership_type || MembershipType.BASIC;
        setMembershipType(membership);
        setMemberProfile(profileResponse.data);

        // Set AI recommendations enabled based on member preference
        // Default to false - user must explicitly enable AI recommendations
        if (
          profileResponse.data.ai_workout_recommendations_enabled !== undefined
        ) {
          setAiRecommendationsEnabled(
            profileResponse.data.ai_workout_recommendations_enabled
          );
        } else {
          // Default to false (no AI recommendations by default)
          setAiRecommendationsEnabled(false);
        }
      } else {
        console.log('[ERROR] Failed to load profile:', profileResponse.error);
        setMembershipType(MembershipType.BASIC);
        setMemberProfile(null);
        setAiRecommendationsEnabled(false);
      }
    } catch (err: any) {
      console.error('[ERROR] Error loading workouts data:', err);
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
      const useAI = aiRecommendationsEnabled; // Default is false, user must explicitly enable
      const response = await workoutPlanService.getWorkoutRecommendations(
        memberId,
        useAI
      );

      if (response.success && response.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      // Handle 503 errors gracefully - don't show error to user
      const isServiceUnavailable = 
        err.response?.status === 503 || 
        err.message?.includes('503') ||
        err.message?.includes('Service Unavailable') ||
        err.message?.includes('service unavailable');
      
      if (isServiceUnavailable) {
        console.warn('[WARNING] Recommendations service unavailable:', err.message);
        // Silently fail - recommendations are optional
        setRecommendations([]);
      } else {
        console.error('[ERROR] Error loading recommendations:', err);
        setRecommendations([]);
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Toggle AI Recommendations
  const handleToggleAIRecommendations = async (value: boolean) => {
    if (!user?.id) {
      Alert.alert(
        t('common.error'),
        t('workouts.memberNotFound') || 'Member not found'
      );
      return;
    }

    try {
      setTogglingAI(true);
      // Update local state immediately for better UX
      setAiRecommendationsEnabled(value);

      // Reload recommendations with new AI setting
      const memberResponse = await memberService.getMemberByUserId(user.id);
      const memberId = memberResponse.data?.id || user.id;
      await loadRecommendations(memberId);
    } catch (error: any) {
      console.error('[ERROR] Error toggling AI recommendations:', error);
      // Revert on error
      setAiRecommendationsEnabled(!value);
      Alert.alert(
        t('common.error'),
        error.message ||
          t('workouts.failedToToggleAI') ||
          'Failed to toggle AI recommendations'
      );
    } finally {
      setTogglingAI(false);
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

    // Premium/VIP can proceed - show prompt modal
    setShowPromptModal(true);
  };

  // Handle AI Generation with custom prompt
  const handleAIGenerateWithPrompt = async (customPrompt: string) => {
    try {
      setShowPromptModal(false);
      setGeneratingAI(true);
      setAIGenerationStatus('preparing');

      if (!user?.id) return;

      // Step 1: Preparing - Get member profile
      const profileResponse = await memberService.getMemberProfile();
      if (!profileResponse.success || !profileResponse.data?.id) {
        Alert.alert(t('common.error'), 'Failed to get member profile');
        setGeneratingAI(false);
        setAIGenerationStatus('preparing');
        return;
      }

      const memberId = profileResponse.data.id;

      // Start process animation - transition to analyzing after a short delay
      setTimeout(() => {
        if (generatingAI) {
          setAIGenerationStatus('analyzing');
        }
      }, 1000);

      // Transition to generating after another short delay
      setTimeout(() => {
        if (generatingAI) {
          setAIGenerationStatus('generating');
        }
      }, 2000);

      // Call AI API - process will continue until response
      const response = await workoutPlanService.generateAIWorkoutPlan(
        memberId,
        {
          goal: 'BUILD_MUSCLE',
          difficulty: Difficulty.INTERMEDIATE,
          duration_weeks: 4,
          custom_prompt: customPrompt || undefined,
        }
      );

      if (response.success) {
        // Step 4: Completed - show completed status briefly then close
        setAIGenerationStatus('completed');
        
        // Wait a moment to show completed status, then close modal
        setTimeout(() => {
          setGeneratingAI(false);
          setAIGenerationStatus('preparing');

          // Show success message immediately when AI responds
          Alert.alert(
            t('workouts.aiSuccess') || 'Workout plan created successfully!',
            t('workouts.aiPlanCreatedDesc') ||
              'Your AI workout plan has been created. Check your workout recommendations!',
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  // Navigate to home tab after alert is dismissed
                  router.push('/');
                },
              },
            ]
          );

          // Reload workout plans and recommendations in background
          // This ensures the new workout plan and updated recommendations are visible
          Promise.allSettled([
            loadData().catch((err) => {
              console.warn('[WARNING] Error reloading data after workout creation:', err);
            }),
            loadRecommendations(memberId).catch((err) => {
              console.warn('[WARNING] Error loading recommendations after workout creation:', err);
              // Don't show error to user - workout was created successfully
            }),
          ]).then(() => {
            console.log('[SUCCESS] Workout plans and recommendations reloaded after AI generation');
          });
        }, 1500); // Show completed status for 1.5 seconds
      } else {
        setGeneratingAI(false);
        setAIGenerationStatus('preparing');

        // Check if it's a max plans limit error
        if (response.isMaxPlansReached) {
          setMaxPlansData({
            currentCount: response.currentCount,
            maxAllowed: response.maxAllowed,
            membershipType: response.membershipType,
          });
          setShowMaxPlansModal(true);
        } else {
          // For other errors, just log them (no Alert.alert)
          console.error('[ERROR] AI Generation failed:', response.error);
        }
      }
    } catch (error: any) {
      setGeneratingAI(false);
      setAIGenerationStatus('preparing');

      console.error('[ERROR] AI Generation Exception:', error);
      // Don't show error alert - just log it
    }
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

  // Show loading state with skeleton
  const themedStyles = styles(theme);

  if (loading && workoutPlans.length === 0) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.header}>
          <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
            {t('workouts.title')}
          </Text>
        </View>
        <ScrollView
          style={themedStyles.content}
          contentContainerStyle={themedStyles.listContent}
        >
          {[1, 2, 3].map((i) => (
            <WorkoutCardSkeleton key={i} />
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
      <View style={themedStyles.header}>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('workouts.title')}
        </Text>
        <View style={themedStyles.headerRight}>
          <TouchableOpacity
            style={themedStyles.iconButton}
            onPress={() => router.push('/equipment')}
          >
            <Boxes size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={themedStyles.iconButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={themedStyles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={themedStyles.categoriesContainer}
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
      </View>

      <ScrollView
        style={themedStyles.content}
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
            themedStyles.aiCtaCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.primary + '30',
            },
          ]}
          onPress={handleAIGeneration}
          activeOpacity={0.8}
          disabled={generatingAI}
        >
          <View style={themedStyles.aiCtaContent}>
            <View
              style={[
                themedStyles.aiIconContainer,
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
            <View style={themedStyles.aiCtaTextContainer}>
              <Text
                style={[themedStyles.aiCtaTitle, { color: theme.colors.text }]}
              >
                {t('workouts.generateAIPlan')}
              </Text>
              <Text
                style={[
                  themedStyles.aiCtaDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('workouts.aiPlanDescription')}
              </Text>
              {(membershipType === MembershipType.BASIC ||
                membershipType === MembershipType.STUDENT) && (
                <View style={themedStyles.aiCtaBadge}>
                  <Zap size={14} color={theme.colors.primary} />
                  <Text
                    style={[
                      themedStyles.aiCtaBadgeText,
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
                themedStyles.aiCtaButton,
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
        {(recommendations.length > 0 || memberProfile) && (
          <View style={themedStyles.section}>
            <View style={themedStyles.recommendationsHeader}>
              {/* Left: Icon + Title */}
              <View style={themedStyles.recommendationsHeaderLeft}>
                <View style={themedStyles.iconWrapper}>
                  <Lightbulb size={20} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    themedStyles.recommendationsTitle,
                    {
                      color: theme.colors.text,
                      marginLeft: theme.spacing.xs,
                    },
                  ]}
                >
                  {t('workouts.recommendationsTitle')}
                </Text>
              </View>
              {/* Right: AI Recommendations Toggle */}
              <View style={themedStyles.aiToggleContainer}>
                <Text
                  style={[
                    themedStyles.aiToggleLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('workouts.aiRecommendations') || 'AI Recs'}
                </Text>
                <Switch
                  value={aiRecommendationsEnabled}
                  onValueChange={handleToggleAIRecommendations}
                  disabled={
                    togglingAI ||
                    !memberProfile ||
                    !['PREMIUM', 'VIP'].includes(
                      memberProfile.membership_type || ''
                    )
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.isDark ? '#fff' : '#fff'}
                />
              </View>
            </View>
            <Text
              style={[
                themedStyles.recommendationsDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('workouts.recommendationsDescription')}
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
                  {t('workouts.loadingRecommendations')}
                </Text>
              </View>
            ) : recommendations.length > 0 ? (
              <View style={themedStyles.recommendationsContainer}>
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
                        themedStyles.recommendationCard,
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
                      <View style={themedStyles.recommendationHeader}>
                        <View
                          style={[
                            themedStyles.recommendationIconContainer,
                            { backgroundColor: priorityColor + '15' },
                          ]}
                        >
                          <Icon size={18} color={priorityColor} />
                        </View>
                        <View style={themedStyles.recommendationContent}>
                          <Text
                            style={[
                              themedStyles.recommendationTitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            {translateRecommendationTitle(rec.title)}
                          </Text>
                          <Text
                            style={[
                              themedStyles.recommendationPriority,
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
                          themedStyles.recommendationMessage,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {translateRecommendationMessage(rec.message, rec)}
                      </Text>
                      {rec.reasoning && (
                        <Text
                          style={[
                            themedStyles.recommendationReasoning,
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
            ) : (
              <View style={themedStyles.emptyRecommendations}>
                <Text
                  style={[
                    themedStyles.emptyRecommendationsText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {aiRecommendationsEnabled
                    ? t('workouts.noRecommendations') ||
                      'No recommendations available'
                    : t('workouts.aiRecommendationsDisabled') ||
                      'AI recommendations are currently disabled'}
                </Text>
                <Text
                  style={[
                    themedStyles.emptyRecommendationsSubtext,
                    {
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                    },
                  ]}
                >
                  {aiRecommendationsEnabled
                    ? t('workouts.enableAIForRecommendations') ||
                      'Turn on AI for personalized recommendations'
                    : t('workouts.enableAIToSeeRecommendations') ||
                      'Enable AI recommendations above to see personalized workout suggestions based on your activity and goals'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={themedStyles.section}>
          <Text
            style={[themedStyles.sectionTitle, { color: theme.colors.text }]}
          >
            {t('workouts.all')}
          </Text>
          <View style={themedStyles.workoutsContainer}>
            {filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  title={workout.name}
                  duration={`${workout.duration_weeks} weeks`}
                  exercises={workout.exercises?.length || 0}
                  image="https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800"
                  onPress={() => router.push(`/workouts/${workout.id}`)}
                  goal={workout.goal}
                  difficulty={workout.difficulty}
                  isActive={workout.is_active}
                  durationWeeks={workout.duration_weeks}
                />
              ))
            ) : (
              <EmptyState
                title={t('workouts.noWorkouts') || 'No workouts found'}
                description={
                  activeCategory !== 'All'
                    ? t('workouts.tryDifferentCategory') ||
                      'Try selecting a different category'
                    : t('workouts.createYourFirst') ||
                      'Create your first workout plan to get started'
                }
                actionLabel={t('workouts.createWorkout') || 'Create Workout'}
                onAction={() => router.push('/workouts/create')}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          themedStyles.floatingButton,
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

      {/* Max Plans Limit Modal */}
      <MaxPlansLimitModal
        visible={showMaxPlansModal}
        onClose={() => setShowMaxPlansModal(false)}
        currentCount={maxPlansData.currentCount}
        maxAllowed={maxPlansData.maxAllowed}
        membershipType={maxPlansData.membershipType}
      />

      {/* AI Generation Modal */}
      <AIWorkoutPromptModal
        visible={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onGenerate={handleAIGenerateWithPrompt}
        generating={generatingAI}
      />
      <AIGenerationModal
        visible={generatingAI}
        status={aiGenerationStatus}
        onComplete={handleAIGenerationComplete}
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <View
          style={[
            themedStyles.modalOverlay,
            { backgroundColor: 'rgba(0,0,0,0.5)' },
          ]}
        >
          <View
            style={[
              themedStyles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[themedStyles.modalTitle, { color: theme.colors.text }]}
            >
              {t('common.filter')}
            </Text>

            {/* Difficulty Filter */}
            <View style={themedStyles.filterSection}>
              <Text
                style={[themedStyles.filterLabel, { color: theme.colors.text }]}
              >
                {t('workouts.difficulty')}
              </Text>
              <View style={themedStyles.filterOptions}>
                {['all', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(
                  (difficulty) => (
                    <TouchableOpacity
                      key={difficulty}
                      style={[
                        themedStyles.filterOption,
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
                          themedStyles.filterOptionText,
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
            <View style={themedStyles.filterSection}>
              <Text
                style={[themedStyles.filterLabel, { color: theme.colors.text }]}
              >
                {t('workouts.duration')}
              </Text>
              <View style={themedStyles.filterOptions}>
                {['all', 'short', 'medium', 'long'].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      themedStyles.filterOption,
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
                        themedStyles.filterOptionText,
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
            <View style={themedStyles.filterSection}>
              <Text
                style={[themedStyles.filterLabel, { color: theme.colors.text }]}
              >
                {t('workouts.equipment')}
              </Text>
              <View style={themedStyles.filterOptions}>
                {['all', 'bodyweight', 'dumbbells', 'barbell', 'machine'].map(
                  (equipment) => (
                    <TouchableOpacity
                      key={equipment}
                      style={[
                        themedStyles.filterOption,
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
                          themedStyles.filterOptionText,
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
            <View style={themedStyles.modalActions}>
              <TouchableOpacity
                style={[
                  themedStyles.modalButton,
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
                  style={[
                    themedStyles.modalButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('common.reset')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  themedStyles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text
                  style={[
                    themedStyles.modalButtonText,
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

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
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
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    categoriesSection: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    categoriesContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    categoryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      marginRight: theme.spacing.xs,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    activeCategoryButton: {
      borderWidth: 1,
    },
    categoryText: {
      ...Typography.bodySmall,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    section: {
      marginTop: theme.spacing.lg,
    },
    sectionTitle: {
      ...Typography.h5,
      marginBottom: theme.spacing.lg,
      lineHeight: 20,
      includeFontPadding: false,
    },
    aiCtaCard: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg, // 12px - square
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    aiCtaContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    aiIconContainer: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.md, // 8px - square
      justifyContent: 'center',
      alignItems: 'center',
    },
    aiCtaTextContainer: {
      flex: 1,
    },
    aiCtaTitle: {
      ...Typography.h5,
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
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
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    aiCtaBadgeText: {
      ...Typography.caption,
      fontWeight: '600',
      fontSize: 11,
    },
    aiCtaButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg, // 12px - square
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    workoutsContainer: {
      marginBottom: 24,
    },
    floatingButton: {
      position: 'absolute',
      bottom: theme.spacing.lg,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: theme.radius.lg, // 12px - square (slightly rounded for FAB)
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    listContent: {
      paddingBottom: theme.spacing.xl,
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
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg, // 12px - square
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
      gap: theme.spacing.sm,
    },
    filterOption: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg, // 12px - square
      borderWidth: 1,
    },
    filterOptionText: {
      ...Typography.bodySmall,
      fontWeight: '500',
    },
    modalActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg, // 12px - square
      alignItems: 'center',
    },
    modalButtonText: {
      ...Typography.bodyMedium,
      fontWeight: '600',
    },
    recommendationsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    recommendationsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconWrapper: {
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recommendationsTitle: {
      fontFamily: FontFamily.spaceGroteskMedium,
      fontSize: 18,
      lineHeight: 20,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    aiToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
      justifyContent: 'center',
    },
    aiToggleLabel: {
      ...Typography.bodySmall,
      fontSize: 12,
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
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg, // 12px - square
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
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
    emptyRecommendations: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyRecommendationsText: {
      ...Typography.bodyMedium,
      textAlign: 'center',
      fontWeight: '600',
    },
    emptyRecommendationsSubtext: {
      ...Typography.bodySmall,
      textAlign: 'center',
      opacity: 0.7,
    },
  });
