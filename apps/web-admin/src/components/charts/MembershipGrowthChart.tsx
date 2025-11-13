import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { gymEChartsThemeName, registerGymEChartsTheme } from '../../theme/echartsTheme';

type MembershipGrowthChartProps = {
  data?: {
    dates: string[];
    newMembers: number[];
    cancelledMembers: number[];
  };
  theme?: 'light' | 'dark';
};

const MembershipGrowthChart: React.FC<MembershipGrowthChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    newMembers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    cancelledMembers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
        boundaryGap: false,
        data: chartData.dates,
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
          name: 'New Members',
          type: 'line',
          stack: 'total',
          areaStyle: {},
          data: chartData.newMembers,
        },
        {
          name: 'Cancelled Members',
          type: 'line',
          stack: 'total',
          areaStyle: {},
          data: chartData.cancelledMembers.map(value => -value), // Negative for visual distinction
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

export default MembershipGrowthChart;
