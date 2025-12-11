import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import AdminChart from './AdminChart';
import { useTheme } from '../../context/ThemeContext';
import { getEChartsTheme } from '../../theme/echartsTheme';

interface NetRevenueChartProps {
  data?: Array<{
    month: string;
    year: number;
    revenue: number;
    salaries: number;
    refunds: number;
    net: number;
  }>;
  loading?: boolean;
  height?: number;
}

const NetRevenueChart: React.FC<NetRevenueChartProps> = ({
  data = [],
  loading = false,
  height = 350,
}) => {
  const { theme } = useTheme();

  // Prepare chart data
  const months = data.map(item => `${item.month} ${item.year}`);
  const revenues = data.map(item => item.revenue);
  const netRevenues = data.map(item => item.net);
  const expenses = data.map(item => item.salaries + item.refunds);

  const hasData = netRevenues.some(val => val !== 0) || revenues.some(val => val > 0);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (val) => typeof val === 'number'
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
        : String(val),
    },
    legend: {
      top: 10,
      right: 10,
      data: ['Doanh thu', 'Chi phí (Lương + Hoàn tiền)', 'Lợi nhuận'],
    },
    grid: {
      left: 50,
      right: 30,
      bottom: 50,
      top: 70,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: months,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (val: number) =>
          new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(
            val
          ),
      },
    },
    series: [
      {
        name: 'Doanh thu',
        type: 'bar',
        barMaxWidth: 28,
        data: revenues,
        emphasis: { focus: 'series' },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#10b981' }, // green-500
              { offset: 1, color: '#34d399' }, // green-400
            ],
          },
        },
      },
      {
        name: 'Chi phí (Lương + Hoàn tiền)',
        type: 'bar',
        barMaxWidth: 28,
        data: expenses,
        emphasis: { focus: 'series' },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#ef4444' }, // red-500
              { offset: 1, color: '#f87171' }, // red-400
            ],
          },
        },
      },
      {
        name: 'Lợi nhuận',
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#3b82f6', // blue-500
        },
        itemStyle: {
          color: '#3b82f6',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.35)' }, // blue-500 with opacity
              { offset: 1, color: 'rgba(59, 130, 246, 0.00)' },
            ],
          },
        },
        data: netRevenues,
        markLine: {
          data: [
            {
              yAxis: 0,
              lineStyle: {
                color: '#9ca3af', // gray-400
                type: 'dashed',
                width: 1,
              },
              label: {
                show: true,
                position: 'end',
                formatter: '0',
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <AdminChart
      title='Thống kê Lợi nhuận (Doanh thu sau chi phí)'
      description='Biểu đồ thể hiện doanh thu, chi phí và lợi nhuận theo tháng'
      height={height}
      loading={loading}
      empty={!hasData}
      emptyMessage='Chưa có dữ liệu lợi nhuận'
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

export default NetRevenueChart;



