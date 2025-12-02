import { AlertModal } from '@/components/ui/AlertModal';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, EmptyState } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useAnalyticsActions } from '@/hooks/useAnalytics';
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
  const { showSuccess, showError, ToastComponent } = useToast();
  const analytics = useAnalyticsActions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<HealthMetric | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (id) {
      analytics.trackScreenView('health_metric_detail_id', { metricId: id });
    }
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
      } else {
        const errorMessage = t('health.metricNotFound', {
          defaultValue: 'Không tìm thấy dữ liệu sức khỏe',
        });
        analytics.trackError('metric_not_found', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || t('health.loadError', {
        defaultValue: 'Không thể tải dữ liệu sức khỏe',
      });
      analytics.trackError('load_metric_exception', errorMessage);
      showError(errorMessage);
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
      showError(t('health.invalidValue', {
        defaultValue: 'Vui lòng nhập số hợp lệ',
      }));
      return;
    }

    try {
      setSaving(true);
      analytics.trackButtonClick('save_metric', 'health_metric_detail');
      
      const response = await healthService.updateHealthMetric(
        member.id,
        metric.id,
        {
          value: newValue,
          notes: editNotes,
        }
      );

      if (response.success) {
        analytics.trackFeatureUsage('update_health_metric_success');
        showSuccess(t('health.updateSuccess', {
          defaultValue: 'Cập nhật dữ liệu thành công',
        }));
        setIsEditing(false);
        await loadMetric();
      } else {
        const errorMessage = response.message || t('health.updateError', {
          defaultValue: 'Không thể cập nhật dữ liệu',
        });
        analytics.trackError('update_metric_failed', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || t('health.updateError', {
        defaultValue: 'Không thể cập nhật dữ liệu',
      });
      analytics.trackError('update_metric_exception', errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    analytics.trackButtonClick('delete_metric_confirm', 'health_metric_detail');
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!metric || !member?.id) return;

    try {
      setLoading(true);
      analytics.trackButtonClick('delete_metric', 'health_metric_detail');
      
      const response = await healthService.deleteHealthMetric(
        member.id,
        metric.id
      );

      if (response.success) {
        analytics.trackFeatureUsage('delete_health_metric_success');
        showSuccess(t('health.deleteSuccess', {
          defaultValue: 'Đã xóa dữ liệu thành công',
        }));
        router.back();
      } else {
        const errorMessage = response.message || t('health.deleteError', {
          defaultValue: 'Không thể xóa dữ liệu',
        });
        analytics.trackError('delete_metric_failed', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || t('health.deleteError', {
        defaultValue: 'Không thể xóa dữ liệu',
      });
      analytics.trackError('delete_metric_exception', errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
      setDeleteModalVisible(false);
    }
  };

  if (loading && !metric) {
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
            {t('health.metricDetail', { defaultValue: 'Chi tiết dữ liệu' })}
          </Text>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!metric) {
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
            {t('health.metricDetail', { defaultValue: 'Chi tiết dữ liệu' })}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <EmptyState
            title={t('health.metricNotFound', { defaultValue: 'Không tìm thấy dữ liệu' })}
            message={t('health.metricNotFoundDescription', {
              defaultValue: 'Dữ liệu này có thể đã bị xóa hoặc không tồn tại.',
            })}
            actionLabel={t('common.goBack', { defaultValue: 'Quay lại' })}
            onAction={() => router.back()}
          />
        </View>
        <ToastComponent />
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
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                analytics.trackButtonClick('edit_metric', 'health_metric_detail');
                handleEdit();
              }}
            >
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
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSave}
              disabled={saving}
            >
              <Save size={20} color={saving ? theme.colors.textSecondary : theme.colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCancelEdit}
              disabled={saving}
            >
              <X size={20} color={saving ? theme.colors.textSecondary : theme.colors.error} />
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

      {/* Delete Confirmation Modal */}
      <AlertModal
        visible={deleteModalVisible}
        title={t('health.deleteMetric', { defaultValue: 'Xóa dữ liệu' })}
        message={t('health.deleteConfirm', {
          defaultValue: 'Bạn có chắc chắn muốn xóa dữ liệu này? Hành động này không thể hoàn tác.',
        })}
        type="error"
        buttonText={t('common.delete', { defaultValue: 'Xóa' })}
        showCancel={true}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={confirmDelete}
      />

      {/* Toast Component */}
      <ToastComponent />
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
