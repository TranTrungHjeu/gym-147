import React from 'react';
import useTranslation from '../../hooks/useTranslation';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
  };
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, title, user }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
        {/* Header */}
        <div className='text-center mb-6'>
          <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-8 h-8 text-green-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
          <h3 className='text-xl font-semibold text-gray-900 mb-2'>{title}</h3>
          <p className='text-gray-600'>{t('successModal.accountActivated')}</p>
        </div>

        {/* User Info */}
        <div className='bg-gray-50 rounded-lg p-4 mb-6'>
          <div className='space-y-3'>
            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-gray-400 mr-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
                />
              </svg>
              <div>
                <p className='text-sm text-gray-600'>{t('successModal.email')}</p>
                <p className='font-medium text-gray-900'>{user.email}</p>
              </div>
            </div>

            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-gray-400 mr-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                />
              </svg>
              <div>
                <p className='text-sm text-gray-600'>{t('successModal.fullName')}</p>
                <p className='font-medium text-gray-900'>
                  {user.firstName} {user.lastName}
                </p>
              </div>
            </div>

            {user.phone && (
              <div className='flex items-center'>
                <svg
                  className='w-5 h-5 text-gray-400 mr-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                  />
                </svg>
                <div>
                  <p className='text-sm text-gray-600'>{t('successModal.phone')}</p>
                  <p className='font-medium text-gray-900'>{user.phone}</p>
                </div>
              </div>
            )}

            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-gray-400 mr-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <div>
                <p className='text-sm text-gray-600'>{t('successModal.status')}</p>
                <p className='font-medium text-green-600'>{t('successModal.activated')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end'>
          <button
            onClick={onClose}
            className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200'
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
