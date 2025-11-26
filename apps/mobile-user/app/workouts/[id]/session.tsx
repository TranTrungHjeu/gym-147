import { workoutPlanService, memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Clock, Play, Square, StopCircle } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

interface Exercise {
  id?: string;
  name: string;
  description?: string;
  sets?: number;
  reps?: string | number;
  duration?: number;
  category?: string;
  intensity?: string;
  equipment?: string;
  rest?: string | number;
}

interface WorkoutPlan {
  id: string;
  member_id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

interface CompletedExercise {
  id?: string;
  name: string;
  sets?: number;
  reps?: string | number;
  duration?: number;
  category?: string;
  intensity?: string;
  rest?: string | number;
}

export default function WorkoutSessionScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, member } = useAuth();

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [duration, setDuration] = useState(0); // seconds
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [completing, setCompleting] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadWorkout();
      loadMemberId();
    }

    return () => {
      // Cleanup interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  const loadMemberId = async () => {
    try {
      // Try to get member ID from AuthContext member first
      if (member?.id) {
        setMemberId(member.id);
        return;
      }

      // If not available, load member profile
      const profileResponse = await memberService.getMemberProfile();
      if (profileResponse.success && profileResponse.data?.id) {
        setMemberId(profileResponse.data.id);
      } else {
        // Fallback to user.id (may not work for workout sessions, but better than nothing)
        setMemberId(user?.id || null);
      }
    } catch (error) {
      console.error('Error loading member ID:', error);
      // Fallback to user.id
      setMemberId(user?.id || null);
    }
  };

  // Timer effect
  useEffect(() => {
    if (isStarted && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setDuration(elapsed);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isStarted]);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('Workout ID not provided');
        return;
      }

      const response = await workoutPlanService.getWorkoutPlanById(id);

      if (response.success && response.data) {
        const workoutPlan = (response.data as any).workoutPlan || response.data;
        setWorkout(workoutPlan);
      } else {
        setError(response.error || 'Failed to load workout plan');
      }
    } catch (error: any) {
      console.error('Error loading workout:', error);
      setError(error.message || 'Failed to load workout plan');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = () => {
    Alert.alert(
      t('workouts.startWorkout'),
      t('workouts.readyToStart', { default: 'Ready to start this workout?' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            startTimeRef.current = Date.now();
            setIsStarted(true);
            setDuration(0);
            setCompletedExercises([]);
          },
        },
      ]
    );
  };

  const toggleExerciseComplete = (exercise: Exercise) => {
    const isCompleted = completedExercises.some(
      (ex) => (ex.id && exercise.id && ex.id === exercise.id) || ex.name === exercise.name
    );

    if (isCompleted) {
      // Remove from completed
      setCompletedExercises((prev) =>
        prev.filter(
          (ex) => !((ex.id && exercise.id && ex.id === exercise.id) || ex.name === exercise.name)
        )
      );
    } else {
      // Add to completed
      setCompletedExercises((prev) => [
        ...prev,
        {
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          duration: exercise.duration,
          category: exercise.category,
          intensity: exercise.intensity,
          rest: exercise.rest,
        },
      ]);
    }
  };

  const handleEndWorkout = () => {
    if (completedExercises.length === 0) {
      Alert.alert(
        t('common.error'),
        t('workouts.completeAtLeastOneExercise', {
          default: 'Please complete at least one exercise before finishing the workout.',
        })
      );
      return;
    }

    const exercises = workout?.exercises || [];
    const totalExercises = exercises.length;
    const completedCount = completedExercises.length;

    Alert.alert(
      t('workouts.completeWorkout', { default: 'Complete Workout' }),
      t('workouts.confirmCompleteWorkout', {
        default: 'You completed {{count}} out of {{total}} exercises. Do you want to finish the workout?',
        count: completedCount,
        total: totalExercises,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            completeWorkout();
          },
        },
      ]
    );
  };

  const completeWorkout = async () => {
    // Use memberId from state (loaded from member profile)
    const currentMemberId = memberId || member?.id;
    if (!currentMemberId || !id || !workout) {
      Alert.alert(
        t('common.error'),
        'Member ID not available. Please make sure you are logged in and have completed your profile.'
      );
      return;
    }

    try {
      setCompleting(true);

      const durationMinutes = Math.floor(duration / 60);

      const response = await workoutPlanService.completeWorkoutSession(currentMemberId, {
        workout_plan_id: id,
        completed_exercises: completedExercises,
        duration_minutes: durationMinutes,
      });

      if (response.success && response.data) {
        const calories = response.data.calories?.from_workout || 0;
        const totalCalories = response.data.calories?.total_in_session || 0;

        // Stop timer
        setIsStarted(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Show success message
        Alert.alert(
          t('workouts.workoutCompleted', { default: 'Workout Completed!' }),
          t('workouts.workoutCompletedMessage', {
            default: 'Great job! You burned {{calories}} calories from {{exercises}} exercises.',
            calories,
            exercises: completedExercises.length,
          }),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to complete workout session'
        );
      }
    } catch (error: any) {
      console.error('Error completing workout:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to complete workout session'
      );
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExerciseCompleted = (exercise: Exercise) => {
    return completedExercises.some(
      (ex) => (ex.id && exercise.id && ex.id === exercise.id) || ex.name === exercise.name
    );
  };

  const themedStyles = styles(theme);

  if (loading) {
    return (
      <SafeAreaView style={[themedStyles.container, { backgroundColor: theme.colors.background }]}>
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[themedStyles.loadingText, { color: theme.colors.text }]}>
            {t('workouts.loadingWorkout', { default: 'Loading workout...' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workout) {
    return (
      <SafeAreaView style={[themedStyles.container, { backgroundColor: theme.colors.background }]}>
        <View style={themedStyles.errorContainer}>
          <Text style={[themedStyles.errorText, { color: theme.colors.error }]}>
            {error || 'Workout not found'}
          </Text>
          <TouchableOpacity
            style={[themedStyles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadWorkout}
          >
            <Text style={[themedStyles.retryButtonText, { color: theme.colors.textInverse }]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  return (
    <SafeAreaView style={[themedStyles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[themedStyles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={themedStyles.backButton}>
          <Text style={[themedStyles.backButtonText, { color: theme.colors.primary }]}>
            {t('common.back')}
          </Text>
        </TouchableOpacity>
        <Text style={[themedStyles.headerTitle, { color: theme.colors.text }]}>
          {workout.name}
        </Text>
        <View style={themedStyles.placeholder} />
      </View>

      <ScrollView style={themedStyles.content} showsVerticalScrollIndicator={false}>
        {/* Timer Section */}
        {isStarted && (
          <View style={[themedStyles.timerCard, { backgroundColor: theme.colors.primary }]}>
            <Clock size={32} color={theme.colors.textInverse} />
            <Text style={[themedStyles.timerText, { color: theme.colors.textInverse }]}>
              {formatTime(duration)}
            </Text>
            <Text style={[themedStyles.timerLabel, { color: theme.colors.textInverse }]}>
              {completedExercises.length} / {exercises.length} {t('workouts.exercises', { default: 'Exercises' })}
            </Text>
          </View>
        )}

        {/* Start Button */}
        {!isStarted && (
          <TouchableOpacity
            style={[themedStyles.startButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleStartWorkout}
            activeOpacity={0.8}
          >
            <Play size={24} color={theme.colors.textInverse} fill={theme.colors.textInverse} />
            <Text style={[themedStyles.startButtonText, { color: theme.colors.textInverse }]}>
              {t('workouts.startWorkout')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Exercises List */}
        {isStarted && (
          <View style={themedStyles.exercisesSection}>
            <Text style={[themedStyles.sectionTitle, { color: theme.colors.text }]}>
              {t('workouts.exercises', { default: 'Exercises' })}
            </Text>

            {exercises.map((exercise, index) => {
              const isCompleted = isExerciseCompleted(exercise);

              return (
                <TouchableOpacity
                  key={exercise.id || index}
                  style={[
                    themedStyles.exerciseCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isCompleted ? theme.colors.success : theme.colors.border,
                      borderWidth: isCompleted ? 2 : 1,
                    },
                  ]}
                  onPress={() => toggleExerciseComplete(exercise)}
                  activeOpacity={0.7}
                >
                  <View style={themedStyles.exerciseHeader}>
                    <View
                      style={[
                        themedStyles.exerciseNumber,
                        {
                          backgroundColor: isCompleted ? theme.colors.success : theme.colors.primary,
                        },
                      ]}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={20} color={theme.colors.textInverse} />
                      ) : (
                        <Text
                          style={[
                            themedStyles.exerciseNumberText,
                            { color: theme.colors.textInverse },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    <View style={themedStyles.exerciseInfo}>
                      <Text style={[themedStyles.exerciseName, { color: theme.colors.text }]}>
                        {exercise.name}
                      </Text>
                      <View style={themedStyles.exerciseDetails}>
                        {exercise.sets && (
                          <Text
                            style={[themedStyles.exerciseDetail, { color: theme.colors.textSecondary }]}
                          >
                            {exercise.sets} {t('workouts.sets', { default: 'sets' })}
                          </Text>
                        )}
                        {exercise.reps && (
                          <Text
                            style={[themedStyles.exerciseDetail, { color: theme.colors.textSecondary }]}
                          >
                            × {exercise.reps} {t('workouts.reps', { default: 'reps' })}
                          </Text>
                        )}
                        {exercise.duration && (
                          <Text
                            style={[themedStyles.exerciseDetail, { color: theme.colors.textSecondary }]}
                          >
                            {Math.floor(exercise.duration / 60)} {t('workouts.min', { default: 'min' })}
                          </Text>
                        )}
                      </View>
                    </View>

                    {isCompleted ? (
                      <CheckCircle2 size={24} color={theme.colors.success} />
                    ) : (
                      <Square size={24} color={theme.colors.border} />
                    )}
                  </View>

                  {exercise.description && (
                    <Text
                      style={[themedStyles.exerciseDescription, { color: theme.colors.textSecondary }]}
                    >
                      {exercise.description}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* End Workout Button */}
        {isStarted && (
          <TouchableOpacity
            style={[
              themedStyles.endButton,
              {
                backgroundColor:
                  completedExercises.length === 0 ? theme.colors.disabled : theme.colors.error,
              },
            ]}
            onPress={handleEndWorkout}
            disabled={completedExercises.length === 0 || completing}
            activeOpacity={0.8}
          >
            {completing ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <StopCircle size={24} color={theme.colors.textInverse} />
            )}
            <Text style={[themedStyles.endButtonText, { color: theme.colors.textInverse }]}>
              {t('workouts.finishWorkout', { default: 'Finish Workout' })}
            </Text>
          </TouchableOpacity>
        )}
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
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: theme.spacing.xs,
    },
    backButtonText: {
      ...Typography.bodyMedium,
    },
    headerTitle: {
      ...Typography.h5,
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 60,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...Typography.bodyMedium,
      marginTop: theme.spacing.md,
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
    timerCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.xl,
      gap: theme.spacing.sm,
      ...theme.shadows.lg,
    },
    timerText: {
      ...Typography.h1,
      fontSize: 48,
      fontWeight: 'bold',
    },
    timerLabel: {
      ...Typography.bodyMedium,
      opacity: 0.9,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xl,
      borderRadius: theme.radius.xl,
      gap: theme.spacing.sm,
      ...theme.shadows.lg,
    },
    startButtonText: {
      ...Typography.h5,
    },
    exercisesSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    sectionTitle: {
      ...Typography.h5,
      marginBottom: theme.spacing.md,
    },
    exerciseCard: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    exerciseNumber: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exerciseNumberText: {
      ...Typography.h5,
      fontWeight: 'bold',
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      ...Typography.h6,
      marginBottom: theme.spacing.xs,
    },
    exerciseDetails: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    exerciseDetail: {
      ...Typography.bodySmall,
    },
    exerciseDescription: {
      ...Typography.bodySmall,
      marginTop: theme.spacing.sm,
      paddingLeft: theme.spacing.xxl + theme.spacing.md,
    },
    endButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      borderRadius: theme.radius.xl,
      gap: theme.spacing.sm,
      ...theme.shadows.lg,
    },
    endButtonText: {
      ...Typography.h5,
    },
  });

