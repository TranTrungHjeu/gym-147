import type { HealthMetricChartProps } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export const HealthMetricChart: React.FC<HealthMetricChartProps> = ({
  data,
  type,
  period,
  showTrend = true,
  showGoal = false,
  goalValue,
}) => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const themedStyles = styles(theme);

  if (!data || data.length === 0) {
    return (
      <View style={themedStyles.container}>
        <Text
          style={[Typography.bodyLarge, { color: theme.colors.textSecondary }]}
        >
          {t('health.trends.noData')}
        </Text>
      </View>
    );
  }

  // Validate data format
  const validData = data.filter(
    (metric) =>
      metric &&
      typeof metric.value === 'number' &&
      !isNaN(metric.value) &&
      (metric.recordedAt || (metric as any).recorded_at)
  );

  if (validData.length === 0) {
    return (
      <View
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          style={[Typography.bodyLarge, { color: theme.colors.textSecondary }]}
        >
          {t('health.trends.noData')}
        </Text>
      </View>
    );
  }

  // Sort data by date
  const sortedData = [...validData].sort(
    (a, b) =>
      new Date(a.recordedAt || (a as any).recorded_at).getTime() -
      new Date(b.recordedAt || (b as any).recorded_at).getTime()
  );

  // Prepare chart data with validation
  const chartData = {
    labels: sortedData.map((metric, index) => {
      try {
        const date = new Date(metric.recordedAt || (metric as any).recorded_at);
        if (isNaN(date.getTime())) {
          return `Point ${index + 1}`;
        }
        if (period === 'daily') {
          return date.toLocaleDateString(i18n.language, {
            month: 'short',
            day: 'numeric',
          });
        } else if (period === 'weekly') {
          return date.toLocaleDateString(i18n.language, {
            month: 'short',
            day: 'numeric',
          });
        } else {
          return date.toLocaleDateString(i18n.language, { month: 'short' });
        }
      } catch (error) {
        return `Point ${index + 1}`;
      }
    }),
    datasets: [
      {
        data: sortedData.map((metric) => {
          try {
            const value = metric.value;
            if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
              return value;
            }
            return 0;
          } catch (error) {
            return 0;
          }
        }),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green color
        strokeWidth: 2,
      },
    ],
  };

  // Debug chart data structure
  console.log('📊 Chart data structure debug:', {
    labels: chartData.labels,
    datasets: chartData.datasets,
    datasetsLength: chartData.datasets.length,
    firstDataset: chartData.datasets[0],
    firstDatasetData: chartData.datasets[0]?.data,
    firstDatasetDataLength: chartData.datasets[0]?.data?.length,
  });

  // Validate chart data before rendering
  const isValidChartData =
    chartData.datasets[0].data.length > 0 &&
    chartData.datasets[0].data.every(
      (value) => typeof value === 'number' && !isNaN(value) && isFinite(value)
    ) &&
    chartData.labels.length > 0 &&
    chartData.labels.length === chartData.datasets[0].data.length;

  // Debug logging
  console.log('📊 Chart data validation:', {
    dataLength: chartData.datasets[0].data.length,
    labelsLength: chartData.labels.length,
    isValidChartData,
    sampleData: chartData.datasets[0].data.slice(0, 3),
    sampleLabels: chartData.labels.slice(0, 3),
  });

  // Calculate trend
  const calculateTrend = () => {
    if (sortedData.length < 2) return null;

    const firstValue = sortedData[0].value;
    const lastValue = sortedData[sortedData.length - 1].value;
    const change = lastValue - firstValue;
    const changePercentage = (change / firstValue) * 100;

    return {
      change,
      changePercentage,
      direction: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'STABLE',
    };
  };

  const trend = calculateTrend();

  const getMetricDisplayName = (metricType: string) => {
    const names: Record<string, string> = {
      WEIGHT: t('health.metricTypes.weight'),
      BODY_FAT: t('health.metricTypes.bodyFat'),
      MUSCLE_MASS: t('health.metricTypes.muscleMass'),
      BMI: t('health.metricTypes.bmi'),
      HEART_RATE: t('health.metricTypes.heartRate'),
      BLOOD_PRESSURE: t('health.metricTypes.bloodPressure'),
      BODY_TEMPERATURE: t('health.metricTypes.bodyTemperature'),
      SLEEP_HOURS: t('health.metricTypes.sleepHours'),
      WATER_INTAKE: t('health.metricTypes.waterIntake'),
      STEPS: t('health.metricTypes.steps'),
      CALORIES_BURNED: t('health.metricTypes.caloriesBurned'),
      CALORIES_CONSUMED: t('health.metricTypes.caloriesConsumed'),
    };
    return names[metricType] || metricType;
  };

  const getMetricUnit = (metricType: string) => {
    const units: Record<string, string> = {
      WEIGHT: t('health.units.kg'),
      BODY_FAT: t('health.units.percent'),
      MUSCLE_MASS: t('health.units.kg'),
      BMI: '',
      HEART_RATE: t('health.units.bpm'),
      BLOOD_PRESSURE: t('health.units.mmHg'),
      BODY_TEMPERATURE: '°C',
      SLEEP_HOURS: 'h',
      WATER_INTAKE: 'L',
      STEPS: 'steps',
      CALORIES_BURNED: 'cal',
      CALORIES_CONSUMED: 'cal',
    };
    return units[metricType] || '';
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: theme.colors.border,
    },
  };

  return (
    <View
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={themedStyles.header}>
        <Text style={[Typography.h4, { color: theme.colors.text }]}>
          {getMetricDisplayName(type)}
        </Text>
        {showTrend && trend && (
          <View
            style={[
              themedStyles.trendBadge,
              {
                backgroundColor:
                  trend.direction === 'UP'
                    ? theme.colors.success + '15'
                    : trend.direction === 'DOWN'
                    ? theme.colors.error + '15'
                    : theme.colors.textSecondary + '15',
              },
            ]}
          >
            <Text
              style={[
                Typography.labelSmall,
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
                ? '↗ '
                : trend.direction === 'DOWN'
                ? '↘ '
                : '→ '}
              {Math.abs(trend.changePercentage).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {!isValidChartData ? (
        <View style={themedStyles.errorContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('health.trends.noData')}
          </Text>
        </View>
      ) : (
        <View style={themedStyles.chartWrapper}>
          {/* Data visualization */}
          <View style={themedStyles.dataContainer}>
            {sortedData.slice(-5).map((metric, index, array) => {
              const date = new Date(
                metric.recordedAt || (metric as any).recorded_at
              );
              const isLastItem = index === array.length - 1;
              return (
                <View
                  key={metric.id || index}
                  style={[
                    themedStyles.dataRow,
                    isLastItem && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text
                    style={[
                      Typography.labelSmall,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {isNaN(date.getTime())
                      ? `Point ${index + 1}`
                      : date.toLocaleDateString(i18n.language, {
                          month: 'short',
                          day: 'numeric',
                        })}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: theme.colors.text },
                    ]}
                  >
                    {metric.value.toFixed(1)} {metric.unit}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Trend indicator */}
          {trend && (
            <View
              style={[
                themedStyles.trendIndicator,
                {
                  backgroundColor:
                    trend.direction === 'UP'
                      ? theme.colors.success + '10'
                      : trend.direction === 'DOWN'
                      ? theme.colors.error + '10'
                      : theme.colors.textSecondary + '10',
                  borderLeftWidth: 3,
                  borderLeftColor:
                    trend.direction === 'UP'
                      ? theme.colors.success
                      : trend.direction === 'DOWN'
                      ? theme.colors.error
                      : theme.colors.textSecondary,
                },
              ]}
            >
              <Text
                style={[
                  Typography.labelSmall,
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
                  ? '↗ '
                  : trend.direction === 'DOWN'
                  ? '↘ '
                  : '→ '}
                {Math.abs(trend.changePercentage).toFixed(1)}%{' '}
                {t('health.change')}
              </Text>
            </View>
          )}
        </View>
      )}

      {showGoal && goalValue && (
        <View style={themedStyles.goalContainer}>
          <Text
            style={[Typography.labelSmall, { color: theme.colors.success }]}
          >
            🎯 {t('health.goal')}: {goalValue} {getMetricUnit(type)}
          </Text>
        </View>
      )}

      <View style={themedStyles.statsContainer}>
        <View style={themedStyles.statItem}>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('health.current')}
          </Text>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.primary, marginTop: theme.spacing.xs },
            ]}
          >
            {sortedData[sortedData.length - 1]?.value.toFixed(1)}
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {getMetricUnit(type)}
          </Text>
        </View>

        <View style={themedStyles.statDivider} />

        <View style={themedStyles.statItem}>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('health.average')}
          </Text>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginTop: theme.spacing.xs },
            ]}
          >
            {(
              sortedData.reduce((sum, metric) => sum + metric.value, 0) /
              sortedData.length
            ).toFixed(1)}
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {getMetricUnit(type)}
          </Text>
        </View>

        <View style={themedStyles.statDivider} />

        <View style={themedStyles.statItem}>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('health.records')}
          </Text>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginTop: theme.spacing.xs },
            ]}
          >
            {sortedData.length}
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {t('health.records').toLowerCase()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      marginVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    trendBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.round,
      ...theme.shadows.sm,
    },
    chart: {
      marginVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
    },
    goalContainer: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.success + '10',
      borderRadius: theme.radius.md,
      alignItems: 'center',
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.success,
    },
    chartWrapper: {
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(0,0,0,0.03)',
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginVertical: theme.spacing.sm,
    },
    dataContainer: {
      gap: theme.spacing.xs,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
    },
    trendIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: theme.spacing.xs,
    },
    statDivider: {
      width: 1,
      height: '80%',
      backgroundColor: theme.colors.border,
    },
    errorContainer: {
      minHeight: 180,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(0,0,0,0.03)',
      borderRadius: theme.radius.md,
      marginVertical: theme.spacing.md,
      padding: theme.spacing.xl,
    },
  });
