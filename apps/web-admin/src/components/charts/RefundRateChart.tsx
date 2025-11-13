import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { gymEChartsThemeName, registerGymEChartsTheme } from '../../theme/echartsTheme';

type RefundRateChartProps = {
  data?: {
    refundRate: number; // Percentage of refunds over total revenue
  };
  theme?: 'light' | 'dark';
};

const RefundRateChart: React.FC<RefundRateChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    refundRate: 0,
  };

  const chartData = data || defaultData;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with custom theme
    registerGymEChartsTheme();
    const chart = echarts.init(chartRef.current, gymEChartsThemeName);

    const option: echarts.EChartsOption = {
      series: [
        {
          type: 'gauge',
          anchor: {
            show: true,
            showAbove: true,
            size: 18,
            itemStyle: {
              color: '#FAC858',
            },
          },
          pointer: {
            width: 5,
          },
          progress: {
            show: true,
            overlap: true,
            roundCap: true,
          },
          axisLine: {
            roundCap: true,
          },
          data: [
            {
              value: chartData.refundRate,
              name: 'Refund Rate',
              title: {
                offsetCenter: ['-40%', '80%'],
              },
              detail: {
                offsetCenter: ['-40%', '95%'],
              },
            },
          ],
          title: {
            fontSize: 14,
          },
          detail: {
            width: 40,
            height: 14,
            fontSize: 14,
            color: '#fff',
            backgroundColor: 'inherit',
            borderRadius: 3,
            formatter: '{value}%',
          },
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

export default RefundRateChart;
