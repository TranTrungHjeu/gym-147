import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import AdminChart from './AdminChart';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface RedemptionStatusChartProps {
  data?: {
    active: number;
    used: number;
    expired: number;
    refunded: number;
  };
  loading?: boolean;
  height?: number;
}

const RedemptionStatusChart: React.FC<RedemptionStatusChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    active: 0,
    used: 0,
    expired: 0,
    refunded: 0,
  };

  const chartData = data || defaultData;
  const total = chartData.active + chartData.used + chartData.expired + chartData.refunded;
  const hasData = total > 0;

  const textColor = isDark ? '#d4d7dd' : '#555555';

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      textStyle: {
        color: isDark ? '#f3f4f6' : '#111827',
        fontFamily: "'Space Grotesk', Inter, sans-serif",
      },
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: {
        color: textColor,
        fontFamily: "'Space Grotesk', Inter, sans-serif",
        fontSize: 12,
        fontWeight: 500,
      },
      itemGap: 16,
    },
    series: [
      {
        name: 'Trạng thái',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          color: textColor,
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontSize: 11,
          fontWeight: 500,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 600,
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        labelLine: {
          show: true,
          lineStyle: {
            color: textColor,
          },
        },
        data: [
          {
            value: chartData.active,
            name: 'Đang hiệu lực',
            itemStyle: { color: '#10b981' }, // emerald-500
          },
          {
            value: chartData.used,
            name: 'Đã sử dụng',
            itemStyle: { color: '#3b82f6' }, // blue-500
          },
          {
            value: chartData.expired,
            name: 'Hết hạn',
            itemStyle: { color: '#ef4444' }, // red-500
          },
          {
            value: chartData.refunded,
            name: 'Hoàn trả',
            itemStyle: { color: '#f59e0b' }, // amber-500
          },
        ],
      },
    ],
  };

  return (
    <AdminChart
      title='Phân bố Trạng thái Đổi thưởng'
      description='Biểu đồ thể hiện tỷ lệ các trạng thái đổi thưởng'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu trạng thái'
    >
      {hasData && (
        <ReactECharts
          option={option}
          theme={getEChartsTheme(theme)}
          style={{ width: '100%', height }}
        />
      )}
    </AdminChart>
  );
};

export default RedemptionStatusChart;




















