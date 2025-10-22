import type { HealthMetricChartProps } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

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
        <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
          No data available
        </Text>
      </View>
    );
  }

  // Sort data by date
  const sortedData = [...data].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  // Prepare chart data
  const chartData = {
    labels: sortedData.map((metric, index) => {
      const date = new Date(metric.recordedAt);
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
    }),
    datasets: [
      {
        data: sortedData.map((metric) => metric.value),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green color
        strokeWidth: 2,
      },
    ],
  };

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

      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withDots={true}
        withShadow={false}
        withScrollableDot={true}
      />

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
          <Text style={[Typography.body, { color: theme.colors.text }]}>
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
          <Text style={[Typography.body, { color: theme.colors.text }]}>
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
          <Text style={[Typography.body, { color: theme.colors.text }]}>
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
});
