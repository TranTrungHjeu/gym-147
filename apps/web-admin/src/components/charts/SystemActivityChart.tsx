import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { getEChartsTheme } from '../../theme/echartsTheme';

type SystemActivityChartProps = {
  data?: {
    dates: string[];
    activities: number[];
  };
  theme?: 'light' | 'dark';
  loading?: boolean;
  height?: number;
};

const SystemActivityChart: React.FC<SystemActivityChartProps> = ({ 
  data, 
  theme = 'light',
  loading = false,
  height = 400,
}) => {
  const defaultData = {
    dates: [],
    activities: [],
  };

  const chartData = data || defaultData;
  
  // Always ensure we have data for the chart - create default if empty
  const hasRealData = chartData.activities && 
                      chartData.activities.length > 0 && 
                      chartData.activities.some((val: number) => val > 0);
  
  // Generate default dates (last 30 days) if no dates provided
  const dates = (chartData.dates && chartData.dates.length > 0) 
    ? chartData.dates 
    : Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
      });
  
  // Generate default activities (all zeros) if no activities provided
  const activities = (chartData.activities && chartData.activities.length > 0)
    ? chartData.activities
    : Array(dates.length).fill(0);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => (typeof value === 'number' ? `${value} hoạt động` : String(value)),
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
          return val.toString();
        },
      },
    },
    series: [
      {
        name: 'Hoạt động',
        type: 'line',
        smooth: true,
        showSymbol: !hasRealData, // Show symbols when no real data
        lineStyle: { 
          width: 2, 
          color: hasRealData ? '#ff6422' : '#9ca3af',
        },
        areaStyle: hasRealData ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 100, 34, 0.3)' },
              { offset: 1, color: 'rgba(255, 100, 34, 0.0)' },
            ],
          },
        } : undefined,
        data: activities,
      },
    ],
    graphic: !hasRealData ? [
      {
        type: 'text',
        left: 'center',
        top: 'middle',
        z: 100,
        style: {
          text: 'Chưa có dữ liệu hoạt động hệ thống',
          fontSize: 14,
          fontWeight: 500,
          fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
          fontFamily: "'Space Grotesk', sans-serif",
        },
      },
    ] : undefined,
  };

  if (loading) {
    return (
      <div className='text-center py-12 text-theme-xs text-gray-500 dark:text-gray-400 font-inter' style={{ height }}>
        Đang tải...
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      theme={getEChartsTheme(theme)}
      style={{ width: '100%', height }}
    />
  );
};

export default SystemActivityChart;
