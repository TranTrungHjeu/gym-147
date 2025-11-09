import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';

interface MonthlyRevenueBarChartProps {
  data?: {
    months: string[];
    revenues: number[];
  };
  loading?: boolean;
  height?: number;
}

const MonthlyRevenueBarChart: React.FC<MonthlyRevenueBarChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const chartData = data || defaultData;

  const options: ApexOptions = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      height: height,
      type: 'bar',
      toolbar: {
        show: false,
      },
      background: 'transparent',
    },
    colors: ['#f97316'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
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
      categories: chartData.months,
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
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#fb923c'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100],
      },
    },
  };

  const series = [
    {
      name: 'Doanh thu',
      data: chartData.revenues,
    },
  ];

  const hasData = chartData.revenues.some(val => val > 0);

  return (
    <AdminChart
      title='Doanh thu Theo Tháng'
      description='Biểu đồ thể hiện doanh thu theo từng tháng'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu doanh thu'
    >
      {hasData && (
        <Chart options={options} series={series} type='bar' height={height} />
      )}
    </AdminChart>
  );
};

export default MonthlyRevenueBarChart;

