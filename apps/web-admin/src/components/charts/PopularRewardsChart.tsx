import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface PopularReward {
  reward_id: string;
  title: string;
  points_cost: number;
  redemption_count: number;
}

interface PopularRewardsChartProps {
  data?: PopularReward[];
  loading?: boolean;
  height?: number;
}

const PopularRewardsChart: React.FC<PopularRewardsChartProps> = ({
  data = [],
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const topRewards = data.slice(0, 10).sort((a, b) => b.redemption_count - a.redemption_count);
  const hasData = topRewards.length > 0 && topRewards.some((r) => r.redemption_count > 0);

  const textColor = isDark ? '#d4d7dd' : '#555555';
  const gridColor = isDark ? '#343434' : '#e7e7e7';

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      textStyle: {
        color: isDark ? '#f3f4f6' : '#111827',
        fontFamily: "'Space Grotesk', Inter, sans-serif",
      },
      formatter: (params: any) => {
        if (Array.isArray(params) && params.length > 0) {
          const param = params[0];
          return `<div style="font-family: 'Space Grotesk', Inter, sans-serif;">
            <div style="font-weight: 600; margin-bottom: 4px;">${param.name}</div>
            <div style="margin-top: 4px;">
              <span style="font-weight: 500;">Lượt đổi:</span>
              <span style="font-weight: 700; margin-left: 8px; color: #ff6422;">${param.value}</span>
            </div>
          </div>`;
        }
        return '';
      },
    },
    grid: {
      left: 120,
      right: 30,
      bottom: 30,
      top: 20,
      containLabel: false,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontFamily: "'Space Grotesk', Inter, sans-serif",
        fontSize: 11,
      },
      splitLine: {
        lineStyle: { color: gridColor, type: 'dashed' },
      },
    },
    yAxis: {
      type: 'category',
      data: topRewards.map((r) => r.title.length > 20 ? r.title.substring(0, 20) + '...' : r.title),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontFamily: "'Space Grotesk', Inter, sans-serif",
        fontSize: 11,
        fontWeight: 500,
      },
    },
    series: [
      {
        name: 'Lượt đổi',
        type: 'bar',
        data: topRewards.map((r) => r.redemption_count),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#ff6422' }, // orange-500
              { offset: 1, color: '#fb923c' }, // orange-400
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: textColor,
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          formatter: (params: any) => {
            return params.value.toLocaleString('vi-VN');
          },
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(255, 100, 34, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <AdminChart
      title='Top Phần thưởng Phổ biến'
      description='Biểu đồ thể hiện các phần thưởng được đổi nhiều nhất'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu phần thưởng phổ biến'
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

export default PopularRewardsChart;





























