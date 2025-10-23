import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const themedStyles = styles(theme);

  // Get labels based on period
  const getLabels = () => {
    if (selectedPeriod === 'week') {
      return [
        t('stats.days.mon'),
        t('stats.days.tue'),
        t('stats.days.wed'),
        t('stats.days.thu'),
        t('stats.days.fri'),
        t('stats.days.sat'),
        t('stats.days.sun'),
      ];
    } else if (selectedPeriod === 'month') {
      return [
        t('stats.weeks.week1'),
        t('stats.weeks.week2'),
        t('stats.weeks.week3'),
        t('stats.weeks.week4'),
      ];
    } else {
      return [
        t('stats.months.jan'),
        t('stats.months.feb'),
        t('stats.months.mar'),
        t('stats.months.apr'),
        t('stats.months.may'),
        t('stats.months.jun'),
      ];
    }
  };

  // Default data if none provided
  const defaultData = {
    labels: getLabels(),
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
    color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
    labelColor: (opacity = 1) =>
      theme.isDark
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: theme.radius.lg,
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
    { key: 'week', label: t('stats.weekly') },
    { key: 'month', label: t('stats.monthly') },
    { key: 'year', label: t('stats.yearly') },
  ] as const;

  const totalCalories = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
  const averageCalories = totalCalories / chartData.datasets[0].data.length;
  const maxCalories = Math.max(...chartData.datasets[0].data);

  return (
    <View
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={themedStyles.headerContainer}>
        <Text style={[Typography.h4, { color: theme.colors.text }]}>
          {t('stats.caloriesBurned')}
        </Text>

        <View style={themedStyles.periodSelector}>
          {periods.map((periodOption) => (
            <TouchableOpacity
              key={periodOption.key}
              style={[
                themedStyles.periodButton,
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
                  Typography.labelSmall,
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

      <View style={themedStyles.chartContainer}>
        <BarChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={themedStyles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          showValuesOnTopOfBars={true}
          fromZero={true}
          yAxisLabel=""
          yAxisSuffix=""
        />
      </View>

      <View style={themedStyles.statsContainer}>
        <View style={themedStyles.statItem}>
          <Text style={[Typography.h5, { color: theme.colors.primary }]}>
            {totalCalories.toLocaleString()}
          </Text>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {t('stats.totalCalories')}
          </Text>
        </View>

        <View style={themedStyles.statDivider} />

        <View style={themedStyles.statItem}>
          <Text style={[Typography.h5, { color: theme.colors.success }]}>
            {maxCalories.toLocaleString()}
          </Text>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {t('stats.peakDay')}
          </Text>
        </View>

        <View style={themedStyles.statDivider} />

        <View style={themedStyles.statItem}>
          <Text style={[Typography.h5, { color: theme.colors.warning }]}>
            {Math.round(averageCalories).toLocaleString()}
          </Text>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {t('stats.average')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      marginVertical: theme.spacing.sm,
      ...theme.shadows.md,
    },
    headerContainer: {
      marginBottom: theme.spacing.md,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    periodButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.round,
      borderWidth: 1,
      minWidth: 80,
      alignItems: 'center',
    },
    chartContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    chart: {
      borderRadius: theme.radius.lg,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statDivider: {
      width: 1,
      height: '80%',
      backgroundColor: theme.colors.border,
    },
  });
