import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface UserGrowthChartProps {
  data?: {
    dates: string[];
    newUsers: number[];
    activeUsers?: number[];
  };
  loading?: boolean;
  height?: number;
}

const UserGrowthChart: React.FC<UserGrowthChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    newUsers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    activeUsers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;

  const hasData =
    chartData.newUsers.some(val => val > 0) || chartData.activeUsers?.some(val => val > 0);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: v => (typeof v === 'number' ? `${v} người` : String(v)),
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
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
          return val.toString();
        },
      },
    },
    series: [
      {
        name: 'Đăng ký mới',
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
              { offset: 0, color: 'rgba(255, 100, 34, 0.28)' },
              { offset: 1, color: 'rgba(255, 100, 34, 0.00)' },
            ],
          },
        },
        data: chartData.newUsers,
      },
      ...(chartData.activeUsers
        ? [
            {
              name: 'Người dùng hoạt động',
              type: 'line',
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, color: '#10b981' },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(16, 185, 129, 0.20)' },
                    { offset: 1, color: 'rgba(16, 185, 129, 0.00)' },
                  ],
                },
              },
              data: chartData.activeUsers,
            } as any,
          ]
        : []),
    ],
  };

  return (
    <AdminChart
      title='Tăng trưởng Hội viên'
      description='Biểu đồ thể hiện số lượng hội viên đăng ký mới và hoạt động theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu hội viên'
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

export default UserGrowthChart;
