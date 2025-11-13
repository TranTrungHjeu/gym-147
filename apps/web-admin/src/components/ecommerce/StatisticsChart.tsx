import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import ChartTab from '../common/ChartTab';
import { useTheme } from '../../context/ThemeContext';
import { registerGymEChartsTheme, gymEChartsThemeName } from '../../theme/echartsTheme';

export default function StatisticsChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const categories = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const textColor = isDark ? '#d4d7dd' : '#555555';
  const gridColor = isDark ? '#343434' : '#e7e7e7';

  const option: EChartsOption = {
    textStyle: {
      color: textColor,
      fontFamily: "Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { top: 10, right: 10, textStyle: { color: textColor } },
    grid: { left: 40, right: 20, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: gridColor } },
      axisTick: { show: false },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridColor } },
    },
    series: [
      {
        name: 'Membership Growth',
        type: 'line', smooth: true, showSymbol: false,
        lineStyle: { width: 2, color: '#ff6422' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: 'rgba(255, 100, 34, 0.28)' },
          { offset: 1, color: 'rgba(255, 100, 34, 0.00)' },
        ] } },
        data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
      },
      {
        name: 'Class Attendance',
        type: 'line', smooth: true, showSymbol: false,
        lineStyle: { width: 2, color: '#fb923c' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: 'rgba(251, 146, 60, 0.22)' },
          { offset: 1, color: 'rgba(251, 146, 60, 0.00)' },
        ] } },
        data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
      },
    ],
  };
  return (
    <div className='rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6'>
      <div className='flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between'>
        <div className='w-full'>
          <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90 font-space-grotesk'>
            Gym Performance
          </h3>
          <p className='mt-1 text-gray-500 text-theme-sm dark:text-gray-400 font-inter'>
            Membership growth and class attendance trends
          </p>
        </div>
        <div className='flex items-start w-full gap-3 sm:justify-end'>
          <ChartTab />
        </div>
      </div>

      <div className='w-full'>
        {(() => { registerGymEChartsTheme(); return (
          <ReactECharts option={option} theme={gymEChartsThemeName} style={{ width: '100%', height: 310 }} />
        );})()}
      </div>
    </div>
  );
}
