import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { SkeletonCard, EmptyState } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useAnalyticsActions } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { healthService } from '@/services/member/health.service';
import { MetricType } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HealthMetricChart } from '@/components/charts/HealthMetricChart';

export default function HealthMetricDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { t, i18n } = useTranslation();
  const { showError, ToastComponent } = useToast();
  const analytics = useAnalyticsActions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});

  useEffect(() => {
    if (type) {
      analytics.trackScreenView('health_metric_detail', { metricType: type });
    }
    loadMetrics();
  }, [type, user?.id]);

  const loadMetrics = async () => {
    if (!user?.id || !type) return;

    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        type: type as MetricType,
      };

      if (dateRange.startDate) {
        filters.date_from = dateRange.startDate.toISOString().split('T')[0];
      }
      if (dateRange.endDate) {
        filters.date_to = dateRange.endDate.toISOString().split('T')[0];
      }

      const response = await healthService.getHealthMetrics(user.id, filters);

      if (response.success && response.data) {
        setMetrics(response.data);
        setError(null);
      } else {
        const errorMessage = response.error || t('health.loadError', {
          defaultValue: 'Không thể tải dữ liệu sức khỏe',
        });
        setError(errorMessage);
        analytics.trackError('load_health_metrics_failed', errorMessage);
        showError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || t('health.loadError', {
        defaultValue: 'Không thể tải dữ liệu sức khỏe',
      });
      setError(errorMessage);
      analytics.trackError('load_health_metrics_exception', errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  const getMetricTypeTranslation = (metricType: string) => {
    return t(`health.metricTypes.${metricType.toLowerCase()}`) || metricType;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
            {getMetricTypeTranslation(type || '')}
          </Text>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
            {getMetricTypeTranslation(type || '')}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <EmptyState
            title={t('common.error', { defaultValue: 'Lỗi' })}
            message={error}
            actionLabel={t('common.retry', { defaultValue: 'Thử lại' })}
            onAction={loadMetrics}
          />
        </View>
        <ToastComponent />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {getMetricTypeTranslation(type || '')}
        </Text>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setShowDateRangePicker(true)}
        >
          <Calendar size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {metrics.length > 0 ? (
          <>
            <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
              <HealthMetricChart
                data={metrics}
                type={type as MetricType}
                period="all"
                showTrend={true}
              />
            </View>

            <View style={styles.metricsList}>
              <Text style={[Typography.h4, { color: theme.colors.text, marginBottom: 16 }]}>
                {t('health.allRecords')}
              </Text>
              {metrics.map((metric, index) => (
                <TouchableOpacity
                  key={metric.id || index}
                  style={[
                    styles.metricItem,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    analytics.trackButtonClick('view_metric_detail', 'health_metric_list');
                    if (metric.id) {
                      router.push(`/health/metric/${metric.id}`);
                    }
                  }}
                >
                  <View style={styles.metricHeader}>
                    <Text style={[Typography.bodyRegular, { color: theme.colors.text }]}>
                      {new Date(metric.recorded_at || metric.created_at).toLocaleDateString(
                        i18n.language,
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </Text>
                  </View>
                  <View style={styles.metricValue}>
                    <Text style={[Typography.h3, { color: theme.colors.primary }]}>
                      {metric.value} {metric.unit || ''}
                    </Text>
                  </View>
                  {metric.notes && (
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary, marginTop: 8 },
                      ]}
                    >
                      {metric.notes}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <EmptyState
              title={t('health.noMetrics', { defaultValue: 'Chưa có dữ liệu' })}
              message={t('health.noMetricsDescription', {
                defaultValue: 'Bạn chưa có dữ liệu sức khỏe nào. Hãy thêm dữ liệu đầu tiên!',
              })}
              actionLabel={t('health.addMetric', { defaultValue: 'Thêm dữ liệu' })}
              onAction={() => {
                analytics.trackButtonClick('add_metric_from_empty', 'health_metric_detail');
                router.push('/health/add-metric');
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Date Range Picker */}
      <DateRangePicker
        visible={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onApply={(startDate, endDate) => {
          setDateRange({ startDate, endDate });
          setShowDateRangePicker(false);
          loadMetrics();
        }}
        initialStartDate={dateRange.startDate}
        initialEndDate={dateRange.endDate}
        maximumDate={new Date()}
      />

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
  filterButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
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
    padding: 32,
  },
  retryButton: {
    marginTop: 16,
  },
  chartContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  metricsList: {
    marginBottom: 24,
  },
  metricItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  metricHeader: {
    marginBottom: 8,
  },
  metricValue: {
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  addButton: {
    marginTop: 16,
  },
});

