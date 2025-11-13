import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { gymEChartsThemeName, registerGymEChartsTheme } from '../../theme/echartsTheme';

type UserActivityRateChartProps = {
  data?: {
    roles: string[];
    active24h: number[];
    active48h: number[];
    active72h: number[];
  };
  theme?: 'light' | 'dark';
};

const UserActivityRateChart: React.FC<UserActivityRateChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    roles: ['Admins', 'Trainers', 'Members'],
    active24h: [0, 0, 0],
    active48h: [0, 0, 0],
    active72h: [0, 0, 0],
  };

  const chartData = data || defaultData;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with custom theme
    registerGymEChartsTheme();
    const chart = echarts.init(chartRef.current, gymEChartsThemeName);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        textStyle: {
          color: isDark ? '#fff' : '#333',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: chartData.roles,
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          color: isDark ? '#fff' : '#333',
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: isDark ? '#fff' : '#333',
        },
      },
      series: [
        {
          name: 'Active 24h',
          type: 'bar',
          barWidth: '60%',
          data: chartData.active24h,
        },
        {
          name: 'Active 48h',
          type: 'bar',
          barWidth: '60%',
          data: chartData.active48h,
        },
        {
          name: 'Active 72h',
          type: 'bar',
          barWidth: '60%',
          data: chartData.active72h,
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

export default UserActivityRateChart;
