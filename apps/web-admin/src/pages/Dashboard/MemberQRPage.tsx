import React, { useEffect, useState } from 'react';
import { LogOut, QrCode, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import logo from '../../assets/images/logo.png';
import gymBackground from '../../assets/images/banner-bg.jpg';
import { authService } from '../../services/auth.service';

const MemberQRPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate QR code URL
  useEffect(() => {
    const qrData =
      'https://github.com/TranTrungHjeu/gym-147/releases/download/v1.0.0/gym147-mobile.apk';

    // Using QR Server API (free service) - smaller size
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      qrData
    )}`;
    setQrCodeUrl(qrCodeApiUrl);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userData');
      localStorage.removeItem('isLoggedIn');
      navigate('/auth');
    }
  };

  return (
    <div
      className='relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat'
      style={{ backgroundImage: `url(${gymBackground})` }}
    >
      <div className='absolute inset-0 z-0 bg-black/55 backdrop-blur-[1px]' />

      <div className='relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-white/95 dark:bg-neutral-900/95 shadow-surface transition-transform duration-300 hover:-translate-y-0.5'>
        <div className='bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-5 py-4 text-white border-b border-white/10'>
          <div className='flex items-center justify-center mb-3'>
            <img src={logo} alt='GYM 147 Logo' className='h-9 w-auto object-contain drop-shadow-sm' />
          </div>
          <h2 className='text-center text-xl font-heading font-bold tracking-tight leading-tight text-white'>
            {t('homepage.registration.success')}
          </h2>
          <p className='text-center text-sm text-white/85 font-inter mt-1.5 leading-relaxed'>
            {t('homepage.registration.qrTitle')}
          </p>
        </div>

        <div className='p-4'>
          <div className='rounded-xl border border-primary-100 dark:border-neutral-700 bg-primary-50/60 dark:bg-neutral-800/70 p-3'>
            <div className='bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-primary-200 dark:border-neutral-700 shadow-brand flex items-center justify-center transition-all duration-300 hover:shadow-brand-soft'>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt='QR Code'
                  className='w-44 h-44 transition-transform duration-300 hover:scale-[1.02]'
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className='w-44 h-44 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400'>
                  <QrCode className='w-8 h-8 text-primary-500' />
                  <p className='text-sm font-inter'>Đang tải QR...</p>
                </div>
              )}
            </div>

            <div className='grid grid-cols-1 gap-2 mt-4 text-sm font-inter text-gray-700 dark:text-gray-300 leading-relaxed'>
              <div className='flex items-center gap-2'>
                <Smartphone className='w-4 h-4 text-primary-500' />
                <span>Mở ứng dụng GYM 147 trên điện thoại</span>
              </div>
              <div className='flex items-center gap-2'>
                <QrCode className='w-4 h-4 text-primary-500' />
                <span>Quét mã để liên kết và đăng ký nhanh</span>
              </div>
            </div>
          </div>

          <div className='mt-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2.5'>
            <div className='flex items-center justify-center gap-3'>
              <a
                href='https://apps.apple.com/app/gym-147'
                target='_blank'
                rel='noopener noreferrer'
                className='w-10 h-10 flex items-center justify-center bg-black text-white rounded-lg hover:bg-neutral-800 transition-all duration-200 hover:scale-105'
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
                className='w-10 h-10 flex items-center justify-center bg-success-600 text-white rounded-lg hover:bg-success-700 transition-all duration-200 hover:scale-105'
                title='Google Play'
              >
                <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z' />
                </svg>
              </a>
              <button
                type='button'
                onClick={handleLogout}
                className='w-10 h-10 flex items-center justify-center bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-all duration-200 hover:scale-105'
                title='Log out'
              >
                <LogOut className='w-5 h-5' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberQRPage;
