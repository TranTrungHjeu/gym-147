import { useAuth } from '@/contexts/AuthContext';
import { workoutFrequencyService } from '@/services/member/workout-frequency.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface WorkoutFrequencyChartProps {
  data?: {
    labels: string[];
    datasets: {
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }[];
  };
  period?: 'week' | 'month' | 'year';
  onPeriodChange?: (period: 'week' | 'month' | 'year') => void;
}

const screenWidth = Dimensions.get('window').width;

export default function WorkoutFrequencyChart({
  data,
  period = 'week',
  onPeriodChange,
}: WorkoutFrequencyChartProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [apiData, setApiData] = useState<any>(null);
  const themedStyles = styles(theme);

  // Fetch real data silently
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      const result = await workoutFrequencyService.getWorkoutFrequency(
        user.id,
        selectedPeriod
      );
      if (result) setApiData(result);
    };
    fetchData();
  }, [user?.id, selectedPeriod]);

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
        t('stats.months.jul'),
        t('stats.months.aug'),
        t('stats.months.sep'),
        t('stats.months.oct'),
        t('stats.months.nov'),
        t('stats.months.dec'),
      ];
    }
  };

  // Use API data if available, with translated labels
  const chartData = apiData && apiData.datasets && apiData.datasets[0] && apiData.datasets[0].data && apiData.datasets[0].data.length > 0
    ? {
        labels: getLabels(),
        datasets: [
          {
            data: apiData.datasets[0].data,
            color: (opacity = 1) =>
              theme.colors.primary +
              Math.floor(opacity * 255)
                .toString(16)
                .padStart(2, '0'),
            strokeWidth: 3,
          },
        ],
      }
    : data && data.datasets && data.datasets[0] && data.datasets[0].data && data.datasets[0].data.length > 0
    ? data
    : {
        labels: getLabels(),
        datasets: [
          {
            data: [],
            color: (opacity = 1) =>
              theme.colors.primary +
              Math.floor(opacity * 255)
                .toString(16)
                .padStart(2, '0'),
            strokeWidth: 3,
          },
        ],
      };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) =>
      theme.isDark
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: theme.radius.lg,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary, // This is OK - primary is a string
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.border, // This is OK - border is a string
      strokeWidth: 1,
    },
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

  return (
    <View
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={themedStyles.headerContainer}>
        <Text style={[Typography.h4, { color: theme.colors.text }]}>
          {t('stats.workoutFrequency')}
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

      {chartData.datasets[0].data.length > 0 ? (
        <>
          <View style={themedStyles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={themedStyles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={true}
              withHorizontalLines={true}
              withDots={true}
              withShadow={false}
              withScrollableDot={false}
            />
          </View>

          <View style={themedStyles.statsContainer}>
            <View style={themedStyles.statItem}>
              <Text style={[Typography.h5, { color: theme.colors.primary }]}>
                {chartData.datasets[0].data.reduce((a, b) => a + b, 0)}
              </Text>
              <Text
                style={[
                  Typography.labelSmall,
                  { color: theme.colors.textSecondary, marginTop: 2 },
                ]}
              >
                {t('stats.totalWorkouts')}
              </Text>
            </View>

            <View style={themedStyles.statDivider} />

            <View style={themedStyles.statItem}>
              <Text style={[Typography.h5, { color: theme.colors.success }]}>
                {Math.max(...chartData.datasets[0].data)}
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
                {(
                  chartData.datasets[0].data.reduce((a, b) => a + b, 0) /
                  chartData.datasets[0].data.length
                ).toFixed(1)}
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
        </>
      ) : (
        <View style={[themedStyles.chartContainer, { height: 220, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
            {t('stats.noDataAvailable') || 'No data available'}
          </Text>
        </View>
      )}
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
