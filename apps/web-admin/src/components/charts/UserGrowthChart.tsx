import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';

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

  const options: ApexOptions = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      height: height,
      type: 'line',
      toolbar: {
        show: false,
      },
      background: 'transparent',
    },
    colors: ['#3b82f6', '#10b981'],
    stroke: {
      curve: 'smooth',
      width: [3, 3],
    },
    markers: {
      size: 5,
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    grid: {
      borderColor: isDark ? '#374151' : '#e5e7eb',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      theme: isDark ? 'dark' : 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
      },
      y: {
        formatter: (val: number) => `${val} người`,
      },
    },
    xaxis: {
      categories: chartData.dates,
      labels: {
        style: {
          colors: isDark ? '#9ca3af' : '#6b7280',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDark ? '#9ca3af' : '#6b7280',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
        },
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: isDark ? '#d1d5db' : '#374151',
        useSeriesColors: false,
      },
      markers: {
        width: 12,
        height: 12,
        radius: 6,
      },
    },
  };

  const series = [
    {
      name: 'Đăng ký mới',
      data: chartData.newUsers,
    },
    ...(chartData.activeUsers
      ? [
          {
            name: 'Người dùng hoạt động',
            data: chartData.activeUsers,
          },
        ]
      : []),
  ];

  const hasData = chartData.newUsers.some(val => val > 0) || chartData.activeUsers?.some(val => val > 0);

  return (
    <AdminChart
      title='Tăng trưởng Thành viên'
      description='Biểu đồ thể hiện số lượng thành viên đăng ký mới và hoạt động theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu thành viên'
    >
      {hasData && (
        <Chart options={options} series={series} type='line' height={height} />
      )}
    </AdminChart>
  );
};

export default UserGrowthChart;

