import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { registerGymEChartsTheme, gymEChartsThemeName } from '../../theme/echartsTheme';

interface SubscriptionsByStatusChartProps {
  data?: {
    statuses: string[];
    counts: number[];
  };
  loading?: boolean;
  height?: number;
}

const SubscriptionsByStatusChart: React.FC<SubscriptionsByStatusChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    statuses: [],
    counts: [],
  };

  const chartData = data || defaultData;

  // Map status to Vietnamese labels
  const statusLabels: Record<string, string> = {
    ACTIVE: 'Đang hoạt động',
    EXPIRED: 'Hết hạn',
    CANCELLED: 'Đã hủy',
    SUSPENDED: 'Tạm ngưng',
    PAST_DUE: 'Quá hạn',
    PENDING: 'Chờ xử lý',
  };

  // Color mapping for statuses
  const statusColors: Record<string, string> = {
    ACTIVE: '#10b981', // Green
    EXPIRED: '#ef4444', // Red
    CANCELLED: '#6b7280', // Gray
    SUSPENDED: '#f59e0b', // Amber
    PAST_DUE: '#f97316', // Orange
    PENDING: '#3b82f6', // Blue
  };

  const pieData = chartData.statuses.map((status, idx) => ({
    name: statusLabels[status] || status,
    value: chartData.counts[idx] || 0,
    itemStyle: { color: statusColors[status] || '#ff6422' },
  }));

  const hasData =
    chartData.counts && chartData.counts.length > 0 && chartData.counts.some(val => val > 0);

  const textColor = isDark ? '#d4d7dd' : '#555555';

  const option: EChartsOption = {
    textStyle: {
      color: textColor,
      fontFamily: "Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    tooltip: {
      trigger: 'item',
      valueFormatter: (val) => typeof val === 'number' ? `${val}` : String(val),
      formatter: (params: any) => {
        const v = params.value ?? 0;
        const p = params.percent ?? 0;
        return `${params.marker} ${params.name}: ${v} (${p}%)`;
      },
    },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: textColor },
    },
    series: [
      {
        name: 'Đăng ký',
        type: 'pie',
        radius: ['60%', '75%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: 'transparent', borderWidth: 0 },
        label: { show: false },
        labelLine: { show: false },
        data: pieData,
      },
    ],
  };

  return (
    <AdminChart
      title='Đăng ký theo Trạng thái'
      description='Phân bố đăng ký theo các trạng thái'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu đăng ký'
    >
      {hasData && (() => { registerGymEChartsTheme(); return (
        <ReactECharts option={option} theme={gymEChartsThemeName} style={{ width: '100%', height }} />
      );})()}
    </AdminChart>
  );
};

export default SubscriptionsByStatusChart;
