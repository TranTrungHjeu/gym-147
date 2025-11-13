import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../context/ThemeContext';
import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';
import { getEChartsTheme } from '../../theme/echartsTheme';

export default function MonthlySalesChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const categories = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const seriesData = [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112];
  
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (val) =>
        typeof val === 'number'
          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
          : String(val),
    },
    grid: {
      left: 50,
      right: 30,
      bottom: 30,
      top: 20,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
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
        name: 'Membership Revenue',
        type: 'bar',
        barMaxWidth: 28,
        data: seriesData,
        emphasis: { focus: 'series' },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#ff6422' },
              { offset: 1, color: '#fb923c' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  return (
    <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90 font-space-grotesk'>
          Monthly Revenue
        </h3>
        <div className='relative inline-block'>
          <button className='dropdown-toggle' onClick={toggleDropdown}>
            <MoreHorizontal className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6' />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className='w-40 p-2'>
            <DropdownItem
              onItemClick={closeDropdown}
              className='flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 font-inter'
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className='flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 font-inter'
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className='w-full'>
        <div style={{ width: '100%', height: 180 }}>
          <ReactECharts
            option={option}
            theme={getEChartsTheme(theme)}
            style={{ width: '100%', height: 180 }}
          />
        </div>
      </div>
    </div>
  );
}
