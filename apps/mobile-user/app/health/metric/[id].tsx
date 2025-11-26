import { useAuth } from '@/contexts/AuthContext';
import { healthService } from '@/services';
import { HealthMetric } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit2, Save, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MetricDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { member } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<HealthMetric | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit states
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadMetric();
  }, [id]);

  const loadMetric = async () => {
    if (!member?.id || !id) return;

    try {
      setLoading(true);
      // Get all metrics and find the one with matching ID
      const metrics = await healthService.getHealthMetrics(member.id, {
        limit: 100,
      });

      const foundMetric = metrics.find((m) => m.id === id);
      if (foundMetric) {
        setMetric(foundMetric);
        setEditValue(foundMetric.value.toString());
        setEditNotes(foundMetric.notes || '');
      }
    } catch (error) {
      console.error('Error loading metric:', error);
      Alert.alert(t('common.error'), 'Failed to load metric details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetric();
    setRefreshing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (metric) {
      setEditValue(metric.value.toString());
      setEditNotes(metric.notes || '');
    }
  };

  const handleSave = async () => {
    if (!metric || !member?.id) return;

    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) {
      Alert.alert(t('common.error'), 'Please enter a valid number');
      return;
    }

    try {
      setLoading(true);
      const response = await healthService.updateHealthMetric(
        member.id,
        metric.id,
        {
          value: newValue,
          notes: editNotes,
        }
      );

      if (response.success) {
        Alert.alert(t('common.success'), 'Metric updated successfully');
        setIsEditing(false);
        await loadMetric();
      } else {
        Alert.alert(
          t('common.error'),
          response.message || 'Failed to update metric'
        );
      }
    } catch (error: any) {
      console.error('Error updating metric:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to update metric'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Metric',
      'Are you sure you want to delete this metric? This action cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!metric) return;

            try {
              setLoading(true);
              const response = await healthService.deleteHealthMetric(
                member.id,
                metric.id
              );

              if (response.success) {
                Alert.alert(t('common.success'), 'Metric deleted successfully');
                router.back();
              } else {
                Alert.alert(
                  t('common.error'),
                  response.message || 'Failed to delete metric'
                );
              }
            } catch (error: any) {
              console.error('Error deleting metric:', error);
              Alert.alert(
                t('common.error'),
                error.message || 'Failed to delete metric'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !metric) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary },
            ]}
          >
            Loading metric details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!metric) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            Metric Not Found
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 8 },
            ]}
          >
            This metric may have been deleted or doesn't exist.
          </Text>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.primary, marginTop: 16 },
            ]}
            onPress={() => router.back()}
          >
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textInverse },
              ]}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(i18n.language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          Metric Detail
        </Text>
        {!isEditing ? (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
              <Edit2 size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDelete}
            >
              <Trash2 size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
              <Save size={20} color={theme.colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCancelEdit}
            >
              <X size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[Typography.label, { color: theme.colors.textSecondary }]}
          >
            Type
          </Text>
          <Text
            style={[Typography.h4, { color: theme.colors.text, marginTop: 4 }]}
          >
            {metric.type.replace(/_/g, ' ')}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[Typography.label, { color: theme.colors.textSecondary }]}
          >
            Value
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              placeholder="Enter value"
              placeholderTextColor={theme.colors.textSecondary}
            />
          ) : (
            <Text
              style={[
                Typography.h2,
                { color: theme.colors.primary, marginTop: 4 },
              ]}
            >
              {metric.value} {metric.unit}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[Typography.label, { color: theme.colors.textSecondary }]}
          >
            Recorded Date
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.text, marginTop: 4 },
            ]}
          >
            {formatDate(metric.recordedAt)}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[Typography.label, { color: theme.colors.textSecondary }]}
          >
            Source
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.text, marginTop: 4 },
            ]}
          >
            {metric.source || 'Manual Entry'}
          </Text>
        </View>

        {(metric.notes || isEditing) && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[Typography.label, { color: theme.colors.textSecondary }]}
            >
              Notes
            </Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={4}
                placeholder="Add notes (optional)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text
                style={[
                  Typography.bodyRegular,
                  { color: theme.colors.text, marginTop: 4 },
                ]}
              >
                {metric.notes || 'No notes'}
              </Text>
            )}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  textArea: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
