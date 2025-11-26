import React from 'react';

const RealDashboard: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Dashboard</h1>
          <p className='text-gray-600 dark:text-gray-400'>Tổng quan hệ thống Gym 147</p>
        </div>

        {/* Stats Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center'>
              <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-blue-600 dark:text-blue-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                  />
                </svg>
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Tổng thành viên</p>
                <p className='text-2xl font-semibold text-gray-900 dark:text-white'>1,234</p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center'>
              <div className='w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-green-600 dark:text-green-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Doanh thu hôm nay</p>
                <p className='text-2xl font-semibold text-gray-900 dark:text-white'>12.5M</p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center'>
              <div className='w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-orange-600 dark:text-orange-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Lịch tập hôm nay</p>
                <p className='text-2xl font-semibold text-gray-900 dark:text-white'>45</p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center'>
              <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-purple-600 dark:text-purple-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Thiết bị hoạt động</p>
                <p className='text-2xl font-semibold text-gray-900 dark:text-white'>98%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Biểu đồ doanh thu</h3>
            <div className='h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center'>
              <p className='text-gray-500 dark:text-gray-400'>Chart placeholder</p>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Hoạt động gần đây</h3>
            <div className='space-y-3'>
              <div className='flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>Nguyễn Văn A đăng ký gói tập</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>2 phút trước</p>
                </div>
                <span className='text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full'>
                  Thành công
                </span>
              </div>
              <div className='flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>Trần Thị B thanh toán</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>15 phút trước</p>
                </div>
                <span className='text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full'>
                  Thành công
                </span>
              </div>
              <div className='flex items-center justify-between py-2'>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>Lê Văn C đặt lịch tập</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>1 giờ trước</p>
                </div>
                <span className='text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full'>
                  Đang chờ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealDashboard;
