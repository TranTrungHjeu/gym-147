import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface ClassAttendanceChartProps {
  data?: {
    classNames: string[];
    attendance: number[][];
    dates?: string[];
  };
  loading?: boolean;
  height?: number;
}

const ClassAttendanceChart: React.FC<ClassAttendanceChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    classNames: ['Yoga', 'Cardio', 'Strength', 'Pilates', 'HIIT'],
    attendance: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };

  const chartData = data || defaultData;

  const hasData = chartData.attendance.some(arr => arr.some(val => val > 0));

  const categories = chartData.dates || chartData.classNames;

  const option: EChartsOption = {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
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
      data: categories,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: chartData.classNames.map((className, index) => ({
      name: className,
      type: 'bar',
      barMaxWidth: 22,
      emphasis: { focus: 'series' },
      data: chartData.attendance[index] || [],
    })),
  };

  return (
    <AdminChart
      title='Tham gia Lớp học'
      description='Biểu đồ thể hiện số lượng tham gia các lớp học theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu tham gia lớp học'
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

export default ClassAttendanceChart;

