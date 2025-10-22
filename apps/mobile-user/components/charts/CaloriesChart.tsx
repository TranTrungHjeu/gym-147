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
import { BarChart } from 'react-native-chart-kit';

interface CaloriesChartProps {
  data?: {
    labels: string[];
    datasets: {
      data: number[];
      colors?: ((opacity?: number) => string)[];
    }[];
  };
  period?: 'week' | 'month' | 'year';
  onPeriodChange?: (period: 'week' | 'month' | 'year') => void;
}

const screenWidth = Dimensions.get('window').width;

export default function CaloriesChart({
  data,
  period = 'week',
  onPeriodChange,
}: CaloriesChartProps) {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  // Default data if none provided
  const defaultData = {
    labels:
      selectedPeriod === 'week'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : selectedPeriod === 'month'
        ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data:
          selectedPeriod === 'week'
            ? [450, 320, 680, 520, 750, 280, 420]
            : selectedPeriod === 'month'
            ? [1800, 2400, 2100, 2800]
            : [8500, 9200, 8800, 10500, 9500, 9800],
        colors: [
          (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
          (opacity = 1) => `rgba(69, 183, 209, ${opacity})`,
          (opacity = 1) => `rgba(150, 206, 180, ${opacity})`,
          (opacity = 1) => `rgba(255, 234, 167, ${opacity})`,
          (opacity = 1) => `rgba(221, 160, 221, ${opacity})`,
          (opacity = 1) => `rgba(152, 216, 200, ${opacity})`,
        ],
      },
    ],
  };

  const chartData = data || defaultData;

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`, // Use specific color
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Use black for labels
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.border,
      strokeWidth: 1,
    },
    barPercentage: 0.7,
  };

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'year') => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ] as const;

  const totalCalories = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
  const averageCalories = totalCalories / chartData.datasets[0].data.length;
  const maxCalories = Math.max(...chartData.datasets[0].data);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Calories Burned
        </Text>

        <View style={styles.periodSelector}>
          {periods.map((periodOption) => (
            <TouchableOpacity
              key={periodOption.key}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    selectedPeriod === periodOption.key
                      ? theme.colors.primary
                      : theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handlePeriodChange(periodOption.key)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color:
                      selectedPeriod === periodOption.key
                        ? theme.colors.textInverse
                        : theme.colors.text,
                  },
                ]}
              >
                {periodOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          showValuesOnTopOfBars={true}
          fromZero={true}
          yAxisLabel=""
          yAxisSuffix=""
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {totalCalories.toLocaleString()}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Total Calories
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {maxCalories.toLocaleString()}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Peak Day
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.warning }]}>
            {Math.round(averageCalories).toLocaleString()}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Daily Average
          </Text>
        </View>
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
  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  periodButtonText: {
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
});
