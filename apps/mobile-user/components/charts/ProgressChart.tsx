import { useAuth } from '@/contexts/AuthContext';
import { progressService } from '@/services/member/progress.service';
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
  const { t } = useTranslation();
  const { user, member } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [apiData, setApiData] = useState<any>(null);
  const themedStyles = styles(theme);

  // Fetch real data silently
  useEffect(() => {
    const fetchData = async () => {
      if (!member?.id) return;
      const result = await progressService.getProgressData(member.id);
      if (result) setApiData(result);
    };
    fetchData();
  }, [member?.id]);

  // Get translated labels (last 12 months, same as backend)
  const getLabels = () => {
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

    // Generate last 12 months (same logic as backend)
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthIndex = date.getMonth(); // 0-11
      labels.push(t(`stats.months.${monthKeys[monthIndex]}`));
    }

    return labels;
  };

  // Use API data with translated labels (no fallback data)
  const chartData = apiData && apiData.weight?.datasets?.[0]?.data?.length > 0
    ? {
        weight: {
          labels: getLabels(),
          datasets: [
            {
              data: apiData.weight.datasets[0].data,
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
          labels: getLabels(),
          datasets: [
            {
              data: apiData.bodyFat?.datasets?.[0]?.data || [],
              color: (opacity = 1) =>
                theme.colors.success +
                Math.floor(opacity * 255)
                  .toString(16)
                  .padStart(2, '0'),
              strokeWidth: 3,
            },
          ],
        },
      }
    : data && data.weight?.datasets?.[0]?.data?.length > 0
    ? data
    : {
        weight: {
          labels: getLabels(),
          datasets: [{ 
            data: [], 
            color: (opacity = 1) =>
              theme.colors.primary +
              Math.floor(opacity * 255)
                .toString(16)
                .padStart(2, '0'),
            strokeWidth: 3 
          }],
        },
        bodyFat: {
          labels: getLabels(),
          datasets: [{ 
            data: [], 
            color: (opacity = 1) =>
              theme.colors.success +
              Math.floor(opacity * 255)
                .toString(16)
                .padStart(2, '0'),
            strokeWidth: 3 
          }],
        },
      };
  const currentData = chartData[selectedMetric];

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
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
    {
      key: 'weight',
      label: t('health.metricTypes.weight'),
      unit: t('health.units.kg'),
    },
    {
      key: 'bodyFat',
      label: t('health.metricTypes.bodyFat'),
      unit: t('health.units.percent'),
    },
  ] as const;

  const currentValues = currentData.datasets[0].data;
  const startValue = currentValues[0] || 0;
  const endValue = currentValues[currentValues.length - 1] || 0;
  const change = endValue - startValue;
  const changePercent =
    startValue > 0 ? ((change / startValue) * 100).toFixed(1) : '0.0';

  return (
    <View
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={themedStyles.headerContainer}>
        <Text style={[Typography.h4, { color: theme.colors.text }]}>
          {t('stats.progressTracking')}
        </Text>

        <View style={themedStyles.metricSelector}>
          {metrics.map((metricOption) => (
            <TouchableOpacity
              key={metricOption.key}
              style={[
                themedStyles.metricButton,
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
                  Typography.labelSmall,
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

      {currentValues.length > 0 && currentValues.some((val) => val > 0) ? (
        <>
          <View style={themedStyles.chartContainer}>
            <LineChart
              data={currentData}
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
          <Text style={[Typography.h5, { color: theme.colors.text }]}>
            {startValue.toFixed(1)}
          </Text>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {selectedMetric === 'weight'
              ? t('stats.startingWeight')
              : t('stats.startingBodyFat')}
          </Text>
        </View>

        <View style={themedStyles.statDivider} />

        <View style={themedStyles.statItem}>
          <Text style={[Typography.h5, { color: theme.colors.text }]}>
            {endValue.toFixed(1)}
          </Text>
          <Text
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {selectedMetric === 'weight'
              ? t('stats.currentWeight')
              : t('stats.currentBodyFat')}
          </Text>
        </View>

        <View style={themedStyles.statDivider} />

        <View style={themedStyles.statItem}>
          <Text
            style={[
              Typography.h5,
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
            style={[
              Typography.labelSmall,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {t('stats.change')} ({changePercent}%)
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

      <View style={themedStyles.unitContainer}>
        <Text
          style={[
            Typography.caption,
            { color: theme.colors.textSecondary, fontStyle: 'italic' },
          ]}
        >
          {t('stats.unit')}:{' '}
          {metrics.find((m) => m.key === selectedMetric)?.unit}
        </Text>
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
    metricSelector: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    metricButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.round,
      borderWidth: 1,
      minWidth: 100,
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
      marginBottom: theme.spacing.sm,
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
    unitContainer: {
      alignItems: 'center',
    },
  });
