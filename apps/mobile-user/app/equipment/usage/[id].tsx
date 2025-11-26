import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { equipmentService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UsageDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editSets, setEditSets] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');

  useEffect(() => {
    loadUsage();
  }, [id]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsage = async () => {
    if (!user?.id || !id) return;

    try {
      setLoading(true);
      setError(null);
      
      // Try to get specific usage by ID first, fallback to history search
      const response = await equipmentService.getMemberUsageHistory(user.id);
      if (response.success && response.data) {
        const foundUsage = response.data.find((u: any) => u.id === id);
        if (foundUsage) {
          setUsage(foundUsage);
          setEditSets(foundUsage.sets_completed?.toString() || '');
          setEditReps(foundUsage.reps_per_set?.toString() || '');
          setEditWeight(foundUsage.weight_used?.toString() || '');
        } else {
          setError('Usage record not found');
        }
      } else {
        setError('Failed to load usage data');
      }
    } catch (error: any) {
      console.error('Error loading usage:', error);
      setError(error.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!usage || !user?.id) return;

    try {
      setSaving(true);
      
      // Call API to update usage
      const updateData: any = {};
      if (editSets) updateData.sets_completed = parseInt(editSets);
      if (editReps) updateData.reps_per_set = parseInt(editReps);
      if (editWeight) updateData.weight_used = parseFloat(editWeight);

      // Use equipment service to update usage
      // Note: This might need a dedicated update endpoint
      const response = await equipmentService.stopEquipmentUsage(
        user.id,
        usage.id,
        updateData
      );

      if (response.success) {
        Alert.alert(t('common.success'), t('equipment.usageUpdated'));
        setIsEditing(false);
        await loadUsage();
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Error updating usage:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('equipment.usageUpdateFailed')
      );
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
            {t('equipment.usageDetail')}
          </Text>
        </View>
        <View style={styles.skeletonContainer}>
          <View style={[styles.skeletonCard, { backgroundColor: theme.colors.surface }]} />
          <View style={[styles.skeletonCard, { backgroundColor: theme.colors.surface }]} />
          <View style={[styles.skeletonCard, { backgroundColor: theme.colors.surface }]} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !usage) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
            {t('equipment.usageDetail')}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[Typography.h4, { color: theme.colors.error }]}>
            {t('common.error')}
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.textSecondary, marginTop: 8 },
            ]}
          >
            {error || t('equipment.usageNotFound')}
          </Text>
          <Button
            title={t('common.retry')}
            onPress={loadUsage}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          Usage Detail
        </Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Edit2 size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={handleSave} style={{ marginRight: 12 }}>
              <Save size={20} color={theme.colors.success} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <X size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[Typography.h4, { color: theme.colors.text }]}>
            {usage.equipment?.name}
          </Text>
          <Text
            style={[
              Typography.bodySmall,
              { color: theme.colors.textSecondary },
            ]}
          >
            {new Date(usage.start_time).toLocaleString()}
          </Text>
        </View>

        {isEditing ? (
          <>
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                style={[
                  Typography.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Sets
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={editSets}
                onChangeText={setEditSets}
                keyboardType="number-pad"
              />
            </View>

            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                style={[
                  Typography.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Reps per Set
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={editReps}
                onChangeText={setEditReps}
                keyboardType="number-pad"
              />
            </View>

            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                style={[
                  Typography.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Weight (kg)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        ) : (
          <>
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                style={[
                  Typography.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Duration
              </Text>
              <Text style={[Typography.h4, { color: theme.colors.text }]}>
                {usage.duration_minutes} minutes
              </Text>
            </View>

            {usage.sets_completed && (
              <View
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <Text
                  style={[
                    Typography.label,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Sets × Reps
                </Text>
                <Text style={[Typography.h4, { color: theme.colors.text }]}>
                  {usage.sets_completed} × {usage.reps_per_set}
                </Text>
              </View>
            )}

            {usage.weight_used && (
              <View
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <Text
                  style={[
                    Typography.label,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Weight
                </Text>
                <Text style={[Typography.h4, { color: theme.colors.text }]}>
                  {usage.weight_used} kg
                </Text>
              </View>
            )}

            {usage.calories_burned && (
              <View
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <Text
                  style={[
                    Typography.label,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Calories Burned
                </Text>
                <Text style={[Typography.h4, { color: theme.colors.text }]}>
                  {usage.calories_burned} cal
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: { flex: 1, padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  input: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 100,
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  retryButton: {
    marginTop: 16,
  },
});
