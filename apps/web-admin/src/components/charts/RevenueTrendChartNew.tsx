import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { gymEChartsThemeName, registerGymEChartsTheme } from '../../theme/echartsTheme';

type RevenueTrendChartProps = {
  data?: {
    dates: string[];
    subscription: number[];
    class: number[];
    addon: number[];
    other: number[];
    total: number[];
  };
  theme?: 'light' | 'dark';
};

const RevenueTrendChartNew: React.FC<RevenueTrendChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    subscription: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    class: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    addon: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    other: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
          name: 'Subscription',
          type: 'line',
          smooth: true,
          data: chartData.subscription,
        },
        {
          name: 'Class',
          type: 'line',
          smooth: true,
          data: chartData.class,
        },
        {
          name: 'Addon',
          type: 'line',
          smooth: true,
          data: chartData.addon,
        },
        {
          name: 'Other',
          type: 'line',
          smooth: true,
          data: chartData.other,
        },
        {
          name: 'Total Revenue',
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 3,
            type: 'dashed',
          },
          data: chartData.total,
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

export default RevenueTrendChartNew;
