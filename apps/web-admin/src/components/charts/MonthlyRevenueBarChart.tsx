import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface MonthlyRevenueBarChartProps {
  data?: {
    months: string[];
    revenues: number[];
  };
  loading?: boolean;
  height?: number;
}

const MonthlyRevenueBarChart: React.FC<MonthlyRevenueBarChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;

  const hasData = chartData.revenues.some(val => val > 0);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (val) => typeof val === 'number'
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
        : String(val),
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
      data: chartData.months,
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
        type: 'bar',
        barMaxWidth: 28,
        data: chartData.revenues,
        emphasis: { focus: 'series' },
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#ff6422' },
              { offset: 1, color: '#fb923c' },
            ],
          },
        },
      },
    ],
  };

  return (
    <AdminChart
      title='Doanh thu Theo Tháng'
      description='Biểu đồ thể hiện doanh thu theo từng tháng'
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

export default MonthlyRevenueBarChart;

