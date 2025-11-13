import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getEChartsTheme } from '../../theme/echartsTheme';
import AdminChart from './AdminChart';

interface EquipmentUsageChartProps {
  data?: {
    status: string;
    count: number;
  }[];
  loading?: boolean;
  height?: number;
  theme?: 'light' | 'dark';
}

const EquipmentUsageChart: React.FC<EquipmentUsageChartProps> = ({
  data,
  loading = false,
  height = 350,
  theme = 'light',
}) => {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === 'dark' || theme === 'dark';

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

  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  const hasData = total > 0;

  // Prepare pie chart data
  const pieData = chartData
    .filter(item => item.count > 0)
    .map(item => ({
      value: item.count,
      name: statusLabels[item.status] || item.status,
      itemStyle: {
        color: statusColors[item.status] || '#ff6422',
      },
    }));

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: 'rgba(55, 65, 81, 0.8)',
      textStyle: {
        color: '#f3f4f6',
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      itemGap: 15,
      textStyle: {
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 12,
      },
    },
    series: [
      {
        name: 'Trạng thái Thiết bị',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark ? '#1f2937' : '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 600,
            fontFamily:
              "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        labelLine: {
          show: false,
        },
        data: pieData,
      },
    ],
  };

  return (
    <AdminChart
      title='Phân bổ Trạng thái Thiết bị'
      description='Biểu đồ thể hiện tỷ lệ thiết bị theo từng trạng thái'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu thiết bị'
    >
      {hasData && (
        <ReactECharts
          option={option}
          theme={getEChartsTheme(appTheme)}
          style={{ width: '100%', height }}
        />
      )}
    </AdminChart>
  );
};

export default EquipmentUsageChart;
