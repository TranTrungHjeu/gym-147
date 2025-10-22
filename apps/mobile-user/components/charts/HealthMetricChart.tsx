import type { HealthMetricChartProps } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
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

  if (!data || data.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          style={[Typography.bodyLarge, { color: theme.colors.textSecondary }]}
        >
          No data available
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
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          style={[Typography.bodyLarge, { color: theme.colors.textSecondary }]}
        >
          No valid data available
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
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        } else if (period === 'weekly') {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        } else {
          return date.toLocaleDateString('en-US', { month: 'short' });
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
      WEIGHT: 'Weight',
      BODY_FAT: 'Body Fat',
      MUSCLE_MASS: 'Muscle Mass',
      BMI: 'BMI',
      HEART_RATE: 'Heart Rate',
      BLOOD_PRESSURE: 'Blood Pressure',
      BODY_TEMPERATURE: 'Body Temperature',
      SLEEP_HOURS: 'Sleep Hours',
      WATER_INTAKE: 'Water Intake',
      STEPS: 'Steps',
      CALORIES_BURNED: 'Calories Burned',
      CALORIES_CONSUMED: 'Calories Consumed',
    };
    return names[metricType] || metricType;
  };

  const getMetricUnit = (metricType: string) => {
    const units: Record<string, string> = {
      WEIGHT: 'kg',
      BODY_FAT: '%',
      MUSCLE_MASS: 'kg',
      BMI: '',
      HEART_RATE: 'bpm',
      BLOOD_PRESSURE: 'mmHg',
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
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[Typography.h3, { color: theme.colors.text }]}>
          {getMetricDisplayName(type)}
        </Text>
        {showTrend && trend && (
          <View style={styles.trendContainer}>
            <Text
              style={[
                Typography.caption,
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
        )}
      </View>

      {!isValidChartData ? (
        <View style={styles.errorContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            No valid data to display
          </Text>
        </View>
      ) : (
        <View style={styles.simpleChartContainer}>
          <Text
            style={[
              Typography.h4,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {getMetricDisplayName(type)} Trend
          </Text>

          {/* Simple data visualization */}
          <View style={styles.dataContainer}>
            {sortedData.slice(-5).map((metric, index) => {
              const date = new Date(
                metric.recordedAt || (metric as any).recorded_at
              );
              return (
                <View key={metric.id || index} style={styles.dataRow}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {isNaN(date.getTime())
                      ? `Point ${index + 1}`
                      : date.toLocaleDateString()}
                  </Text>
                  <Text
                    style={[Typography.bodyLarge, { color: theme.colors.text }]}
                  >
                    {metric.value.toFixed(1)} {metric.unit}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Trend indicator */}
          {trend && (
            <View style={styles.trendIndicator}>
              <Text
                style={[
                  Typography.caption,
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
                {Math.abs(trend.changePercentage).toFixed(1)}% change
              </Text>
            </View>
          )}
        </View>
      )}

      {showGoal && goalValue && (
        <View style={styles.goalContainer}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Goal: {goalValue} {getMetricUnit(type)}
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Current
          </Text>
          <Text style={[Typography.bodyLarge, { color: theme.colors.text }]}>
            {sortedData[sortedData.length - 1]?.value.toFixed(1)}{' '}
            {getMetricUnit(type)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Average
          </Text>
          <Text style={[Typography.bodyLarge, { color: theme.colors.text }]}>
            {(
              sortedData.reduce((sum, metric) => sum + metric.value, 0) /
              sortedData.length
            ).toFixed(1)}{' '}
            {getMetricUnit(type)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Records
          </Text>
          <Text style={[Typography.bodyLarge, { color: theme.colors.text }]}>
            {sortedData.length}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  goalContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  errorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginVertical: 8,
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  simpleChartContainer: {
    height: 220,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    marginVertical: 8,
  },
  dataContainer: {
    flex: 1,
    justifyContent: 'space-around',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  trendIndicator: {
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
  },
});
