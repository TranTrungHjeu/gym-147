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
import { ArrowLeft, Edit2, Save, Trash2, X, TrendingUp, TrendingDown, Minus, BarChart3, ArrowRight } from 'lucide-react-native';
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
  
  // Statistics and comparisons
  const [allMetrics, setAllMetrics] = useState<HealthMetric[]>([]);
  const [statistics, setStatistics] = useState<{
    min: number;
    max: number;
    average: number;
    count: number;
  } | null>(null);
  const [previousMetric, setPreviousMetric] = useState<HealthMetric | null>(null);
  const [nextMetric, setNextMetric] = useState<HealthMetric | null>(null);

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
        limit: 500, // Get more metrics for statistics
      });

      const foundMetric = metrics.find((m) => m.id === id);
      if (foundMetric) {
        setMetric(foundMetric);
        setEditValue(foundMetric.value.toString());
        setEditNotes(foundMetric.notes || '');
        
        // Calculate statistics for same metric type
        const sameTypeMetrics = metrics.filter(
          (m) => m.type === foundMetric.type
        );
        setAllMetrics(sameTypeMetrics);
        
        // Calculate statistics
        if (sameTypeMetrics.length > 0) {
          const values = sameTypeMetrics.map((m) => m.value);
          const stats = {
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            count: values.length,
          };
          setStatistics(stats);
          
          // Find previous and next metrics
          const sortedMetrics = [...sameTypeMetrics].sort(
            (a, b) =>
              new Date(a.recordedAt || (a as any).recorded_at).getTime() -
              new Date(b.recordedAt || (b as any).recorded_at).getTime()
          );
          
          const currentIndex = sortedMetrics.findIndex((m) => m.id === id);
          if (currentIndex > 0) {
            setPreviousMetric(sortedMetrics[currentIndex - 1]);
          }
          if (currentIndex < sortedMetrics.length - 1) {
            setNextMetric(sortedMetrics[currentIndex + 1]);
          }
        }
      } else {
        const errorMessage = t('health.metricNotFound', {
          defaultValue: 'Không tìm thấy dữ liệu sức khỏe',
        });
        analytics.trackError('metric_not_found', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        t('health.loadError', {
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
      showError(
        t('health.invalidValue', {
          defaultValue: 'Vui lòng nhập số hợp lệ',
        })
      );
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
        showSuccess(
          t('health.updateSuccess', {
            defaultValue: 'Cập nhật dữ liệu thành công',
          })
        );
        setIsEditing(false);
        await loadMetric();
      } else {
        const errorMessage =
          response.message ||
          t('health.updateError', {
            defaultValue: 'Không thể cập nhật dữ liệu',
          });
        analytics.trackError('update_metric_failed', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        t('health.updateError', {
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
        showSuccess(
          t('health.deleteSuccess', {
            defaultValue: 'Đã xóa dữ liệu thành công',
          })
        );
        router.back();
      } else {
        const errorMessage =
          response.message ||
          t('health.deleteError', {
            defaultValue: 'Không thể xóa dữ liệu',
          });
        analytics.trackError('delete_metric_failed', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        t('health.deleteError', {
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
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.loadingContainer}
        >
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
            title={t('health.metricNotFound', {
              defaultValue: 'Không tìm thấy dữ liệu',
            })}
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

  const getMetricTypeTranslation = (type: string) => {
    const key = type.toLowerCase().replace(/_/g, '');
    return t(`health.metricTypes.${key}`, { defaultValue: type.replace(/_/g, ' ') });
  };

  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    const change = current - previous;
    const changePercentage = (change / previous) * 100;
    return { change, changePercentage };
  };

  const getChangeColor = (change: number | null) => {
    if (change === null) return theme.colors.textSecondary;
    if (change > 0) return theme.colors.success;
    if (change < 0) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  const getChangeIcon = (change: number | null) => {
    if (change === null) return null;
    if (change > 0) return <TrendingUp size={16} color={theme.colors.success} />;
    if (change < 0) return <TrendingDown size={16} color={theme.colors.error} />;
    return <Minus size={16} color={theme.colors.textSecondary} />;
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
          {metric ? getMetricTypeTranslation(metric.type) : t('health.metricDetail', { defaultValue: 'Chi tiết dữ liệu' })}
        </Text>
        {!isEditing ? (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                analytics.trackButtonClick(
                  'edit_metric',
                  'health_metric_detail'
                );
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
              <Save
                size={20}
                color={
                  saving ? theme.colors.textSecondary : theme.colors.success
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCancelEdit}
              disabled={saving}
            >
              <X
                size={20}
                color={saving ? theme.colors.textSecondary : theme.colors.error}
              />
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
        {/* Main Value Card */}
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: theme.colors.primary + '10',
              borderColor: theme.colors.primary + '30',
            },
          ]}
        >
          <Text
            style={[Typography.label, { color: theme.colors.textSecondary }]}
          >
            {getMetricTypeTranslation(metric.type)}
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.mainInput,
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
                Typography.h1,
                { color: theme.colors.primary, marginTop: 8 },
              ]}
            >
              {metric.value.toFixed(metric.type === 'BLOOD_PRESSURE' ? 0 : 1)} {metric.unit}
            </Text>
          )}
          <Text
            style={[
              Typography.caption,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            {formatDate(metric.recordedAt || (metric as any).recorded_at)}
          </Text>
        </View>

        {/* Comparison with Previous Metric */}
        {previousMetric && (() => {
          const change = calculateChange(metric.value, previousMetric.value);
          return change ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.comparisonHeader}>
                <Text
                  style={[Typography.label, { color: theme.colors.textSecondary }]}
                >
                  {t('health.comparison.previous', { defaultValue: 'So với lần trước' })}
                </Text>
                <View style={styles.changeIndicator}>
                  {getChangeIcon(change.change)}
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: getChangeColor(change.change), marginLeft: 4 },
                    ]}
                  >
                    {change.change > 0 ? '+' : ''}
                    {change.change.toFixed(metric.type === 'BLOOD_PRESSURE' ? 0 : 1)} {metric.unit}
                    {' '}({change.changePercentage > 0 ? '+' : ''}
                    {change.changePercentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.colors.textSecondary, marginTop: 4 },
                ]}
              >
                {t('health.comparison.previousValue', { defaultValue: 'Giá trị trước' })}:{' '}
                {previousMetric.value.toFixed(metric.type === 'BLOOD_PRESSURE' ? 0 : 1)} {previousMetric.unit}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary, marginTop: 2 },
                ]}
              >
                {formatDate(previousMetric.recordedAt || (previousMetric as any).recorded_at)}
              </Text>
            </View>
          ) : null;
        })()}

        {/* Statistics Card */}
        {statistics && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.statisticsHeader}>
              <BarChart3 size={20} color={theme.colors.primary} />
              <Text
                style={[Typography.h4, { color: theme.colors.text, marginLeft: 8 }]}
              >
                {t('health.statistics.title', { defaultValue: 'Thống kê' })}
              </Text>
            </View>
            <View style={styles.statisticsGrid}>
              <View style={styles.statItem}>
                <Text
                  style={[
                    Typography.labelSmall,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('health.statistics.min', { defaultValue: 'Thấp nhất' })}
                </Text>
                <Text
                  style={[
                    Typography.h5,
                    { color: theme.colors.text, marginTop: 4 },
                  ]}
                >
                  {statistics.min.toFixed(metric.type === 'BLOOD_PRESSURE' ? 0 : 1)} {metric.unit}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    Typography.labelSmall,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('health.statistics.max', { defaultValue: 'Cao nhất' })}
                </Text>
                <Text
                  style={[
                    Typography.h5,
                    { color: theme.colors.text, marginTop: 4 },
                  ]}
                >
                  {statistics.max.toFixed(metric.type === 'BLOOD_PRESSURE' ? 0 : 1)} {metric.unit}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    Typography.labelSmall,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('health.average', { defaultValue: 'Trung bình' })}
                </Text>
                <Text
                  style={[
                    Typography.h5,
                    { color: theme.colors.primary, marginTop: 4 },
                  ]}
                >
                  {statistics.average.toFixed(metric.type === 'BLOOD_PRESSURE' ? 0 : 1)} {metric.unit}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    Typography.labelSmall,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('health.records', { defaultValue: 'Tổng bản ghi' })}
                </Text>
                <Text
                  style={[
                    Typography.h5,
                    { color: theme.colors.text, marginTop: 4 },
                  ]}
                >
                  {statistics.count}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => {
                analytics.trackButtonClick('view_all_metrics', 'health_metric_detail');
                router.push(`/health/metric/${metric.type}`);
              }}
            >
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.primary }]}
              >
                {t('health.viewAllRecords', { defaultValue: 'Xem tất cả bản ghi' })}
              </Text>
              <ArrowRight size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Basic Info Card */}
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
            {t('health.form.dateTime', { defaultValue: 'Ngày & Giờ' })}
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.text, marginTop: 4 },
            ]}
          >
            {formatDate(metric.recordedAt || (metric as any).recorded_at)}
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
            {metric.source === 'manual'
              ? t('health.form.sourceManual', { defaultValue: 'Nhập thủ công' })
              : metric.source === 'device'
              ? t('health.form.sourceDevice', {
                  defaultValue: 'Đồng bộ thiết bị',
                })
              : metric.source === 'app'
              ? t('health.form.sourceApp', {
                  defaultValue: 'Nhập từ ứng dụng',
                })
              : metric.source ||
                t('health.form.sourceManual', {
                  defaultValue: 'Nhập thủ công',
                })}
          </Text>
        </View>

        {/* Navigation to Previous/Next */}
        {(previousMetric || nextMetric) && (
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
              style={[Typography.label, { color: theme.colors.textSecondary, marginBottom: 8 }]}
            >
              {t('health.navigation', { defaultValue: 'Điều hướng' })}
            </Text>
            <View style={styles.navigationButtons}>
              {previousMetric && (
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    { backgroundColor: theme.colors.background },
                  ]}
                  onPress={() => {
                    analytics.trackButtonClick('navigate_previous_metric', 'health_metric_detail');
                    router.replace(`/health/metric/${previousMetric.id}`);
                  }}
                >
                  <ArrowLeft size={16} color={theme.colors.primary} />
                  <Text
                    style={[Typography.bodySmall, { color: theme.colors.primary, marginLeft: 4 }]}
                  >
                    {t('common.previous', { defaultValue: 'Trước' })}
                  </Text>
                </TouchableOpacity>
              )}
              {nextMetric && (
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    { backgroundColor: theme.colors.background },
                  ]}
                  onPress={() => {
                    analytics.trackButtonClick('navigate_next_metric', 'health_metric_detail');
                    router.replace(`/health/metric/${nextMetric.id}`);
                  }}
                >
                  <Text
                    style={[Typography.bodySmall, { color: theme.colors.primary, marginRight: 4 }]}
                  >
                    {t('common.next', { defaultValue: 'Sau' })}
                  </Text>
                  <ArrowRight size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

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
              {t('health.form.notes', { defaultValue: 'Ghi chú' })}
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
                placeholder={t('health.form.notesPlaceholder', { defaultValue: 'Thêm ghi chú (tùy chọn)' })}
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text
                style={[
                  Typography.bodyRegular,
                  { color: theme.colors.text, marginTop: 4 },
                ]}
              >
                {metric.notes || t('health.form.noNotes', { defaultValue: 'Không có ghi chú' })}
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
          defaultValue:
            'Bạn có chắc chắn muốn xóa dữ liệu này? Hành động này không thể hoàn tác.',
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
  mainCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'center',
  },
  mainInput: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statisticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
});
