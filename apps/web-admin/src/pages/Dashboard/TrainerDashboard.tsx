import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { clearAuthData } from '../../utils/auth';

const TrainerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/legacy-dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Force logout even if API fails
      clearAuthData();
      navigate('/auth');
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-12 relative'>
          <button
            onClick={handleLogout}
            className='absolute top-0 right-0 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200'
          >
            Đăng xuất
          </button>
          <h1 className='text-4xl font-bold text-white mb-4'>
            <span className='bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent'>
              TRAINER DASHBOARD
            </span>
          </h1>
          <p className='text-gray-300 text-lg'>Quản lý học viên và lịch tập</p>
        </div>

        {/* Coming Soon Message */}
        <div className='max-w-2xl mx-auto'>
          <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center'>
            <div className='w-24 h-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-8'>
              <svg
                className='w-12 h-12 text-white'
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
            <h2 className='text-2xl font-bold text-white mb-4'>Đang phát triển</h2>
            <p className='text-gray-300 text-lg mb-6'>
              Dashboard cho Trainer đang được xây dựng. Sẽ sớm có các tính năng:
            </p>

            {/* Dashboard Button */}
            <div className='mb-8'>
              <button
                onClick={handleGoToDashboard}
                className='bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg'
              >
                Xem Dashboard Chính
              </button>
            </div>
            <ul className='text-gray-300 text-left space-y-2 max-w-md mx-auto'>
              <li className='flex items-center'>
                <svg
                  className='w-5 h-5 text-orange-400 mr-3'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Quản lý học viên
              </li>
              <li className='flex items-center'>
                <svg
                  className='w-5 h-5 text-orange-400 mr-3'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Lịch tập và đặt lịch
              </li>
              <li className='flex items-center'>
                <svg
                  className='w-5 h-5 text-orange-400 mr-3'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Theo dõi tiến độ học viên
              </li>
              <li className='flex items-center'>
                <svg
                  className='w-5 h-5 text-orange-400 mr-3'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Báo cáo và thống kê
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
