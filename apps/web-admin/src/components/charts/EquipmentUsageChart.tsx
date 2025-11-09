import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';

interface EquipmentUsageChartProps {
  data?: {
    status: string;
    count: number;
  }[];
  loading?: boolean;
  height?: number;
}

const EquipmentUsageChart: React.FC<EquipmentUsageChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = [
    { status: 'AVAILABLE', count: 0 },
    { status: 'IN_USE', count: 0 },
    { status: 'MAINTENANCE', count: 0 },
    { status: 'OUT_OF_ORDER', count: 0 },
  ];

  const chartData = data || defaultData;

  const statusColors: { [key: string]: string } = {
    AVAILABLE: '#10b981',
    IN_USE: '#3b82f6',
    MAINTENANCE: '#f59e0b',
    OUT_OF_ORDER: '#ef4444',
  };

  const statusLabels: { [key: string]: string } = {
    AVAILABLE: 'Sẵn sàng',
    IN_USE: 'Đang sử dụng',
    MAINTENANCE: 'Bảo trì',
    OUT_OF_ORDER: 'Hỏng',
  };

  const colors = chartData.map(item => statusColors[item.status] || '#6b7280');
  const labels = chartData.map(item => statusLabels[item.status] || item.status);
  const values = chartData.map(item => item.count);

  const options: ApexOptions = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      height: height,
      type: 'donut',
      toolbar: {
        show: false,
      },
      background: 'transparent',
    },
    colors: colors,
    labels: labels,
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
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
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        colors: [isDark ? '#fff' : '#000'],
      },
      formatter: (val: number, opts: any) => {
        return `${opts.w.globals.labels[opts.seriesIndex]}: ${val.toFixed(1)}%`;
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
        formatter: (val: number) => `${val} thiết bị`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              color: isDark ? '#d1d5db' : '#374151',
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: '20px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: isDark ? '#fff' : '#111827',
              offsetY: 10,
              formatter: (val: string) => {
                return val;
              },
            },
            total: {
              show: true,
              label: 'Tổng',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: isDark ? '#d1d5db' : '#374151',
              formatter: () => {
                const total = values.reduce((a, b) => a + b, 0);
                return total.toString();
              },
            },
          },
        },
      },
    },
  };

  const series = values;

  const hasData = values.some(val => val > 0);

  return (
    <AdminChart
      title='Sử dụng Thiết bị'
      description='Biểu đồ thể hiện tỷ lệ sử dụng thiết bị theo trạng thái'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu thiết bị'
    >
      {hasData && (
        <Chart options={options} series={series} type='donut' height={height} />
      )}
    </AdminChart>
  );
};

export default EquipmentUsageChart;

