import YouTubeVideoPlayer from '@/components/YouTubeVideoPlayer';
import { workoutPlanService, youtubeVideoService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Dumbbell, Play, Target } from 'lucide-react-native';
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
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {t('workouts.workoutDetails')}
        </Text>
        <View style={themedStyles.headerSpacer} />
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
        <View style={themedStyles.workoutInfo}>
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

          {/* Workout Stats */}
          <View style={themedStyles.statsContainer}>
            <View style={themedStyles.statItem}>
              <Clock size={18} color={theme.colors.primary} />
              <Text
                style={[themedStyles.statText, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {workout.duration_weeks} {t('common.week')}
              </Text>
            </View>

            <View style={themedStyles.statItem}>
              <Target
                size={18}
                color={getDifficultyColor(workout.difficulty)}
              />
              <Text
                style={[themedStyles.statText, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {workout.difficulty.charAt(0) +
                  workout.difficulty.slice(1).toLowerCase()}
              </Text>
            </View>

            <View style={themedStyles.statItem}>
              <Dumbbell size={18} color={theme.colors.primary} />
              <Text
                style={[themedStyles.statText, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {Array.isArray(workout.exercises)
                  ? workout.exercises.length
                  : 0}
              </Text>
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
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
    },
    backButton: {
      padding: theme.spacing.sm,
    },
    headerTitle: {
      ...Typography.h3,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: theme.spacing.md,
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
      marginTop: -theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      ...theme.shadows.lg,
    },
    workoutName: {
      ...Typography.h2,
      marginBottom: theme.spacing.xs,
    },
    workoutDescription: {
      ...Typography.bodyMedium,
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
      opacity: 0.8,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    statItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.03)',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radius.md,
    },
    statText: {
      ...Typography.bodySmall,
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
