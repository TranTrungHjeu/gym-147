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
import { Activity, TrendingUp } from 'lucide-react-native';
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

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'health' | 'workouts'
  >('overview');
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthTrends, setHealthTrends] = useState<HealthTrend[]>([]);

  const tabs = [
    { key: 'overview', label: t('stats.overview') },
    { key: 'health', label: t('health.title') },
    { key: 'workouts', label: t('workouts.title') },
  ];

  const loadHealthData = async () => {
    if (!user?.id) return;

    try {
      const [metrics, trends] = await Promise.all([
        healthService.getHealthMetrics(user.id, { limit: 50 }),
        healthService.getHealthTrends(user.id, 'weekly'),
      ]);

      console.log('📊 Health metrics data:', metrics);
      console.log('📊 Health trends data:', trends);

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

  // Helper function to convert SNAKE_CASE to camelCase for translation keys
  const getMetricTranslationKey = (type: string): string => {
    return type
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  const themedStyles = styles(theme);

  if (loading) {
    return (
      <View
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={themedStyles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  const renderOverview = () => {
    // Calculate unique metric types
    const uniqueMetricTypes = new Set(
      healthMetrics.map((m) => (m as any).metric_type)
    ).size;

    // Calculate total recorded metrics
    const totalMetrics = healthMetrics.length;

    // Calculate metrics this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const metricsThisWeek = healthMetrics.filter((m) => {
      const recordedDate = new Date((m as any).recorded_at);
      return recordedDate >= oneWeekAgo;
    }).length;

    return (
      <View style={themedStyles.tabContent}>
        <View style={themedStyles.overviewSection}>
          <Text
            style={[
              Typography.h3,
              { color: theme.colors.text, marginBottom: theme.spacing.lg },
            ]}
          >
            {t('stats.overview')}
          </Text>

          {/* Row 1 */}
          <View style={themedStyles.statsRow}>
            <View style={themedStyles.statCard}>
              <View
                style={[
                  themedStyles.statIconContainer,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <Activity size={24} color={theme.colors.primary} />
              </View>
              <Text
                style={[
                  Typography.h2,
                  {
                    color: theme.colors.text,
                    marginVertical: theme.spacing.xs,
                  },
                ]}
              >
                {totalMetrics}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary, textAlign: 'center' },
                ]}
              >
                {t('health.totalMetrics')}
              </Text>
            </View>
            <View style={themedStyles.statCard}>
              <View
                style={[
                  themedStyles.statIconContainer,
                  { backgroundColor: theme.colors.success + '15' },
                ]}
              >
                <TrendingUp size={24} color={theme.colors.success} />
              </View>
              <Text
                style={[
                  Typography.h2,
                  {
                    color: theme.colors.text,
                    marginVertical: theme.spacing.xs,
                  },
                ]}
              >
                {metricsThisWeek}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary, textAlign: 'center' },
                ]}
              >
                {t('health.thisWeek')}
              </Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={themedStyles.statsRow}>
            <View style={themedStyles.statCard}>
              <View
                style={[
                  themedStyles.statIconContainer,
                  { backgroundColor: theme.colors.secondary + '15' },
                ]}
              >
                <Activity size={24} color={theme.colors.secondary} />
              </View>
              <Text
                style={[
                  Typography.h2,
                  {
                    color: theme.colors.text,
                    marginVertical: theme.spacing.xs,
                  },
                ]}
              >
                {uniqueMetricTypes}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary, textAlign: 'center' },
                ]}
              >
                {t('health.metricTypes.title')}
              </Text>
            </View>
            <View style={themedStyles.statCard}>
              <View
                style={[
                  themedStyles.statIconContainer,
                  { backgroundColor: theme.colors.warning + '15' },
                ]}
              >
                <TrendingUp size={24} color={theme.colors.warning} />
              </View>
              <Text
                style={[
                  Typography.h2,
                  {
                    color: theme.colors.text,
                    marginVertical: theme.spacing.xs,
                  },
                ]}
              >
                {healthTrends.length}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary, textAlign: 'center' },
                ]}
              >
                {t('health.trends.title')}
              </Text>
            </View>
          </View>
        </View>

        <View style={themedStyles.section}>
          <Text
            style={[
              Typography.h3,
              { color: theme.colors.text, marginBottom: theme.spacing.lg },
            ]}
          >
            {t('health.recentMetrics')}
          </Text>
          {healthMetrics.slice(0, 3).map((metric) => (
            <View key={metric.id} style={themedStyles.metricItem}>
              <View style={themedStyles.metricInfo}>
                <Text
                  style={[Typography.bodyRegular, { color: theme.colors.text }]}
                >
                  {(metric as any).metric_type
                    ? t(
                        `health.metricTypes.${getMetricTranslationKey(
                          (metric as any).metric_type
                        )}`
                      )
                    : t('common.unknown')}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {(metric as any).recorded_at
                    ? new Date((metric as any).recorded_at).toLocaleDateString(
                        i18n.language
                      )
                    : t('common.unknownDate')}
                </Text>
              </View>
              <Text style={[Typography.h5, { color: theme.colors.primary }]}>
                {metric.value != null
                  ? `${metric.value.toFixed(1)} ${metric.unit || ''}`
                  : t('common.notAvailable')}
              </Text>
            </View>
          ))}
          <Button
            title={t('common.viewAll')}
            onPress={() => setSelectedTab('health')}
            variant="outline"
            style={themedStyles.viewAllButton}
          />
        </View>
      </View>
    );
  };

  const renderHealth = () => {
    const weightMetrics = healthMetrics.filter(
      (m) => (m as any).metric_type === 'WEIGHT'
    );
    const bodyFatMetrics = healthMetrics.filter(
      (m) => (m as any).metric_type === 'BODY_FAT'
    );
    const heartRateMetrics = healthMetrics.filter(
      (m) => (m as any).metric_type === 'HEART_RATE'
    );

    // Filter out trends that are already shown in charts section
    const mainMetricTypes = ['WEIGHT', 'BODY_FAT', 'HEART_RATE'];
    const otherTrends = healthTrends.filter(
      (trend) => !mainMetricTypes.includes((trend as any).metric_type)
    );

    return (
      <View style={themedStyles.tabContent}>
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              {t('health.metrics')}
            </Text>
            <Button
              title={t('health.addMetric')}
              onPress={handleAddMetric}
              size="small"
            />
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
            <View style={themedStyles.emptyContainer}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {t('health.trends.noData')}
              </Text>
              <Text
                style={[
                  Typography.bodyLarge,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('health.trends.loadingTrends')}
              </Text>
              <Button
                title={t('health.addMetric')}
                onPress={handleAddMetric}
                style={themedStyles.emptyButton}
              />
            </View>
          )}
        </View>

        {otherTrends.length > 0 && (
          <View style={themedStyles.section}>
            <View style={themedStyles.sectionHeader}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {t('health.trends.title')}
              </Text>
              <Button
                title={t('common.view')}
                onPress={handleViewTrends}
                variant="outline"
                size="small"
              />
            </View>

            {otherTrends.map((trend, index) => (
              <View
                key={(trend as any).metric_type || index}
                style={[
                  themedStyles.trendItem,
                  { borderColor: theme.colors.border },
                ]}
              >
                <View style={themedStyles.trendInfo}>
                  <Text
                    style={[
                      Typography.bodyRegular,
                      { color: theme.colors.text },
                    ]}
                  >
                    {(trend as any).metric_type
                      ? t(
                          `health.metricTypes.${getMetricTranslationKey(
                            (trend as any).metric_type
                          )}`
                        )
                      : t('common.unknown')}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {(trend as any).recorded_at
                      ? new Date((trend as any).recorded_at).toLocaleDateString(
                          i18n.language
                        )
                      : t('common.recent')}
                  </Text>
                </View>
                <View style={themedStyles.trendValue}>
                  <Text
                    style={[Typography.h5, { color: theme.colors.secondary }]}
                  >
                    {(trend as any).value != null
                      ? `${(trend as any).value.toFixed(1)} ${
                          (trend as any).unit || ''
                        }`
                      : t('common.notAvailable')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderWorkouts = () => (
    <View style={themedStyles.tabContent}>
      <View style={themedStyles.section}>
        <Text style={[Typography.h3, { color: theme.colors.text }]}>
          {t('stats.title')}
        </Text>
        <WorkoutFrequencyChart />
        <CaloriesChart />
        <ProgressChart />
      </View>
    </View>
  );

  return (
    <View
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={themedStyles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          {t('stats.title')}
        </Text>
        <View style={themedStyles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                themedStyles.tab,
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
        style={themedStyles.scrollView}
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

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    tabContainer: {
      flexDirection: 'row',
      marginTop: theme.spacing.lg,
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.05)',
      borderRadius: theme.radius.md,
      padding: theme.spacing.xs,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    tabContent: {
      padding: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    overviewSection: {
      marginBottom: theme.spacing.xxl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    statCard: {
      flex: 1,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    statIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.round,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    metricItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    metricInfo: {
      flex: 1,
    },
    viewAllButton: {
      marginTop: theme.spacing.sm,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: theme.spacing.xxl,
    },
    emptyButton: {
      marginTop: theme.spacing.lg,
    },
    trendItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    trendInfo: {
      flex: 1,
    },
    trendValue: {
      alignItems: 'flex-end',
    },
  });
