import { HealthMetricChart } from '@/components/charts/HealthMetricChart';
import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { healthService } from '@/services/member/health.service';
import {
  MetricType,
  type HealthMetric,
  type HealthTrend,
} from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HealthTrendsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('weekly');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(
    MetricType.WEIGHT
  );
  const [trends, setTrends] = useState<HealthTrend[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  const metricTypes = [
    { value: MetricType.WEIGHT, label: 'Weight' },
    { value: MetricType.BODY_FAT, label: 'Body Fat' },
    { value: MetricType.MUSCLE_MASS, label: 'Muscle Mass' },
    { value: MetricType.BMI, label: 'BMI' },
    { value: MetricType.HEART_RATE, label: 'Heart Rate' },
    { value: MetricType.BLOOD_PRESSURE, label: 'Blood Pressure' },
    { value: MetricType.BODY_TEMPERATURE, label: 'Body Temperature' },
    { value: MetricType.SLEEP_HOURS, label: 'Sleep Hours' },
    { value: MetricType.WATER_INTAKE, label: 'Water Intake' },
    { value: MetricType.STEPS, label: 'Steps' },
    { value: MetricType.CALORIES_BURNED, label: 'Calories Burned' },
    { value: MetricType.CALORIES_CONSUMED, label: 'Calories Consumed' },
  ];

  const periods = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const loadTrends = async () => {
    if (!member?.id) return;

    try {
      const [trendsData, metricsData] = await Promise.all([
        healthService.getHealthTrends(member.id, period),
        healthService.getHealthMetrics(member.id, {
          type: selectedMetric,
          limit: 30,
        }),
      ]);

      setTrends(trendsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading health trends:', error);
      Alert.alert(t('common.error'), t('health.trends.failedToLoad'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrends();
    setRefreshing(false);
  };

  const handleMetricSelect = (metric: HealthMetric) => {
    // TODO: Navigate to metric detail
    Alert.alert(
      t('health.trends.metricDetail'),
      t('health.trends.metricDetailNotImplemented')
    );
  };

  const handleAddMetric = () => {
    router.push('/health/add-metric');
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  const handleMetricTypeChange = (newMetric: MetricType) => {
    setSelectedMetric(newMetric);
  };

  useEffect(() => {
    loadTrends();
  }, [member?.id, period, selectedMetric]);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[Typography.body, { color: theme.colors.textSecondary }]}
          >
            Loading health trends...
          </Text>
        </View>
      </View>
    );
  }

  const selectedTrend = trends.find((trend) => trend.type === selectedMetric);
  const selectedMetrics = metrics.filter(
    (metric) => metric.type === selectedMetric
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Health Trends
        </Text>
        <Button title="Add Metric" onPress={handleAddMetric} size="small" />
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={[Typography.label, { color: theme.colors.text }]}>
            Metric Type
          </Text>
          <Picker
            selectedValue={selectedMetric}
            onValueChange={handleMetricTypeChange}
            items={metricTypes.map((type) => ({
              label: type.label,
              value: type.value,
            }))}
          />
        </View>

        <View style={styles.filterGroup}>
          <Text style={[Typography.label, { color: theme.colors.text }]}>
            Period
          </Text>
          <Picker
            selectedValue={period}
            onValueChange={handlePeriodChange}
            items={periods}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedMetrics.length > 0 ? (
          <View style={styles.chartContainer}>
            <HealthMetricChart
              data={selectedMetrics}
              type={selectedMetric}
              period={period}
              showTrend={true}
              showGoal={false}
            />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              No Data Available
            </Text>
            <Text
              style={[Typography.body, { color: theme.colors.textSecondary }]}
            >
              Start recording your health metrics to see trends
            </Text>
            <Button
              title="Add First Metric"
              onPress={handleAddMetric}
              style={styles.emptyButton}
            />
          </View>
        )}

        {selectedTrend && (
          <View style={styles.trendContainer}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Trend Analysis
            </Text>
            <View style={styles.trendItem}>
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Current Value: {selectedTrend.currentValue.toFixed(1)}
              </Text>
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Previous Value: {selectedTrend.previousValue.toFixed(1)}
              </Text>
              <Text
                style={[
                  Typography.body,
                  {
                    color:
                      selectedTrend.direction === 'UP'
                        ? theme.colors.success
                        : selectedTrend.direction === 'DOWN'
                        ? theme.colors.error
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                Change: {selectedTrend.change > 0 ? '+' : ''}
                {selectedTrend.change.toFixed(1)}(
                {selectedTrend.changePercentage > 0 ? '+' : ''}
                {selectedTrend.changePercentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        )}

        {selectedMetrics.length > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Recent Measurements
            </Text>
            {selectedMetrics.slice(0, 5).map((metric, index) => (
              <TouchableOpacity
                key={metric.id}
                style={[
                  styles.metricItem,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => handleMetricSelect(metric)}
              >
                <View style={styles.metricInfo}>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    {metric.value.toFixed(1)} {metric.unit}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {new Date(metric.recordedAt).toLocaleDateString(
                      i18n.language
                    )}
                  </Text>
                </View>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {metric.source}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  filterGroup: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  chartContainer: {
    margin: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyButton: {
    marginTop: 16,
  },
  trendContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  trendItem: {
    marginTop: 8,
  },
  metricsContainer: {
    margin: 16,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  metricInfo: {
    flex: 1,
  },
});
