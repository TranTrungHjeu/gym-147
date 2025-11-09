import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  countdown?: number; // Thời gian countdown (giây)
  buttonLabel?: string; // Optional button label
  onButtonClick?: () => void; // Optional button click handler
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
  countdown,
  buttonLabel,
  onButtonClick,
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
    // Style 1: Dark background with colored accent based on type
    switch (type) {
      case 'error':
        return {
          bg: 'bg-[#2d3438]',
          iconBg: 'bg-[#F04349]/20',
          iconColor: 'text-[#F04349]',
          icon: (
            <div className='w-8 h-8 bg-[#F04349]/20 rounded-full flex items-center justify-center flex-shrink-0 relative'>
              <svg
                className='w-6 h-6 text-[#F04349] absolute inset-0 m-auto'
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
          bg: 'bg-[#2d3438]',
          iconBg: 'bg-[#01E17B]/20',
          iconColor: 'text-[#01E17B]',
          icon: (
            <div className='w-8 h-8 bg-[#01E17B]/20 rounded-full flex items-center justify-center flex-shrink-0 relative'>
              <svg
                className='w-6 h-6 text-[#01E17B] absolute inset-0 m-auto'
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
          bg: 'bg-[#2d3438]',
          iconBg: 'bg-[#FDCD0F]/20',
          iconColor: 'text-[#FDCD0F]',
          icon: (
            <div className='w-8 h-8 bg-[#FDCD0F]/20 rounded-full flex items-center justify-center flex-shrink-0 relative'>
              <svg
                className='w-6 h-6 text-[#FDCD0F] absolute inset-0 m-auto'
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
          bg: 'bg-[#2d3438]',
          iconBg: 'bg-[#4B85F5]/20',
          iconColor: 'text-[#4B85F5]',
          icon: (
            <div className='w-8 h-8 bg-[#4B85F5]/20 rounded-full flex items-center justify-center flex-shrink-0 relative'>
              <svg
                className='w-6 h-6 text-[#4B85F5] absolute inset-0 m-auto'
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
          bg: 'bg-[#2d3438]',
          iconBg: 'bg-white/10',
          iconColor: 'text-white',
          icon: (
            <div className='w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 relative'>
              <svg
                className='w-6 h-6 text-white absolute inset-0 m-auto'
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
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`
        ${styles.bg}
        rounded-2xl shadow-[0px_16px_20px_-8px_rgba(3,5,18,0.1)]
        px-4 py-3 min-w-[320px] max-w-[420px]
        transform transition-all duration-300 ease-out
        ${isAnimating ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        flex items-center gap-3
        font-sans
      `}
      style={{ fontFamily: 'var(--font-family-body, Inter, system-ui, sans-serif)' }}
    >
        {/* Icon - Style 1: Pill-shaped container with colored accent */}
        <div className='flex-shrink-0'>{styles.icon}</div>

        {/* Message */}
        <div className='flex-1 min-w-0'>
          <p className='text-white font-medium text-base leading-[22px] font-sans'>
            {message}
            {countdown && countdownTime > 0 && (
              <span className='ml-2 text-white/70 font-semibold'>({countdownTime}s)</span>
            )}
          </p>
        </div>

        {/* Optional Button */}
        {buttonLabel && onButtonClick && (
          <button
            onClick={onButtonClick}
            className='flex-shrink-0 px-2 py-1 text-white font-semibold text-sm leading-[22px] hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95 whitespace-nowrap font-sans'
          >
            {buttonLabel}
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={() => {
            setIsAnimating(false);
            setTimeout(onClose, 300);
          }}
          className='flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95'
          aria-label='Close notification'
        >
          <svg
            className='w-6 h-6 text-white/70 hover:text-white transition-colors duration-200'
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
  );
}
