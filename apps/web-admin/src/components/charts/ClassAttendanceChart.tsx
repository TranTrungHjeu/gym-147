import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';

interface ClassAttendanceChartProps {
  data?: {
    classNames: string[];
    attendance: number[][];
    dates?: string[];
  };
  loading?: boolean;
  height?: number;
}

const ClassAttendanceChart: React.FC<ClassAttendanceChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    classNames: ['Yoga', 'Cardio', 'Strength', 'Pilates', 'HIIT'],
    attendance: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
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
    colors: ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
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
        formatter: (val: number) => `${val} người`,
      },
    },
    xaxis: {
      categories: chartData.dates || chartData.classNames,
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
    fill: {
      opacity: 1,
    },
  };

  const series = chartData.classNames.map((className, index) => ({
    name: className,
    data: chartData.attendance[index] || [],
  }));

  const hasData = chartData.attendance.some(arr => arr.some(val => val > 0));

  return (
    <AdminChart
      title='Tham gia Lớp học'
      description='Biểu đồ thể hiện số lượng tham gia các lớp học theo thời gian'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu tham gia lớp học'
    >
      {hasData && (
        <Chart options={options} series={series} type='bar' height={height} />
      )}
    </AdminChart>
  );
};

export default ClassAttendanceChart;

