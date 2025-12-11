import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';
import { clearAuthData, getCurrentUser, getDashboardPath } from '../utils/auth';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGoBack = () => {
    const user = getCurrentUser();
    if (user) {
      const dashboardPath = getDashboardPath(user.role);
      navigate(dashboardPath);
    } else {
      navigate('/auth');
    }
  };

  const handleLogout = () => {
    clearAuthData();
    navigate('/auth');
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
      <div className='max-w-md w-full mx-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center'>
          {/* Icon */}
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6'>
            <svg
              className='w-8 h-8 text-red-600 dark:text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-4'>
            {t('unauthorized.title')}
          </h1>

          {/* Message */}
          <p className='text-gray-600 dark:text-gray-400 mb-8'>{t('unauthorized.message')}</p>

          {/* Actions */}
          <div className='space-y-3'>
            <button
              onClick={handleGoBack}
              className='w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200'
            >
              {t('unauthorized.backToDashboard')}
            </button>

            <button
              onClick={handleLogout}
              className='w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200'
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
