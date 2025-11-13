import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface RevenueTrendChartProps {
  data?: {
    dates: string[];
    revenues: number[];
    transactions?: number[];
  };
  loading?: boolean;
  height?: number;
}

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    transactions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;

  const hasData = chartData.revenues.some((val) => val > 0);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: (value) =>
        typeof value === 'number'
          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
          : String(value),
    },
    legend: {
      top: 10,
      right: 10,
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
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (val: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(val),
      },
    },
    series: [
      {
        name: 'Doanh thu',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#ff6422' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 100, 34, 0.35)' },
              { offset: 1, color: 'rgba(255, 100, 34, 0.00)' },
            ],
          },
        },
        data: chartData.revenues,
      },
      ...(chartData.transactions
        ? [
            {
              name: 'Giao dịch',
              type: 'line',
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, color: '#38bdf8' },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(56, 189, 248, 0.25)' },
                    { offset: 1, color: 'rgba(56, 189, 248, 0.00)' },
                  ],
                },
              },
              data: chartData.transactions,
            } as any,
          ]
        : []),
    ],
  };

  return (
    <AdminChart
      title='Xu hướng Doanh thu'
      description='Biểu đồ thể hiện xu hướng doanh thu theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu doanh thu'
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

export default RevenueTrendChart;
