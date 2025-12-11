import ShareModal from '@/components/ShareModal';
import YouTubeVideoPlayer from '@/components/YouTubeVideoPlayer';
import { workoutPlanService, youtubeVideoService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Play,
  Share2,
  Target,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Exercise {
  id: string;
  name: string;
  description?: string;
  sets: number;
  reps: string | number;
  duration?: number;
  equipment?: string;
  video_url?: string;
  image_url?: string;
}

interface WorkoutPlan {
  id: string;
  member_id: string;
  name: string;
  description?: string;
  duration_weeks: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  goal?: string;
  exercises: Exercise[]; // Array of exercises
  is_active: boolean;
  ai_generated: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export default function WorkoutDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exerciseVideos, setExerciseVideos] = useState<{ [key: string]: any }>(
    {}
  );
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkout();
    }
  }, [id]);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('Workout ID not provided');
        return;
      }

      // Call real API to get workout details
      const response = await workoutPlanService.getWorkoutPlanById(id);

      if (response.success && response.data) {
        // Extract workoutPlan from response.data
        const workoutPlan = (response.data as any).workoutPlan || response.data;
        setWorkout(workoutPlan);

        // Load exercise videos
        if (workoutPlan.exercises && Array.isArray(workoutPlan.exercises)) {
          loadExerciseVideos(workoutPlan.exercises);
        }
      } else {
        setError(response.error || 'Failed to load workout details');
      }
    } catch (error: any) {
      console.error('Error loading workout:', error);
      setError(error.message || 'Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const loadExerciseVideos = async (exercises: Exercise[]) => {
    if (loadingVideos) return;

    setLoadingVideos(true);
    try {
      const exerciseNames = exercises.map((ex) => ex.name);
      const videos = await youtubeVideoService.getMultipleExerciseVideos(
        exerciseNames
      );
      setExerciseVideos(videos);
    } catch (error) {
      console.error('Error loading exercise videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleLoadVideo = async (exerciseName: string) => {
    try {
      const video = await youtubeVideoService.getExerciseVideo(exerciseName);
      if (video) {
        setExerciseVideos((prev) => ({
          ...prev,
          [exerciseName]: video,
        }));
      }
    } catch (error) {
      console.error('Error loading video:', error);
    }
  };

  const handleStartWorkout = () => {
    Alert.alert(t('workouts.startWorkout'), t('workouts.readyToStart'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: () => {
          // Navigate to workout session screen
          router.push(`/workouts/${id}/session` as any);
        },
      },
    ]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return theme.colors.success;
      case 'INTERMEDIATE':
        return theme.colors.warning;
      case 'ADVANCED':
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const themedStyles = styles(theme);

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
            {t('workouts.loadingWorkout')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workout) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.errorContainer}>
          <Text style={[themedStyles.errorText, { color: theme.colors.error }]}>
            {error || t('workouts.workoutNotFound')}
          </Text>
          <TouchableOpacity
            style={[
              themedStyles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={loadWorkout}
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
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            themedStyles.backButton,
            {
              backgroundColor: theme.isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={themedStyles.headerTitleContainer}>
          <Text
            style={[themedStyles.headerTitle, { color: theme.colors.text }]}
          >
            {t('workouts.workoutDetails')}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            themedStyles.backButton,
            {
              backgroundColor: theme.isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
          onPress={() => setShowShareModal(true)}
        >
          <Share2 size={22} color={theme.colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themedStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Workout Image */}
        <Image
          source={{
            uri: 'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
          }}
          style={themedStyles.workoutImage}
        />

        {/* Workout Info */}
        <View
          style={[
            themedStyles.workoutInfo,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[themedStyles.workoutName, { color: theme.colors.text }]}
          >
            {workout.name}
          </Text>

          {workout.description && (
            <Text
              style={[
                themedStyles.workoutDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {workout.description}
            </Text>
          )}

          {/* Divider */}
          {workout.description && (
            <View
              style={[
                themedStyles.divider,
                { backgroundColor: theme.colors.border },
              ]}
            />
          )}

          {/* Workout Stats */}
          <View style={themedStyles.statsContainer}>
            <View
              style={[
                themedStyles.statItem,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(243, 97, 0, 0.08)',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(243, 97, 0, 0.12)',
                },
              ]}
            >
              <View
                style={[
                  themedStyles.statIconContainer,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Clock
                  size={20}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              </View>
              <View style={themedStyles.statTextContainer}>
                <Text
                  style={[themedStyles.statValue, { color: theme.colors.text }]}
                >
                  {workout.duration_weeks}
                </Text>
                <Text
                  style={[
                    themedStyles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('common.week')}
                </Text>
              </View>
            </View>

            <View
              style={[
                themedStyles.statItem,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : getDifficultyColor(workout.difficulty) + '10',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : getDifficultyColor(workout.difficulty) + '25',
                },
              ]}
            >
              <View
                style={[
                  themedStyles.statIconContainer,
                  {
                    backgroundColor:
                      getDifficultyColor(workout.difficulty) + '20',
                  },
                ]}
              >
                <Target
                  size={20}
                  color={getDifficultyColor(workout.difficulty)}
                  strokeWidth={2.5}
                />
              </View>
              <View style={themedStyles.statTextContainer}>
                <Text
                  style={[themedStyles.statValue, { color: theme.colors.text }]}
                >
                  {workout.difficulty.charAt(0).toUpperCase()}
                </Text>
                <Text
                  style={[
                    themedStyles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {workout.difficulty.slice(1).toLowerCase()}
                </Text>
              </View>
            </View>

            <View
              style={[
                themedStyles.statItem,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(243, 97, 0, 0.08)',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(243, 97, 0, 0.12)',
                },
              ]}
            >
              <View
                style={[
                  themedStyles.statIconContainer,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Dumbbell
                  size={20}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              </View>
              <View style={themedStyles.statTextContainer}>
                <Text
                  style={[themedStyles.statValue, { color: theme.colors.text }]}
                >
                  {Array.isArray(workout.exercises)
                    ? workout.exercises.length
                    : 0}
                </Text>
                <Text
                  style={[
                    themedStyles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('workouts.exercises')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Exercises List */}
        <View style={themedStyles.exercisesSection}>
          <Text
            style={[themedStyles.sectionTitle, { color: theme.colors.primary }]}
          >
            {t('workouts.exercises')}
          </Text>

          {(Array.isArray(workout.exercises) ? workout.exercises : []).length >
          0 ? (
            (Array.isArray(workout.exercises) ? workout.exercises : []).map(
              (exercise, index) => (
                <View
                  key={exercise.id || index}
                  style={[
                    themedStyles.exerciseCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={themedStyles.exerciseHeader}>
                    <View style={themedStyles.exerciseNumber}>
                      <Text
                        style={[
                          themedStyles.exerciseNumberText,
                          { color: theme.colors.textInverse },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <View style={themedStyles.exerciseInfo}>
                      <Text
                        style={[
                          themedStyles.exerciseName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {exercise.name || t('workouts.exercises')}
                      </Text>
                      {exercise.equipment && (
                        <Text
                          style={[
                            themedStyles.exerciseEquipment,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {exercise.equipment}
                        </Text>
                      )}
                    </View>

                    {(exercise.sets || exercise.reps || exercise.duration) && (
                      <View style={themedStyles.exerciseStats}>
                        {exercise.sets && exercise.reps && (
                          <Text
                            style={[
                              themedStyles.exerciseStatsText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {exercise.sets} × {exercise.reps}
                          </Text>
                        )}
                        {exercise.duration && (
                          <Text
                            style={[
                              themedStyles.exerciseStatsText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {exercise.duration} {t('workouts.duration')}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {exercise.description && (
                    <Text
                      style={[
                        themedStyles.exerciseDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {exercise.description}
                    </Text>
                  )}

                  {/* Exercise Video Player */}
                  <YouTubeVideoPlayer
                    exerciseName={exercise.name}
                    video={exerciseVideos[exercise.name]}
                    loading={loadingVideos && !exerciseVideos[exercise.name]}
                    onLoadVideo={() => handleLoadVideo(exercise.name)}
                  />
                </View>
              )
            )
          ) : (
            <View
              style={[
                themedStyles.exerciseCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  themedStyles.exerciseDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('workouts.noExercises')}
              </Text>
            </View>
          )}
        </View>

        {/* Start Workout Button */}
        <TouchableOpacity
          style={[
            themedStyles.startButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleStartWorkout}
          activeOpacity={0.8}
        >
          <Play
            size={24}
            color={theme.colors.textInverse}
            fill={theme.colors.textInverse}
          />
          <Text
            style={[
              themedStyles.startButtonText,
              { color: theme.colors.textInverse },
            ]}
          >
            {t('workouts.startWorkout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Share Modal */}
      {workout && (
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={workout.name}
          message={
            workout.description ||
            t('workouts.shareMessage', {
              defaultValue: 'Check out this workout plan!',
            })
          }
          url={`${
            process.env.EXPO_PUBLIC_APP_URL || 'https://gym-147.app'
          }/workouts/${workout.id}`}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      ...theme.shadows.sm,
      elevation: 2,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    headerTitle: {
      ...Typography.h4,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    workoutImage: {
      width: '100%',
      height: 240,
      resizeMode: 'cover',
    },
    workoutInfo: {
      marginTop: -theme.spacing.xl - theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.xl,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      ...theme.shadows.lg,
    },
    workoutName: {
      ...Typography.h2,
      marginBottom: theme.spacing.sm,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    workoutDescription: {
      ...Typography.bodyMedium,
      lineHeight: 24,
      opacity: 0.85,
    },
    divider: {
      height: 1,
      marginVertical: theme.spacing.lg,
      opacity: 0.3,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    statItem: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      ...theme.shadows.sm,
    },
    statIconContainer: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statTextContainer: {
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      ...Typography.h4,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    statLabel: {
      ...Typography.caption,
      fontSize: 11,
      textTransform: 'capitalize',
    },
    exercisesSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      ...Typography.h3,
      marginBottom: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
      alignSelf: 'flex-start',
    },
    exerciseCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    exerciseNumber: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
      ...theme.shadows.sm,
    },
    exerciseNumberText: {
      ...Typography.h6,
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      ...Typography.h5,
      marginBottom: theme.spacing.xs,
    },
    exerciseEquipment: {
      ...Typography.bodySmall,
      opacity: 0.7,
    },
    exerciseStats: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingLeft: theme.spacing.md,
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.03)',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    exerciseStatsText: {
      ...Typography.h4,
    },
    exerciseDescription: {
      ...Typography.bodyMedium,
      marginBottom: theme.spacing.md,
      lineHeight: 20,
      opacity: 0.8,
      paddingLeft: theme.spacing.xxl + theme.spacing.md,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      marginTop: theme.spacing.lg,
      borderRadius: theme.radius.xl,
      gap: theme.spacing.sm,
      ...theme.shadows.lg,
    },
    startButtonText: {
      ...Typography.h5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...Typography.bodyMedium,
      marginTop: theme.spacing.sm,
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
      marginBottom: theme.spacing.lg,
    },
    retryButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.sm,
      ...theme.shadows.sm,
    },
    retryButtonText: {
      ...Typography.buttonMedium,
    },
  });
