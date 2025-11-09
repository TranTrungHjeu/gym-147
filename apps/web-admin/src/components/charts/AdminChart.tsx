import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface AdminChartProps {
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  children?: React.ReactNode;
  className?: string;
}

const AdminChart: React.FC<AdminChartProps> = ({
  title,
  description,
  height = 350,
  loading = false,
  empty = false,
  emptyMessage = 'Không có dữ liệu',
  children,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-theme-md p-6 ${className}`}>
        {title && (
          <div className='mb-4'>
            <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              {title}
            </h3>
            {description && (
              <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
                {description}
              </p>
            )}
          </div>
        )}
        <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
          Đang tải...
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-theme-md p-6 ${className}`}>
        {title && (
          <div className='mb-4'>
            <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              {title}
            </h3>
            {description && (
              <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
                {description}
              </p>
            )}
          </div>
        )}
        <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-theme-md p-6 ${className}`}>
      {title && (
        <div className='mb-4'>
          <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
            {title}
          </h3>
          {description && (
            <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default AdminChart;

