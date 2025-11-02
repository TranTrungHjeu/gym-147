import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Save, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  duration?: number;
  equipment?: string;
}

interface WorkoutForm {
  name: string;
  description: string;
  goal: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration_weeks: number;
  exercises: Exercise[];
}

export default function CreateWorkoutScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WorkoutForm>({
    name: '',
    description: '',
    goal: '',
    difficulty: 'BEGINNER',
    duration_weeks: 4,
    exercises: [],
  });
  const [newExercise, setNewExercise] = useState({
    name: '',
    sets: 3,
    reps: 10,
    duration: 0,
    equipment: '',
  });

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.goal.trim()
    ) {
      Alert.alert(t('common.error'), t('workouts.fillAllFields'));
      return;
    }

    if (formData.exercises.length === 0) {
      Alert.alert(t('common.error'), t('workouts.addAtLeastOneExercise'));
      return;
    }

    try {
      setLoading(true);

      // In a real app, you would call the API to create the workout
      // const response = await workoutPlanService.createWorkoutPlan(formData);

      // For now, simulate the API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert(t('common.success'), t('workouts.workoutCreated'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('workouts.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const addExercise = () => {
    if (!newExercise.name.trim()) {
      Alert.alert(t('common.error'), t('workouts.enterExerciseName'));
      return;
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: newExercise.name.trim(),
      sets: newExercise.sets,
      reps: newExercise.reps,
      duration: newExercise.duration || undefined,
      equipment: newExercise.equipment.trim() || undefined,
    };

    setFormData((prev) => ({
      ...prev,
      exercises: [...prev.exercises, exercise],
    }));

    setNewExercise({
      name: '',
      sets: 3,
      reps: 10,
      duration: 0,
      equipment: '',
    });
  };

  const removeExercise = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  };

  const updateField = (field: keyof WorkoutForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateExerciseField = (field: keyof typeof newExercise, value: any) => {
    setNewExercise((prev) => ({ ...prev, [field]: value }));
  };

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
          Create Workout
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Save size={20} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('workouts.basicInformation')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('workouts.workoutName')} {t('workouts.requiredField')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={formData.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder={t('workouts.enterWorkoutName')}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('workouts.workoutDescription')} {t('workouts.requiredField')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={formData.description}
                onChangeText={(value) => updateField('description', value)}
                placeholder={t('workouts.describeWorkout')}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('workouts.workoutGoal')} {t('workouts.requiredField')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={formData.goal}
                onChangeText={(value) => updateField('goal', value)}
                placeholder={t('workouts.workoutGoalsPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('workouts.workoutDifficulty')}
              </Text>
              <View style={styles.difficultyContainer}>
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map(
                  (difficulty) => (
                    <TouchableOpacity
                      key={difficulty}
                      style={[
                        styles.difficultyOption,
                        {
                          backgroundColor:
                            formData.difficulty === difficulty
                              ? theme.colors.primary
                              : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => updateField('difficulty', difficulty)}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          {
                            color:
                              formData.difficulty === difficulty
                                ? theme.colors.textInverse
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {difficulty}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('workouts.workoutDuration')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={formData.duration_weeks.toString()}
                onChangeText={(value) =>
                  updateField('duration_weeks', parseInt(value) || 4)
                }
                placeholder={t('workouts.setsPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Exercises */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('workouts.exercisesSection')} ({formData.exercises.length})
            </Text>

            {/* Add Exercise Form */}
            <View
              style={[
                styles.addExerciseForm,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.inputRow}>
                <View style={styles.inputGroupSmall}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    {t('workouts.exerciseName')} {t('workouts.requiredField')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    value={newExercise.name}
                    onChangeText={(value) => updateExerciseField('name', value)}
                    placeholder={t('workouts.exerciseNamePlaceholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupSmall}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    {t('workouts.exerciseSets')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    value={newExercise.sets.toString()}
                    onChangeText={(value) =>
                      updateExerciseField('sets', parseInt(value) || 3)
                    }
                    placeholder={t('workouts.setsPlaceholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroupSmall}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    {t('workouts.exerciseReps')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    value={newExercise.reps.toString()}
                    onChangeText={(value) =>
                      updateExerciseField('reps', parseInt(value) || 10)
                    }
                    placeholder="10"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupSmall}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    {t('workouts.exerciseEquipment')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    value={newExercise.equipment}
                    onChangeText={(value) =>
                      updateExerciseField('equipment', value)
                    }
                    placeholder={t('workouts.equipmentPlaceholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={addExercise}
              >
                <Plus size={20} color={theme.colors.textInverse} />
                <Text
                  style={[
                    styles.addButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('workouts.addExerciseButton')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Exercise List */}
            {formData.exercises.map((exercise, index) => (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseItem,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.exerciseContent}>
                  <Text
                    style={[styles.exerciseName, { color: theme.colors.text }]}
                  >
                    {index + 1}. {exercise.name}
                  </Text>
                  <Text
                    style={[
                      styles.exerciseDetails,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {exercise.sets} sets × {exercise.reps} reps
                    {exercise.equipment && ` • ${exercise.equipment}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    { backgroundColor: theme.colors.error },
                  ]}
                  onPress={() => removeExercise(exercise.id)}
                >
                  <X size={16} color={theme.colors.textInverse} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
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
  saveButton: {
    padding: 8,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  form: {
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupSmall: {
    flex: 1,
    marginBottom: 12,
  },
  label: {
    ...Typography.bodyMedium,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.bodyMedium,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  difficultyText: {
    ...Typography.bodyMedium,
    fontWeight: '500',
  },
  addExerciseForm: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    ...Typography.bodySmall,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
});
