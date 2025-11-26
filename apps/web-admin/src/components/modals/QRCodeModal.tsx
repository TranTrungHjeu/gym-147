import React, { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  planId?: string;
  onContinue?: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  userId,
  planId,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate QR code URL
  useEffect(() => {
    if (isOpen) {
      // Create deep link or app store link
      // Format: gym147://register?userId={userId}&planId={planId}
      // Or use app store links
      const appStoreLink = 'https://apps.apple.com/app/gym-147'; // Replace with actual App Store link
      const playStoreLink = 'https://play.google.com/store/apps/details?id=com.gym147'; // Replace with actual Play Store link
      
      // For now, use a QR code generation service
      // You can replace this with a proper QR code library like qrcode.react
      const qrData = userId && planId 
        ? `gym147://register?userId=${userId}&planId=${planId}`
        : userId
        ? `gym147://register?userId=${userId}`
        : appStoreLink;
      
      // Using QR Server API (free service)
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrCodeApiUrl);
    }
  }, [isOpen, userId, planId]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto'
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className='fixed inset-0 h-full w-full bg-black/50 backdrop-blur-sm'
        aria-hidden='true'
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className='relative z-[99999] w-full max-w-md mx-4 my-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden'
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='qr-modal-title'
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200'
        >
          <X className='w-5 h-5' />
        </button>

        {/* Modal Body */}
        <div className='p-8'>
          {/* Success Icon */}
          <div className='flex justify-center mb-6'>
            <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center'>
              <svg
                className='w-8 h-8 text-green-600 dark:text-green-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2
            id='qr-modal-title'
            className='text-2xl font-bold text-center text-gray-900 dark:text-white mb-2'
          >
            {t('homepage.registration.success')}
          </h2>

          <p className='text-center text-gray-600 dark:text-gray-400 mb-6'>
            {t('homepage.registration.qrTitle')}
          </p>

          {/* QR Code */}
          <div className='flex flex-col items-center mb-6'>
            <div className='bg-white p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg mb-4'>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt='QR Code'
                  className='w-64 h-64'
                  onError={(e) => {
                    // Fallback if QR code fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className='w-64 h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded'>
                  <div className='text-center text-gray-500 dark:text-gray-400'>
                    <Smartphone className='w-12 h-12 mx-auto mb-2' />
                    <p className='text-sm'>Loading QR Code...</p>
                  </div>
                </div>
              )}
            </div>

            <p className='text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs'>
              {t('homepage.registration.qrDescription')}
            </p>
          </div>

          {/* Instructions */}
          <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6'>
            <p className='text-sm text-gray-700 dark:text-gray-300 mb-2'>
              {t('homepage.registration.scanQR')}
            </p>
            <div className='flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
              <span>{t('homepage.registration.or')}</span>
            </div>
            <div className='flex flex-col gap-2 mt-3'>
              <a
                href='https://apps.apple.com/app/gym-147'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium'
              >
                <Download className='w-4 h-4' />
                App Store
              </a>
              <a
                href='https://play.google.com/store/apps/details?id=com.gym147'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium'
              >
                <Download className='w-4 h-4' />
                Google Play
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3'>
            {onContinue && (
              <button
                onClick={onContinue}
                className='flex-1 px-4 py-3 bg-[#f36100] text-white rounded-lg font-semibold hover:bg-[#e55a00] transition-colors'
              >
                {t('homepage.registration.continue')}
              </button>
            )}
            <button
              onClick={onClose}
              className='flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;

