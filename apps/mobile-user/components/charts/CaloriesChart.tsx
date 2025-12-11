import { useAuth } from '@/contexts/AuthContext';
import { caloriesService } from '@/services/member/calories.service';
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
  const { member } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const themedStyles = styles(theme);

  // Fetch real data silently
  useEffect(() => {
    const fetchData = async () => {
      if (!member?.id) {
        setError('Member not found');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const result = await caloriesService.getCaloriesData(
          member.id,
          selectedPeriod
        );
        if (result) {
          setApiData(result);
        } else {
          setError('No data available');
        }
      } catch (err: any) {
        console.error('[ERROR] Failed to load calories data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [member?.id, selectedPeriod]);

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
      // Year: Only show last 6 months (or less if current month < 6)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth(); // 0-11
      const monthsToShow = Math.min(currentMonth + 1, 6);

      const monthKeys = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ];
      const labels = [];

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthIndex = currentMonth - i;
        labels.push(t(`stats.months.${monthKeys[monthIndex]}`));
      }

      return labels;
    }
  };

  // Use API data with translated labels (no fallback data)
  const chartData = apiData && apiData.datasets && apiData.datasets[0] && apiData.datasets[0].data && apiData.datasets[0].data.length > 0
    ? {
        labels: getLabels(),
        datasets: [
          {
            data: apiData.datasets[0].data,
            colors: [
              (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
              (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
              (opacity = 1) => `rgba(69, 183, 209, ${opacity})`,
              (opacity = 1) => `rgba(150, 206, 180, ${opacity})`,
              (opacity = 1) => `rgba(255, 234, 167, ${opacity})`,
              (opacity = 1) => `rgba(221, 160, 221, ${opacity})`,
            ],
          },
        ],
      }
    : data && data.datasets && data.datasets[0] && data.datasets[0].data && data.datasets[0].data.length > 0
    ? data
    : { 
        labels: getLabels(), 
        datasets: [{ 
          data: [], 
          colors: [],
        }] 
      };

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

  // Safe calculation with fallback
  const dataArray = chartData.datasets[0].data || [];
  const totalCalories = dataArray.length > 0 
    ? dataArray.reduce((a: number, b: number) => a + b, 0)
    : 0;
  const averageCalories = dataArray.length > 0 
    ? totalCalories / dataArray.length 
    : 0;
  const maxCalories = dataArray.length > 0 
    ? Math.max(...dataArray)
    : 0;

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

      {chartData.datasets[0].data.length > 0 ? (
        <>
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
        </>
      ) : (
        <View style={[themedStyles.chartContainer, { height: 220, justifyContent: 'center', alignItems: 'center' }]}>
          {loading ? (
            <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
              {t('common.loading', 'Loading...')}
            </Text>
          ) : error ? (
            <Text style={[Typography.body, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : (
            <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
              {t('stats.chartPlaceholder', 'No data available')}
            </Text>
          )}
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
