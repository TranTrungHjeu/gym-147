import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface RedemptionTrendChartProps {
  data?: {
    dates: string[];
    redemptions: number[];
    points_spent: number[];
  };
  loading?: boolean;
  height?: number;
}

const RedemptionTrendChart: React.FC<RedemptionTrendChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    redemptions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    points_spent: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;
  const hasData = chartData.redemptions.some((val) => val > 0);

  const textColor = isDark ? '#d4d7dd' : '#555555';
  const gridColor = isDark ? '#343434' : '#e7e7e7';

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      textStyle: {
        color: isDark ? '#f3f4f6' : '#111827',
        fontFamily: "'Space Grotesk', Inter, sans-serif",
      },
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          let result = `<div style="font-family: 'Space Grotesk', Inter, sans-serif; font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            const value = typeof param.value === 'number' ? param.value.toLocaleString('vi-VN') : param.value;
            result += `<div style="margin: 4px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
              <span style="font-weight: 500;">${param.seriesName}:</span>
              <span style="font-weight: 700; margin-left: 8px;">${value}</span>
            </div>`;
          });
          return result;
        }
        return '';
      },
    },
    legend: {
      top: 10,
      right: 10,
      textStyle: {
        color: textColor,
        fontFamily: "'Space Grotesk', Inter, sans-serif",
        fontSize: 12,
        fontWeight: 500,
      },
    },
    grid: {
      left: 50,
      right: 30,
      bottom: 50,
      top: 50,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartData.dates,
      axisLine: { lineStyle: { color: gridColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontFamily: "'Space Grotesk', Inter, sans-serif",
        fontSize: 11,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Lượt đổi',
        position: 'left',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
        nameTextStyle: {
          color: textColor,
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontSize: 11,
          fontWeight: 500,
        },
      },
      {
        type: 'value',
        name: 'Điểm',
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            return value.toString();
          },
        },
        splitLine: { show: false },
        nameTextStyle: {
          color: textColor,
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
    series: [
      {
        name: 'Lượt đổi',
        type: 'bar',
        data: chartData.redemptions,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#ff6422' }, // orange-500
              { offset: 1, color: '#fb923c' }, // orange-400
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(255, 100, 34, 0.5)',
          },
        },
      },
      {
        name: 'Điểm đã dùng',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.points_spent,
        lineStyle: {
          color: '#f59e0b', // amber-500
          width: 3,
        },
        itemStyle: {
          color: '#f59e0b',
        },
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };

  return (
    <AdminChart
      title='Xu hướng Đổi thưởng'
      description='Biểu đồ thể hiện số lượt đổi thưởng và điểm đã sử dụng theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu đổi thưởng'
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

export default RedemptionTrendChart;
























