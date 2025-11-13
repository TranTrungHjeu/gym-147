import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { getEChartsTheme } from '../../theme/echartsTheme';

type UserGrowthByRoleChartProps = {
  data?: {
    months: string[];
    admins: number[];
    trainers: number[];
    members: number[];
  };
  theme?: 'light' | 'dark';
};

const UserGrowthByRoleChart: React.FC<UserGrowthByRoleChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    admins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    trainers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    members: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with custom theme
    const chart = echarts.init(chartRef.current, getEChartsTheme(theme));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        top: 10,
        right: 10,
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
        data: chartData.months,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Admins',
          type: 'line',
          stack: 'total',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
          areaStyle: {
            opacity: 0.6,
          },
          data: chartData.admins,
        },
        {
          name: 'Trainers',
          type: 'line',
          stack: 'total',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
          areaStyle: {
            opacity: 0.6,
          },
          data: chartData.trainers,
        },
        {
          name: 'Members',
          type: 'line',
          stack: 'total',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
          areaStyle: {
            opacity: 0.6,
          },
          data: chartData.members,
        },
      ],
    };

    // Set chart options
    chart.setOption(option);

    // Resize chart on window resize
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, isDark]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default UserGrowthByRoleChart;
