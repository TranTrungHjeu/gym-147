import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { getEChartsTheme } from '../../theme/echartsTheme';

type UserRoleDistributionChartProps = {
  data?: {
    admins: number;
    trainers: number;
    members: number;
  };
  theme?: 'light' | 'dark';
};

const UserRoleDistributionChart: React.FC<UserRoleDistributionChartProps> = ({ data, theme = 'light' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const defaultData = {
    admins: 0,
    trainers: 0,
    members: 0,
  };

  const chartData = data || defaultData;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with custom theme
    const chart = echarts.init(chartRef.current, getEChartsTheme(theme));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: 'User Roles',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 24,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: chartData.admins, name: 'Admins' },
            { value: chartData.trainers, name: 'Trainers' },
            { value: chartData.members, name: 'Members' },
          ],
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

export default UserRoleDistributionChart;
