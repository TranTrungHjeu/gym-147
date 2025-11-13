import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface RevenueByPlanChartProps {
  data?: {
    plans: string[];
    revenues: number[];
  };
  loading?: boolean;
  height?: number;
}

const RevenueByPlanChart: React.FC<RevenueByPlanChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    plans: [],
    revenues: [],
  };

  const chartData = data || defaultData;

  const hasData =
    chartData.revenues && chartData.revenues.length > 0 && chartData.revenues.some(val => val > 0);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (val) =>
        typeof val === 'number'
          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
          : String(val),
    },
    grid: {
      left: 50,
      right: 30,
      bottom: 50,
      top: 20,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartData.plans || [],
      axisTick: { show: false },
      axisLabel: {
        rotate: chartData.plans && chartData.plans.length > 5 ? 45 : 0,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (val: number) =>
          new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(
            val
          ),
      },
    },
    series: [
      {
        name: 'Doanh thu',
        type: 'bar',
        barMaxWidth: 60,
        data: chartData.revenues || [],
        emphasis: { focus: 'series' },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#ff6422' },
              { offset: 1, color: '#fb923c' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const value = params.value as number;
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toString();
          },
          color: isDark ? '#d1d5db' : '#374151',
          fontSize: 11,
        },
      },
    ],
  };

  return (
    <AdminChart
      title='Doanh thu theo Gói tập'
      description='Biểu đồ thể hiện doanh thu theo từng gói tập'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu doanh thu theo gói tập'
    >
      {hasData && (
        <ReactECharts
          option={option}
          theme={getEChartsTheme(theme)}
          style={{ width: '100%', height }}
        />
      )}
    </AdminChart>
  );
};

export default RevenueByPlanChart;
