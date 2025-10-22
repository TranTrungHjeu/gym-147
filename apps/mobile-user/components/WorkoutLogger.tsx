import {
  StopEquipmentUsageRequest,
  WorkoutLoggerProps,
} from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Activity, Clock, Flame, Save, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function WorkoutLogger({
  usage,
  onSave,
  onCancel,
  loading = false,
}: WorkoutLoggerProps) {
  const { theme } = useTheme();

  // Form state
  const [setsCompleted, setSetsCompleted] = useState(usage.sets_completed || 0);
  const [repsPerSet, setRepsPerSet] = useState(usage.reps_per_set || 0);
  const [weightUsed, setWeightUsed] = useState(usage.weight_used || 0);
  const [caloriesBurned, setCaloriesBurned] = useState(
    usage.calories_burned || 0
  );
  const [heartRateAvg, setHeartRateAvg] = useState(usage.heart_rate_avg || 0);
  const [heartRateMax, setHeartRateMax] = useState(usage.heart_rate_max || 0);
  const [notes, setNotes] = useState(usage.notes || '');

  const handleSave = () => {
    const saveData: StopEquipmentUsageRequest = {
      usage_id: usage.id,
      sets_completed: setsCompleted || undefined,
      reps_per_set: repsPerSet || undefined,
      weight_used: weightUsed || undefined,
      calories_burned: caloriesBurned || undefined,
      heart_rate_avg: heartRateAvg || undefined,
      heart_rate_max: heartRateMax || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(saveData);
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDurationMinutes = () => {
    const start = new Date(usage.start_time);
    const end = new Date();
    return Math.floor((end.getTime() - start.getTime()) / 60000);
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Log Workout
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            disabled={loading}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Equipment Info */}
          <View
            style={[
              styles.equipmentInfo,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.equipmentName, { color: theme.colors.text }]}>
              {usage.equipment?.name}
            </Text>
            <Text
              style={[
                styles.equipmentCategory,
                { color: theme.colors.textSecondary },
              ]}
            >
              {usage.equipment?.category}
            </Text>
            <View style={styles.durationContainer}>
              <Clock size={16} color={theme.colors.primary} />
              <Text style={[styles.durationText, { color: theme.colors.text }]}>
                {formatDuration(usage.start_time)}
              </Text>
            </View>
          </View>

          {/* Workout Stats */}
          <View
            style={[
              styles.statsSection,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Workout Statistics
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Activity size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Duration
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {getDurationMinutes()} min
                </Text>
              </View>

              <View style={styles.statItem}>
                <Flame size={20} color={theme.colors.warning} />
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Calories
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {caloriesBurned || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Sets and Reps */}
          <View
            style={[
              styles.inputSection,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Sets & Reps
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Sets Completed
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={setsCompleted.toString()}
                  onChangeText={(text) => setSetsCompleted(parseInt(text) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Reps per Set
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={repsPerSet.toString()}
                  onChangeText={(text) => setRepsPerSet(parseInt(text) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Weight Used (kg)
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={weightUsed.toString()}
                onChangeText={(text) => setWeightUsed(parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Health Metrics */}
          <View
            style={[
              styles.inputSection,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Health Metrics
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Calories Burned
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={caloriesBurned.toString()}
                  onChangeText={(text) =>
                    setCaloriesBurned(parseInt(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Avg Heart Rate
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={heartRateAvg.toString()}
                  onChangeText={(text) => setHeartRateAvg(parseInt(text) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Max Heart Rate
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={heartRateMax.toString()}
                onChangeText={(text) => setHeartRateMax(parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Notes */}
          <View
            style={[
              styles.inputSection,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Notes
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about your workout..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text
              style={[styles.cancelButtonText, { color: theme.colors.text }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color={theme.colors.textInverse}
                size="small"
              />
            ) : (
              <>
                <Save size={16} color={theme.colors.textInverse} />
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  Save Workout
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  equipmentInfo: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  equipmentCategory: {
    fontSize: 14,
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  statsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
