import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { gymEChartsThemeName, registerGymEChartsTheme } from '../../theme/echartsTheme';

type PaymentSuccessRateChartProps = {
  data?: {
    dates: string[];
    successful: number[];
    failed: number[];
  };
  theme?: 'light' | 'dark';
};

const PaymentSuccessRateChart: React.FC<PaymentSuccessRateChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    successful: [0, 0, 0, 0, 0, 0, 0],
    failed: [0, 0, 0, 0, 0, 0, 0],
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
        data: chartData.dates,
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
          name: 'Successful',
          type: 'bar',
          barWidth: '60%',
          data: chartData.successful,
        },
        {
          name: 'Failed',
          type: 'bar',
          barWidth: '60%',
          data: chartData.failed,
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

export default PaymentSuccessRateChart;
