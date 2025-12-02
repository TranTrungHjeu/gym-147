import React, { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import logo from '../../assets/images/logo.png';

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
      const qrData =
        userId && planId
          ? `gym147://register?userId=${userId}&planId=${planId}`
          : userId
          ? `gym147://register?userId=${userId}`
          : appStoreLink;

      // Using QR Server API (free service) - smaller size
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        qrData
      )}`;
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
        className='relative z-[99999] w-full max-w-sm mx-4 my-8 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden'
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='qr-modal-title'
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className='absolute top-3 right-3 z-50 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200'
        >
          <X className='w-4 h-4' />
        </button>

        {/* Modal Body */}
        <div className='p-5'>
          {/* Title */}
          <h2
            id='qr-modal-title'
            className='text-xl font-bold text-center text-gray-900 dark:text-white mb-1'
          >
            {t('homepage.registration.success')}
          </h2>

          <p className='text-center text-sm text-gray-600 dark:text-gray-400 mb-4'>
            {t('homepage.registration.qrTitle')}
          </p>

          {/* Logo */}
          <div className='flex justify-center mb-3'>
            <img src={logo} alt='GYM 147 Logo' className='h-10 w-auto object-contain' />
          </div>

          {/* QR Code */}
          <div className='flex flex-col items-center mb-4'>
            <div className='bg-white p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md mb-3'>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt='QR Code'
                  className='w-48 h-48'
                  onError={e => {
                    // Fallback if QR code fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className='w-48 h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded'>
                  <div className='text-center text-gray-500 dark:text-gray-400'>
                    <Smartphone className='w-10 h-10 mx-auto mb-2' />
                    <p className='text-xs'>Loading QR Code...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4'>
            <div className='flex items-center justify-center gap-3'>
              <a
                href='https://apps.apple.com/app/gym-147'
                target='_blank'
                rel='noopener noreferrer'
                className='w-10 h-10 flex items-center justify-center bg-black text-white rounded-lg hover:bg-gray-800 transition-colors'
                title='App Store'
              >
                <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 2.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z' />
                </svg>
              </a>
              <a
                href='https://play.google.com/store/apps/details?id=com.gym147'
                target='_blank'
                rel='noopener noreferrer'
                className='w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
                title='Google Play'
              >
                <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z' />
                </svg>
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-2'>
            {onContinue && (
              <button
                onClick={onContinue}
                className='flex-1 px-3 py-2 bg-[#f36100] text-white rounded-lg font-semibold hover:bg-[#e55a00] transition-colors text-sm'
              >
                {t('homepage.registration.continue')}
              </button>
            )}
            <button
              onClick={onClose}
              className='flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm'
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
