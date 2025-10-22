import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface ProgressChartProps {
  data?: {
    weight?: {
      labels: string[];
      datasets: {
        data: number[];
        color?: (opacity: number) => string;
        strokeWidth?: number;
      }[];
    };
    bodyFat?: {
      labels: string[];
      datasets: {
        data: number[];
        color?: (opacity: number) => string;
        strokeWidth?: number;
      }[];
    };
  };
  metric?: 'weight' | 'bodyFat';
  onMetricChange?: (metric: 'weight' | 'bodyFat') => void;
}

const screenWidth = Dimensions.get('window').width;

export default function ProgressChart({
  data,
  metric = 'weight',
  onMetricChange,
}: ProgressChartProps) {
  const { theme } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState(metric);

  // Default data if none provided
  const defaultData = {
    weight: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          data: [75.2, 74.8, 74.1, 73.5, 72.9, 72.3],
          color: (opacity = 1) =>
            theme.colors.primary +
            Math.floor(opacity * 255)
              .toString(16)
              .padStart(2, '0'),
          strokeWidth: 3,
        },
      ],
    },
    bodyFat: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          data: [18.5, 18.2, 17.8, 17.4, 17.0, 16.7],
          color: (opacity = 1) =>
            theme.colors.success +
            Math.floor(opacity * 255)
              .toString(16)
              .padStart(2, '0'),
          strokeWidth: 3,
        },
      ],
    },
  };

  const chartData = data || defaultData;
  const currentData = chartData[selectedMetric];

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue color
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke:
        selectedMetric === 'weight'
          ? theme.colors.primary
          : theme.colors.success,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.border,
      strokeWidth: 1,
    },
  };

  const handleMetricChange = (newMetric: 'weight' | 'bodyFat') => {
    setSelectedMetric(newMetric);
    onMetricChange?.(newMetric);
  };

  const metrics = [
    { key: 'weight', label: 'Weight', unit: 'kg' },
    { key: 'bodyFat', label: 'Body Fat', unit: '%' },
  ] as const;

  const currentValues = currentData.datasets[0].data;
  const startValue = currentValues[0];
  const endValue = currentValues[currentValues.length - 1];
  const change = endValue - startValue;
  const changePercent = ((change / startValue) * 100).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Progress Tracking
        </Text>

        <View style={styles.metricSelector}>
          {metrics.map((metricOption) => (
            <TouchableOpacity
              key={metricOption.key}
              style={[
                styles.metricButton,
                {
                  backgroundColor:
                    selectedMetric === metricOption.key
                      ? selectedMetric === 'weight'
                        ? theme.colors.primary
                        : theme.colors.success
                      : theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleMetricChange(metricOption.key)}
            >
              <Text
                style={[
                  styles.metricButtonText,
                  {
                    color:
                      selectedMetric === metricOption.key
                        ? theme.colors.textInverse
                        : theme.colors.text,
                  },
                ]}
              >
                {metricOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={currentData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
          withScrollableDot={false}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {startValue.toFixed(1)}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Starting {selectedMetric === 'weight' ? 'Weight' : 'Body Fat'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {endValue.toFixed(1)}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Current {selectedMetric === 'weight' ? 'Weight' : 'Body Fat'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  change >= 0
                    ? selectedMetric === 'weight'
                      ? theme.colors.error
                      : theme.colors.success
                    : selectedMetric === 'weight'
                    ? theme.colors.success
                    : theme.colors.error,
              },
            ]}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Change ({changePercent}%)
          </Text>
        </View>
      </View>

      <View style={styles.unitContainer}>
        <Text style={[styles.unitText, { color: theme.colors.textSecondary }]}>
          Unit: {metrics.find((m) => m.key === selectedMetric)?.unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.h4,
    fontWeight: '600',
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  metricButtonText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  unitContainer: {
    alignItems: 'center',
  },
  unitText: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
  },
});
