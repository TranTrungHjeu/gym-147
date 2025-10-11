import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  countdown?: number; // Thời gian countdown (giây)
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
  countdown,
}: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [countdownTime, setCountdownTime] = useState(countdown || 0);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      // Nếu có countdown, sử dụng countdown thay vì duration
      const actualDuration = countdown ? countdown * 1000 : duration;

      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, actualDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, countdown, onClose]);

  // Countdown effect
  useEffect(() => {
    if (countdown && countdown > 0) {
      setCountdownTime(countdown);

      const countdownInterval = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [countdown]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-gradient-to-br from-red-600/95 to-red-700/95',
          border: 'border-red-400/30',
          icon: (
            <div className='w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center'>
              <svg
                className='w-5 h-5 text-red-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
          ),
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-green-600/95 to-green-700/95',
          border: 'border-green-400/30',
          icon: (
            <div className='w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center'>
              <svg
                className='w-5 h-5 text-green-300'
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
          ),
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-orange-500/95 to-orange-600/95',
          border: 'border-orange-400/30',
          icon: (
            <div className='w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center'>
              <svg
                className='w-5 h-5 text-orange-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z'
                />
              </svg>
            </div>
          ),
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-br from-gray-800/95 to-gray-900/95',
          border: 'border-white/20',
          icon: (
            <div className='w-8 h-8 bg-white/10 rounded-full flex items-center justify-center'>
              <svg
                className='w-5 h-5 text-white/80'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
          ),
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-800/95 to-gray-900/95',
          border: 'border-white/20',
          icon: null,
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center pointer-events-none'>
      <div
        className={`
          ${styles.bg} ${styles.border}
          backdrop-blur-xl border rounded-2xl shadow-2xl
          px-6 py-5 min-w-[360px] max-w-[500px] mx-4
          transform transition-all duration-300 ease-out
          ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
          flex items-center space-x-4 pointer-events-auto
          font-space-grotesk
        `}
      >
        {/* Icon */}
        <div className='flex-shrink-0'>{styles.icon}</div>

        {/* Message */}
        <div className='flex-1'>
          <p className='text-white font-medium text-sm leading-relaxed'>
            {message}
            {countdown && countdownTime > 0 && (
              <span className='ml-2 text-orange-300 font-bold'>({countdownTime}s)</span>
            )}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            setIsAnimating(false);
            setTimeout(onClose, 300);
          }}
          className='flex-shrink-0 p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110'
        >
          <svg
            className='w-4 h-4 text-white/60 hover:text-white transition-colors duration-200'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
