import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { healthService } from '@/services/member/health.service';
import { MetricType } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HealthMetricChart } from '@/components/health/HealthMetricChart';

export default function HealthMetricDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [type, user?.id]);

  const loadMetrics = async () => {
    if (!user?.id || !type) return;

    try {
      setLoading(true);
      setError(null);

      const response = await healthService.getHealthMetrics(user.id, {
        type: type as MetricType,
      });

      if (response.success && response.data) {
        setMetrics(response.data);
      } else {
        setError('Failed to load metrics');
      }
    } catch (err: any) {
      console.error('Error loading health metrics:', err);
      setError(err.message || 'Failed to load metrics');
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
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
          <Text style={[Typography.h4, { color: theme.colors.error }]}>
            {t('common.error')}
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.textSecondary, marginTop: 8 },
            ]}
          >
            {error}
          </Text>
          <Button
            title={t('common.retry')}
            onPress={loadMetrics}
            style={styles.retryButton}
          />
        </View>
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
                    // Navigate to individual metric detail if needed
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
            <Text style={[Typography.h4, { color: theme.colors.text }]}>
              {t('health.noMetrics')}
            </Text>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
              ]}
            >
              {t('health.noMetricsDescription')}
            </Text>
            <Button
              title={t('health.addMetric')}
              onPress={() => router.push('/health/add-metric')}
              style={styles.addButton}
            />
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

