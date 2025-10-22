import CaloriesChart from '@/components/charts/CaloriesChart';
import { HealthMetricChart } from '@/components/charts/HealthMetricChart';
import ProgressChart from '@/components/charts/ProgressChart';
import WorkoutFrequencyChart from '@/components/charts/WorkoutFrequencyChart';
import { Button } from '@/components/ui/Button';
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
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'health' | 'workouts'
  >('overview');
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthTrends, setHealthTrends] = useState<HealthTrend[]>([]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'health', label: 'Health' },
    { key: 'workouts', label: 'Workouts' },
  ];

  const loadHealthData = async () => {
    if (!user?.id) return;

    try {
      const [metrics, trends] = await Promise.all([
        healthService.getHealthMetrics(user.id, { limit: 50 }),
        healthService.getHealthTrends(user.id, 'weekly'),
      ]);

      setHealthMetrics(metrics);
      setHealthTrends(trends);
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    setRefreshing(false);
  };

  const handleAddMetric = () => {
    router.push('/health/add-metric');
  };

  const handleViewTrends = () => {
    router.push('/health/trends');
  };

  useEffect(() => {
    loadHealthData();
    setLoading(false);
  }, [user?.id]);

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            Loading statistics...
          </Text>
        </View>
      </View>
    );
  }

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[Typography.h3, { color: theme.colors.text }]}>
          Quick Stats
        </Text>
        <View style={styles.statsGrid}>
          <View
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[Typography.h2, { color: theme.colors.primary }]}>
              {healthMetrics.length}
            </Text>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Health Records
            </Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[Typography.h2, { color: theme.colors.success }]}>
              {healthTrends.filter((trend) => trend.direction === 'UP').length}
            </Text>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Improving
            </Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[Typography.h2, { color: theme.colors.error }]}>
              {
                healthTrends.filter((trend) => trend.direction === 'DOWN')
                  .length
              }
            </Text>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Declining
            </Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
          >
            <Text
              style={[Typography.h2, { color: theme.colors.textSecondary }]}
            >
              {
                healthTrends.filter((trend) => trend.direction === 'STABLE')
                  .length
              }
            </Text>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Stable
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[Typography.h3, { color: theme.colors.text }]}>
          Recent Health Metrics
        </Text>
        {healthMetrics.slice(0, 3).map((metric) => (
          <View
            key={metric.id}
            style={[styles.metricItem, { borderColor: theme.colors.border }]}
          >
            <View style={styles.metricInfo}>
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                {metric.type.replace('_', ' ')}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {new Date(metric.recordedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              {metric.value.toFixed(1)} {metric.unit}
            </Text>
          </View>
        ))}
        <Button
          title="View All Metrics"
          onPress={() => setSelectedTab('health')}
          variant="outline"
          style={styles.viewAllButton}
        />
      </View>
    </View>
  );

  const renderHealth = () => {
    const weightMetrics = healthMetrics.filter(
      (m) => m.type === MetricType.WEIGHT
    );
    const bodyFatMetrics = healthMetrics.filter(
      (m) => m.type === MetricType.BODY_FAT
    );
    const heartRateMetrics = healthMetrics.filter(
      (m) => m.type === MetricType.HEART_RATE
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Health Metrics
            </Text>
            <Button title="Add Metric" onPress={handleAddMetric} size="small" />
          </View>

          {weightMetrics.length > 0 && (
            <HealthMetricChart
              data={weightMetrics}
              type={MetricType.WEIGHT}
              period="weekly"
              showTrend={true}
            />
          )}

          {bodyFatMetrics.length > 0 && (
            <HealthMetricChart
              data={bodyFatMetrics}
              type={MetricType.BODY_FAT}
              period="weekly"
              showTrend={true}
            />
          )}

          {heartRateMetrics.length > 0 && (
            <HealthMetricChart
              data={heartRateMetrics}
              type={MetricType.HEART_RATE}
              period="weekly"
              showTrend={true}
            />
          )}

          {healthMetrics.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                No Health Data
              </Text>
              <Text
                style={[
                  Typography.bodyLarge,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Start tracking your health metrics to see detailed analytics
              </Text>
              <Button
                title="Add First Metric"
                onPress={handleAddMetric}
                style={styles.emptyButton}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Health Trends
            </Text>
            <Button
              title="View Trends"
              onPress={handleViewTrends}
              variant="outline"
              size="small"
            />
          </View>

          {healthTrends.map((trend) => (
            <View
              key={trend.type}
              style={[styles.trendItem, { borderColor: theme.colors.border }]}
            >
              <View style={styles.trendInfo}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  {trend.type.replace('_', ' ')}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {trend.period} trend
                </Text>
              </View>
              <View style={styles.trendValue}>
                <Text
                  style={[
                    Typography.body,
                    {
                      color:
                        trend.direction === 'UP'
                          ? theme.colors.success
                          : trend.direction === 'DOWN'
                          ? theme.colors.error
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {trend.direction === 'UP'
                    ? '↗'
                    : trend.direction === 'DOWN'
                    ? '↘'
                    : '→'}
                  {Math.abs(trend.changePercentage).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWorkouts = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[Typography.h3, { color: theme.colors.text }]}>
          Workout Statistics
        </Text>
        <WorkoutFrequencyChart />
        <CaloriesChart />
        <ProgressChart />
      </View>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Statistics
        </Text>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Text
                style={[
                  Typography.caption,
                  {
                    color:
                      selectedTab === tab.key
                        ? theme.colors.surface
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'health' && renderHealth()}
        {selectedTab === 'workouts' && renderWorkouts()}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  viewAllButton: {
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyButton: {
    marginTop: 16,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  trendInfo: {
    flex: 1,
  },
  trendValue: {
    alignItems: 'flex-end',
  },
});
