import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';

interface RevenueTrendChartProps {
  data?: {
    dates: string[];
    revenues: number[];
    transactions?: number[];
  };
  loading?: boolean;
  height?: number;
}

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    transactions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;

  const options: ApexOptions = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      height: height,
      type: 'area',
      toolbar: {
        show: false,
      },
      background: 'transparent',
    },
    colors: ['#f97316', '#10b981'],
    stroke: {
      curve: 'smooth',
      width: [2, 2],
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    markers: {
      size: 0,
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 6,
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
        formatter: (val: number) => {
          return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(val);
        },
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
        formatter: (val: number) => {
          return new Intl.NumberFormat('vi-VN', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(val);
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
      name: 'Doanh thu',
      data: chartData.revenues,
    },
    ...(chartData.transactions
      ? [
          {
            name: 'Giao dịch',
            data: chartData.transactions,
          },
        ]
      : []),
  ];

  const hasData = chartData.revenues.some(val => val > 0);

  return (
    <AdminChart
      title='Xu hướng Doanh thu'
      description='Biểu đồ thể hiện xu hướng doanh thu theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu doanh thu'
    >
      {hasData && (
        <Chart options={options} series={series} type='area' height={height} />
      )}
    </AdminChart>
  );
};

export default RevenueTrendChart;

