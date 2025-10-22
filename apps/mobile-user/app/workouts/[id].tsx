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
    Alert.alert('Start Workout', 'Are you ready to begin this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
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

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading workout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workout) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || 'Workout not found'}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={loadWorkout}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Workout Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout Image */}
        <Image
          source={{
            uri: 'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
          }}
          style={styles.workoutImage}
        />

        {/* Workout Info */}
        <View style={styles.workoutInfo}>
          <Text style={[styles.workoutName, { color: theme.colors.text }]}>
            {workout.name}
          </Text>

          {workout.description && (
            <Text
              style={[
                styles.workoutDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {workout.description}
            </Text>
          )}

          {/* Workout Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Clock size={16} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {workout.duration_weeks} weeks
              </Text>
            </View>

            <View style={styles.statItem}>
              <Target
                size={16}
                color={getDifficultyColor(workout.difficulty)}
              />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {workout.difficulty}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Dumbbell size={16} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {Array.isArray(workout.exercises)
                  ? workout.exercises.length
                  : 0}{' '}
                exercises
              </Text>
            </View>
          </View>
        </View>

        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Exercises
          </Text>

          {(Array.isArray(workout.exercises) ? workout.exercises : []).length >
          0 ? (
            (Array.isArray(workout.exercises) ? workout.exercises : []).map(
              (exercise, index) => (
                <View
                  key={exercise.id || index}
                  style={[
                    styles.exerciseCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseNumber}>
                      <Text
                        style={[
                          styles.exerciseNumberText,
                          { color: theme.colors.textInverse },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text
                        style={[
                          styles.exerciseName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {exercise.name || 'Exercise'}
                      </Text>
                      {exercise.equipment && (
                        <Text
                          style={[
                            styles.exerciseEquipment,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {exercise.equipment}
                        </Text>
                      )}
                    </View>
                  </View>

                  {exercise.description && (
                    <Text
                      style={[
                        styles.exerciseDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {exercise.description}
                    </Text>
                  )}

                  <View style={styles.exerciseDetails}>
                    {exercise.sets && (
                      <View style={styles.exerciseDetail}>
                        <Text
                          style={[
                            styles.exerciseDetailLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          Sets
                        </Text>
                        <Text
                          style={[
                            styles.exerciseDetailValue,
                            { color: theme.colors.text },
                          ]}
                        >
                          {exercise.sets}
                        </Text>
                      </View>
                    )}

                    {(exercise.reps || exercise.duration) && (
                      <View style={styles.exerciseDetail}>
                        <Text
                          style={[
                            styles.exerciseDetailLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {exercise.duration ? 'Duration' : 'Reps'}
                        </Text>
                        <Text
                          style={[
                            styles.exerciseDetailValue,
                            { color: theme.colors.text },
                          ]}
                        >
                          {exercise.duration
                            ? `${exercise.duration}s`
                            : exercise.reps}
                        </Text>
                      </View>
                    )}
                  </View>

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
                styles.exerciseCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.exerciseDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No exercises available for this workout plan.
              </Text>
            </View>
          )}
        </View>

        {/* Start Workout Button */}
        <TouchableOpacity
          style={[
            styles.startButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleStartWorkout}
        >
          <Play size={20} color={theme.colors.textInverse} />
          <Text
            style={[
              styles.startButtonText,
              { color: theme.colors.textInverse },
            ]}
          >
            Start Workout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  workoutImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  workoutInfo: {
    padding: 20,
  },
  workoutName: {
    ...Typography.h3,
    marginBottom: 8,
  },
  workoutDescription: {
    ...Typography.bodyMedium,
    marginBottom: 16,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  exercisesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: 16,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseEquipment: {
    ...Typography.bodySmall,
  },
  exerciseDescription: {
    ...Typography.bodySmall,
    marginBottom: 12,
    lineHeight: 18,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  exerciseDetail: {
    alignItems: 'center',
  },
  exerciseDetailLabel: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  exerciseDetailValue: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});
