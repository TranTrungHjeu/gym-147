import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { registerGymEChartsTheme, gymEChartsThemeName } from '../../theme/echartsTheme';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';

interface PaymentMethodsChartProps {
  data?: {
    methods: string[];
    amounts: number[];
    counts?: number[];
  };
  loading?: boolean;
  height?: number;
}

const PaymentMethodsChart: React.FC<PaymentMethodsChartProps> = ({
  data,
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultData = {
    methods: [],
    amounts: [],
    counts: [],
  };

  const chartData = data || defaultData;

  // Map method to Vietnamese labels
  const methodLabels: Record<string, string> = {
    VNPAY: 'VNPay',
    MOMO: 'MoMo',
    ZALO_PAY: 'ZaloPay',
    BANK_TRANSFER: 'Chuyển khoản',
    CASH: 'Tiền mặt',
    CREDIT_CARD: 'Thẻ tín dụng',
    DEBIT_CARD: 'Thẻ ghi nợ',
  };

  const labels = chartData.methods.map(method => methodLabels[method] || method);

  const hasData = chartData.amounts && chartData.amounts.length > 0 && chartData.amounts.some(val => val > 0);

  const textColor = isDark ? '#d4d7dd' : '#555555';
  const gridColor = isDark ? '#343434' : '#e7e7e7';

  const option: EChartsOption = {
    textStyle: {
      color: textColor,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (val) => typeof val === 'number' ? new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(val) : String(val),
    },
    grid: { left: 140, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: textColor,
        formatter: (val: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(val),
      },
      splitLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor },
    },
    series: [
      {
        name: 'Doanh thu',
        type: 'bar',
        data: chartData.amounts,
        itemStyle: { color: '#ff6422' },
        emphasis: { focus: 'series' },
        barWidth: '45%',
      },
    ],
  };

  return (
    <AdminChart
      title='Thanh toán theo Phương thức'
      description='Doanh thu theo các phương thức thanh toán'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu thanh toán'
    >
      {hasData && (() => { registerGymEChartsTheme(); return (
        <ReactECharts option={option} theme={gymEChartsThemeName} style={{ width: '100%', height }} />
      );})()}
    </AdminChart>
  );
};

export default PaymentMethodsChart;


